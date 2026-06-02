// src/contexts/CartContext.tsx
//
// Cart state for marketplace listings (NOT auctions — those go through the
// place-bid flow). Hybrid storage:
//   - localStorage: optimistic, instant UI even on first paint.
//   - cart_items table (via cartAPI): cross-device sync once signed in.
//     Server hydration wins on conflict.
//
// `drawerOpen` state lives here too because the cart drawer is conceptually
// just another view of cart state. Lets the top-nav cart icon flip a single
// flag.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cartAPI, type ServerCartItem } from '../api/cart';
import { supabase } from '../api/supabase/supabaseClient';

export type CartItem = ServerCartItem;

interface SellerGroup {
  seller_id: string;
  seller_username: string;
  items: CartItem[];
  subtotal: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  totalShipping: number;
  grandTotal: number;
  groupedBySeller: SellerGroup[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (listingId: string) => Promise<void>;
  removeItem: (listingId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'inkstash_cart_v2';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as CartItem[];
    } catch {
      return [];
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastSyncedUserId = useRef<string | null>(null);

  // Persist to localStorage on every change. This is the optimistic UI store;
  // the server is the source of truth when signed in.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      // Quota-exceeded etc — drop silently. The server cart is authoritative.
      console.warn('[CartContext] localStorage write failed', err);
    }
  }, [items]);

  // Hydrate from server on sign-in. Server wins on conflict — if the buyer
  // signed in on a different device and added items there, those show up.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Signed out — keep localStorage cart (for guests who later sign in)
        // but mark that we have no server cart.
        lastSyncedUserId.current = null;
        return;
      }
      if (lastSyncedUserId.current === user.id) return;
      lastSyncedUserId.current = user.id;

      try {
        const serverItems = await cartAPI.getCart();
        if (cancelled) return;

        // Merge: anything in local that isn't on server, push up. Then
        // refetch authoritative state. Most users won't have anything to
        // merge — this is just the "signed in on new device with stuff
        // already in their browser" case.
        const serverIds = new Set(serverItems.map((i) => i.listing_id));
        const toUpload = items.filter((i) => !serverIds.has(i.listing_id));
        for (const local of toUpload) {
          try {
            await cartAPI.addItem(local.listing_id);
          } catch (err) {
            console.warn('[CartContext] merge push failed for', local.listing_id, err);
          }
        }

        const final = toUpload.length > 0 ? await cartAPI.getCart() : serverItems;
        if (!cancelled) setItems(final);
      } catch (err) {
        console.error('[CartContext] server hydrate failed', err);
      }
    };

    sync();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { sync(); });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // We intentionally do NOT include `items` in deps — this is the hydration
    // effect, not a sync effect. Local edits go up via addItem/removeItem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = useCallback(async (listingId: string) => {
    // Optimistic: insert a stub immediately so the UI feels instant.
    const stub: CartItem = {
      listing_id: listingId,
      title: 'Loading…',
      cover_url: null,
      price: 0,
      shipping_cost: 0,
      seller_id: '',
      seller_username: '',
      added_at: new Date().toISOString(),
    };
    setItems((prev) => prev.some((i) => i.listing_id === listingId) ? prev : [stub, ...prev]);

    try {
      const real = await cartAPI.addItem(listingId);
      if (real) {
        setItems((prev) => prev.map((i) => i.listing_id === listingId ? real : i));
      } else {
        // Server returned null (listing not active anymore) — roll back the stub.
        setItems((prev) => prev.filter((i) => i.listing_id !== listingId));
        throw new Error('That listing is no longer available.');
      }
    } catch (err) {
      setItems((prev) => prev.filter((i) => !(i.listing_id === listingId && i === stub)));
      throw err;
    }
  }, []);

  const removeItem = useCallback(async (listingId: string) => {
    const prev = items;
    setItems((s) => s.filter((i) => i.listing_id !== listingId));
    try {
      await cartAPI.removeItem(listingId);
    } catch (err) {
      // Rollback on failure.
      setItems(prev);
      throw err;
    }
  }, [items]);

  const clearCart = useCallback(async () => {
    const prev = items;
    setItems([]);
    try {
      await cartAPI.clear();
    } catch (err) {
      setItems(prev);
      throw err;
    }
  }, [items]);

  const isInCart = useCallback((listingId: string) => {
    return items.some((i) => i.listing_id === listingId);
  }, [items]);

  const { itemCount, totalPrice, totalShipping, grandTotal, groupedBySeller } = useMemo(() => {
    const itemCount = items.length;
    const totalPrice = items.reduce((acc, i) => acc + i.price, 0);
    const totalShipping = items.reduce((acc, i) => acc + i.shipping_cost, 0);
    const grandTotal = totalPrice + totalShipping;

    const groupsMap = new Map<string, SellerGroup>();
    for (const item of items) {
      const key = item.seller_id;
      const existing = groupsMap.get(key);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.price + item.shipping_cost;
      } else {
        groupsMap.set(key, {
          seller_id: item.seller_id,
          seller_username: item.seller_username,
          items: [item],
          subtotal: item.price + item.shipping_cost,
        });
      }
    }
    const groupedBySeller = Array.from(groupsMap.values());

    return { itemCount, totalPrice, totalShipping, grandTotal, groupedBySeller };
  }, [items]);

  const value: CartContextType = {
    items,
    itemCount,
    totalPrice,
    totalShipping,
    grandTotal,
    groupedBySeller,
    drawerOpen,
    setDrawerOpen,
    addItem,
    removeItem,
    clearCart,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
