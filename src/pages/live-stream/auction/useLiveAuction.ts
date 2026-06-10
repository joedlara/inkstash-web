// useLiveAuction — drives the on-block lot: countdown, bot bids, resolve, charge.
// Ported 1:1 from docs/design-system/live_stream/auction.jsx. The bot loop +
// auto-advance ARE the demo loop the user uses to verify visual parity in
// Phase 2. Replaced wholesale in Phase 3b by the real livestreamsAPI + realtime
// row subscription.
import { useEffect, useRef, useState } from 'react';
import {
  ANTI_SNIPE_MS,
  AUCTION_QUEUE,
  BID_INCREMENT_CENTS,
  makeLiveAuctionAPI,
  pickBot,
  type AuctionItemState,
  type LiveAuctionAPI,
} from '../_mock/LiveAuctionAPI.mock';
import type { WinnerBannerData, ChargeState } from './WinnerBanner';

type Args = {
  viewerId: string;
  hasCard: boolean;
  botSpeed: number;
};

export type UseLiveAuctionResult = {
  item: AuctionItemState | null;
  banner: WinnerBannerData | null;
  charge: ChargeState;
  api: LiveAuctionAPI;
};

export function useLiveAuction({ viewerId, hasCard, botSpeed }: Args): UseLiveAuctionResult {
  const [item, setItem] = useState<AuctionItemState | null>(null);
  const [banner, setBanner] = useState<WinnerBannerData | null>(null);
  const [charge, setCharge] = useState<ChargeState>(null);
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
      const isYou = it.currentWinner === viewerId;
      setBanner({ winner: it.currentWinner ?? '', amountCents: it.priceCents, isYou });
      if (isYou) {
        setCharge('charging');
        api.chargeWin(it.priceCents).then((res) => {
          if (res.status === 'charged') setCharge('paid');
        });
      }
    }
  }, [tickN, viewerId, api]);

  // After a lot resolves, hold the winner moment, then advance to the next lot.
  useEffect(() => {
    if (!item || (item.status !== 'sold' && item.status !== 'passed')) return;
    const t = setTimeout(() => {
      setBanner(null);
      setCharge(null);
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

  return { item, banner, charge, api };
}
