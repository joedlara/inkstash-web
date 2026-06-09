// src/components/livestreams/useHasSavedCard.ts
//
// Tells the bid widgets whether the current viewer has at least one
// saved card. Used to swap the SlideToBid for an "Add a card to bid"
// CTA — bidding without a card on file always 402s server-side, so
// surfacing the gate up front saves the viewer from a confusing
// modal-pop-after-drag flow.
//
// Hydrates from paymentMethodsAPI.listMine() (Supabase RLS scopes to
// the auth user) and refreshes on inkstash:wallet-card-ready so the
// CTA flips back to the live slider the instant a card lands.

import { useCallback, useEffect, useState } from 'react';
import { paymentMethodsAPI } from '../../api/paymentMethods';
import { useAuth } from '../../hooks/useAuth';

export function useHasSavedCard(): { hasCard: boolean | null; refresh: () => void } {
  const { user } = useAuth();
  const [hasCard, setHasCard] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setHasCard(false); return; }
    try {
      const list = await paymentMethodsAPI.listMine();
      setHasCard(list.length > 0);
    } catch {
      // Don't block bidding on a transient RLS error — treat as
      // "unknown" (null) so the slider still renders and place-bid
      // gates server-side as a backstop.
      setHasCard(null);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const onCardReady = () => refresh();
    window.addEventListener('inkstash:wallet-card-ready', onCardReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onCardReady);
  }, [refresh]);

  return { hasCard, refresh };
}
