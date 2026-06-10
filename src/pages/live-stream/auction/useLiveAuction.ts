// useLiveAuction — drives the on-block lot: countdown, bot bids, resolve, charge.
// Ported 1:1 from docs/design-system/live_stream/auction.jsx. The bot loop +
// auto-advance ARE the demo loop the user uses to verify visual parity in
// Phase 2. Replaced wholesale in Phase 3b by the real livestreamsAPI + realtime
// row subscription.
//
// The returned shape is intentionally flat (Phase-3 contract): consumers read
// `currentItem` (the on-block lot blob) + derived fields like `status`,
// `currentPriceCents`, `currentWinnerId`, `bidCount`, `endsAt`. The mock
// `charge` UX (Stripe round-trip flash) is internal Phase-2 only; Phase 3b
// replaces it with the real charge-auction-win edge fn. `winnerBanner` is a
// presentation-shaped blob the WinnerBanner mounts on; auto-dismiss timing
// lives here, not in the banner component.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANTI_SNIPE_MS,
  AUCTION_QUEUE,
  BID_INCREMENT_CENTS,
  makeLiveAuctionAPI,
  pickBot,
  type AuctionItemState,
  type LiveAuctionAPI,
} from '../_mock/LiveAuctionAPI.mock';

type Args = {
  viewerId: string;
  hasCard: boolean;
  botSpeed: number;
};

export type AuctionStatus = 'idle' | 'bidding' | 'sold' | 'passed';

export type WinnerBannerInfo = {
  itemId: string;
  winnerUsername: string;
  finalPriceCents: number;
};

export type UseLiveAuction = {
  /** Full lot blob (Phase 3b becomes the real livestream_items row). */
  currentItem: AuctionItemState | null;
  status: AuctionStatus;
  currentPriceCents: number;
  currentWinnerId: string | null;
  bidCount: number;
  /** Soft-close deadline in ms epoch. Null while idle. */
  endsAt: number | null;
  /** $1 bump (mock throws on no card; surfaced to consumer via thrown Error.name). */
  placeBid: () => Promise<void>;
  placeCustomBid: (amountCents: number) => Promise<void>;
  /** Presentation blob for WinnerBanner; null while not showing. */
  winnerBanner: WinnerBannerInfo | null;
  dismissWinnerBanner: () => void;
};

export function useLiveAuction({ viewerId, hasCard, botSpeed }: Args): UseLiveAuction {
  const [item, setItem] = useState<AuctionItemState | null>(null);
  const [winnerBanner, setWinnerBanner] = useState<WinnerBannerInfo | null>(null);
  const [tickN, setTickN] = useState(0); // re-render for the countdown

  const itemRef = useRef<AuctionItemState | null>(null);
  itemRef.current = item;
  const hasCardRef = useRef<boolean>(hasCard);
  hasCardRef.current = hasCard;
  const idxRef = useRef(0);
  const apiRef = useRef<LiveAuctionAPI | null>(null);
  if (!apiRef.current) {
    apiRef.current = makeLiveAuctionAPI(() => itemRef.current, setItem, hasCardRef);
  }
  const api = apiRef.current;

  // Start the first lot on mount.
  useEffect(() => {
    api.startBidding(AUCTION_QUEUE[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown ticker (re-render only; the soft-close timestamp is source of truth).
  useEffect(() => {
    const id = setInterval(() => setTickN((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Resolve once when the soft-close timer runs out (resolve_livestream_bid +
  // charge-auction-win). Runs on each tick but no-ops once status !== 'bidding'.
  useEffect(() => {
    const it = itemRef.current;
    if (!it || it.status !== 'bidding') return;
    if (it.biddingEndsAt - Date.now() > 0) return;
    const status = api.resolveBidding();
    if (status === 'sold') {
      setWinnerBanner({
        itemId: it.title, // Phase 2: no real ids — title is stable across the lot lifecycle
        winnerUsername: it.currentWinner ?? '',
        finalPriceCents: it.priceCents,
      });
      // Mock Stripe round-trip — Phase 3b replaces with real charge-auction-win.
      // Result is intentionally not surfaced to consumers in the new contract.
      if (it.currentWinner === viewerId) {
        void api.chargeWin(it.priceCents);
      }
    }
  }, [tickN, viewerId, api]);

  // After a lot resolves, hold the winner moment, then advance to the next lot
  // (mirrors prototype's 4.6s pause before the next start-bidding).
  useEffect(() => {
    if (!item || (item.status !== 'sold' && item.status !== 'passed')) return;
    const t = setTimeout(() => {
      setWinnerBanner(null);
      idxRef.current = (idxRef.current + 1) % AUCTION_QUEUE.length;
      api.startBidding(AUCTION_QUEUE[idxRef.current]);
    }, 4600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item && item.status]);

  // Bot bidders chase each lot up to its ceiling, resetting the clock (anti-snipe).
  useEffect(() => {
    const it = item;
    if (!it || it.status !== 'bidding') return;
    if (it.priceCents + BID_INCREMENT_CENTS > it.ceilingCents) return; // tapped out
    const base = 2600 - botSpeed * 320; // higher speed → shorter gap
    const delay = base + Math.random() * 1400 + (it.currentWinner === viewerId ? 900 : 0); // give the human a beat
    const id = setTimeout(() => {
      const cur = itemRef.current;
      if (!cur || cur.status !== 'bidding' || Date.now() > cur.biddingEndsAt) return;
      const next = cur.priceCents + BID_INCREMENT_CENTS;
      const endsAt = Math.max(cur.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setItem({
        ...cur,
        priceCents: next,
        bidCount: cur.bidCount + 1,
        currentWinner: pickBot(cur.currentWinner),
        biddingEndsAt: endsAt,
      });
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item && item.priceCents, item && item.currentWinner, item && item.status, botSpeed, viewerId]);

  // Flat action wrappers. Async to match the Phase 3b contract (real RPC).
  const placeBid = useCallback(async () => {
    api.placeBid(viewerId);
  }, [api, viewerId]);

  const placeCustomBid = useCallback(
    async (amountCents: number) => {
      api.placeCustomBid(viewerId, amountCents);
    },
    [api, viewerId],
  );

  const dismissWinnerBanner = useCallback(() => setWinnerBanner(null), []);

  // Derived flat fields. `status: 'idle'` only before the first lot mounts.
  const status: AuctionStatus = item ? item.status : 'idle';
  const currentPriceCents = item ? item.priceCents : 0;
  const currentWinnerId = item ? item.currentWinner : null;
  const bidCount = item ? item.bidCount : 0;
  const endsAt = item ? item.biddingEndsAt : null;

  return {
    currentItem: item,
    status,
    currentPriceCents,
    currentWinnerId,
    bidCount,
    endsAt,
    placeBid,
    placeCustomBid,
    winnerBanner,
    dismissWinnerBanner,
  };
}
