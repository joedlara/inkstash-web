import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  auctionId: string;
  title: string;
  price: number;
  imageUrl: string;
  sellerId: string;
  type: 'buy_now' | 'bid_won';
  shippingCost: number;
  addedAt: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (auctionId: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
  isInCart: (auctionId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'inkstash_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Check if item already exists
      const existingItemIndex = prevItems.findIndex(
        (i) => i.auctionId === item.auctionId
      );

      if (existingItemIndex >= 0) {
        // Item exists, update it
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...item,
          addedAt: new Date().toISOString(),
        };
        return updatedItems;
      }

      // Add new item
      return [...prevItems, { ...item, addedAt: new Date().toISOString() }];
    });
  };

  const removeItem = (auctionId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.auctionId !== auctionId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemCount = () => {
    return items.length;
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price + item.shippingCost, 0);
  };

  const isInCart = (auctionId: string) => {
    return items.some((item) => item.auctionId === auctionId);
  };

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    clearCart,
    getItemCount,
    getTotalPrice,
    isInCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
