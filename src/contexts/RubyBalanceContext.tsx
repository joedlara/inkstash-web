import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../api/supabase/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { rubiesAPI } from '../api/rubies';

interface RubyBalanceContextValue {
  balance: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const RubyBalanceContext = createContext<RubyBalanceContextValue | undefined>(undefined);

/**
 * Single source of truth for the user's Ruby balance. Mounted once in
 * AppLayout. Subscribes to realtime UPDATEs on the users row and exposes a
 * manual `refresh()` so callers can force a refetch after a known-good
 * mutation. Stores the last known balance in sessionStorage so route
 * navigations don't briefly flash 0 before the fetch resolves.
 */
export function RubyBalanceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const cacheKey = userId ? `inkstash:rubyBalance:${userId}` : null;

  const initialFromCache = (): number => {
    if (!cacheKey || typeof window === 'undefined') return 0;
    const cached = window.sessionStorage.getItem(cacheKey);
    if (!cached) return 0;
    const n = parseInt(cached, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const [balance, setBalance] = useState<number>(initialFromCache);
  const [loading, setLoading] = useState<boolean>(true);
  const balanceRef = useRef(balance);

  useEffect(() => {
    balanceRef.current = balance;
    if (cacheKey && typeof window !== 'undefined') {
      window.sessionStorage.setItem(cacheKey, String(balance));
    }
  }, [balance, cacheKey]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalance(0);
      setLoading(false);
      return;
    }
    const next = await rubiesAPI.getBalance(userId);
    setBalance(next);
    setLoading(false);
  }, [userId]);

  // When the user changes (login/logout), reset the cached display and refetch.
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setBalance(0);
      setLoading(false);
      return;
    }
    // Don't reset to 0 here — initialFromCache already gave us a likely-correct
    // value. Just kick a fresh fetch in the background.
    refresh();
  }, [isAuthenticated, userId, refresh]);

  // Realtime subscription. Many hosted Supabase projects deliver these with
  // some latency or not at all; the manual refresh() callers fire after every
  // mutation, so realtime is a bonus, not a requirement.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const channel = supabase
      .channel(`user_rubies:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload: { new?: { ruby_balance?: number } }) => {
          const next = payload.new?.ruby_balance;
          if (typeof next === 'number' && next !== balanceRef.current) {
            setBalance(next);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId]);

  return (
    <RubyBalanceContext.Provider value={{ balance, loading, refresh }}>
      {children}
    </RubyBalanceContext.Provider>
  );
}

export function useRubyBalanceContext(): RubyBalanceContextValue {
  const ctx = useContext(RubyBalanceContext);
  if (!ctx) {
    throw new Error('useRubyBalanceContext must be used within RubyBalanceProvider');
  }
  return ctx;
}
