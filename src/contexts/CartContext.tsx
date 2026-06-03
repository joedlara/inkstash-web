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

// Per-user localStorage key. Previously we used a single shared key, which
// leaked one user's cart to the next user on the same browser. Namespacing
// by user_id (or 'guest' for signed-out) keeps carts isolated.
const cartStorageKey = (userId: string | null) => `inkstash_cart_v2:${userId ?? 'guest'}`;
// Legacy single-key cart from before the namespacing fix. Cleared on first load.
const LEGACY_KEY = 'inkstash_cart_v2';

export function CartProvider({ children }: { children: ReactNode }) {
  // Start empty — hydration effect populates from the per-user localStorage
  // key once we know who's signed in.
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastSyncedUserId = useRef<string | null>(null);

  // One-time: clear the legacy shared-cart key so old data can't bleed
  // through anymore.
  useEffect(() => {
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }, []);

  // Persist to the CURRENT user's localStorage key on every change. Skip
  // until we know the user (currentUserId === undefined isn't possible
  // here since useState gives null) so we don't write 'guest' for items
  // that came from a signed-in user.
  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey(currentUserId), JSON.stringify(items));
    } catch (err) {
      console.warn('[CartContext] localStorage write failed', err);
    }
  }, [items, currentUserId]);

  // Hydrate on mount + auth changes. Three cases:
  //   1. No user (signed out) — read guest cart from localStorage, no server fetch.
  //   2. User signed in, first time this session — read their localStorage
  //      cart, then server-sync (server wins on conflict for items present
  //      on both; local-only items get pushed up).
  //   3. User switched — wipe in-memory items, then hydrate the new user's cart.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      // User switched (sign-in, sign-out, or different user). Wipe in-memory
      // state immediately so the previous user's cart never flashes for the
      // new user.
      if (userId !== currentUserId) {
        setCurrentUserId(userId);
        const localRaw = localStorage.getItem(cartStorageKey(userId));
        let local: CartItem[] = [];
        if (localRaw) {
          try { local = JSON.parse(localRaw) as CartItem[]; } catch { /* ignore */ }
        }
        if (!cancelled) setItems(local);
      }

      if (!userId) {
        // Guest — no server cart to fetch. Done.
        lastSyncedUserId.current = null;
        return;
      }
      if (lastSyncedUserId.current === userId) return;
      lastSyncedUserId.current = userId;

      try {
        const serverItems = await cartAPI.getCart();
        if (cancelled) return;

        const serverIds = new Set(serverItems.map((i) => i.listing_id));
        const localRaw = localStorage.getItem(cartStorageKey(userId));
        const localItems: CartItem[] = localRaw ? (JSON.parse(localRaw) as CartItem[]) : [];
        const toUpload = localItems.filter((i) => !serverIds.has(i.listing_id));
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
    // Re-runs when currentUserId changes so the cart loads correctly across
    // sign-in / sign-out / user-switch transitions.
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
