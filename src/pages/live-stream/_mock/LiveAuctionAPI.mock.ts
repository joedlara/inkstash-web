// Mocked LiveAuctionAPI — ported 1:1 from docs/design-system/live_stream/auction.jsx.
// Drives the prototype's bid flow without real Supabase. Replaced in Phase 3b
// by the real livestreamsAPI methods. Bot bidding loop lives in useLiveAuction.
import type { Gradient } from './streamData.mock';

export const BID_INCREMENT_CENTS = 100; // place-bid is a flat $1 bump
export const SOFT_CLOSE_MS = 9000; // start-bidding's soft-close window
export const ANTI_SNIPE_MS = 6000; // a late bid resets the clock to at least this

export type AuctionLot = {
  title: string;
  condition: string;
  ship: string;
  startCents: number;
  ceilingCents: number;
  grad: Gradient;
};

export type AuctionItemState = {
  title: string;
  condition: string;
  ship: string;
  grad: Gradient;
  ceilingCents: number;
  priceCents: number;
  bidCount: number;
  biddingEndsAt: number;
  currentWinner: string | null;
  status: 'bidding' | 'sold' | 'passed';
};

export type StartBiddingResult = {
  start_price_cents: number;
  bidding_ends_at: string;
};

export type PlaceBidResult = {
  current_price_cents: number;
  current_winner_id: string;
  bid_count: number;
  bidding_ends_at: string;
};

export type PlaceCustomBidResult = {
  current_price_cents: number;
  current_winner_id: string;
  bid_count: number;
};

export type ChargeWinResult = {
  status: 'charged';
  payment_intent_id: string;
  amount_cents: number;
};

export type ResolveBiddingResult = 'no_item' | 'sold' | 'passed';

export type LiveAuctionAPI = {
  startBidding: (lot: AuctionLot) => StartBiddingResult;
  placeBid: (bidderId: string) => PlaceBidResult;
  placeCustomBid: (bidderId: string, amountCents: number) => PlaceCustomBidResult;
  resolveBidding: () => ResolveBiddingResult;
  chargeWin: (amountCents: number) => Promise<ChargeWinResult>;
};

// The lots the host runs this show. botCeiling is purely a sim knob — how far
// the room will chase each lot.
export const AUCTION_QUEUE: AuctionLot[] = [
  { title: '$2 START / COMICS #19', condition: 'Near Mint', ship: '$4.75 Shipping + Taxes', startCents: 200, ceilingCents: 1400, grad: ['#C2362F', '#5C1116'] },
  { title: 'GRADED GRAIL / SLAB', condition: 'CGC 9.6', ship: '$6.09 Shipping + Taxes', startCents: 500, ceilingCents: 4200, grad: ['#1F3A6E', '#0E1D3E'] },
  { title: 'VAULT BOX / MED #68', condition: 'Sealed', ship: '$5.25 Shipping + Taxes', startCents: 100, ceilingCents: 2600, grad: ['#3F6F4A', '#1B3024'] },
  { title: 'CRIMSON WAVE VARIANT', condition: 'VF/NM', ship: '$4.75 Shipping + Taxes', startCents: 300, ceilingCents: 1900, grad: ['#5B3DB8', '#2A1A5C'] },
];

export const BOT_BIDDERS = ['alec0203', 'jhirooo', 'fakerice', 'slabhound', 'panelfan', 'gradedgoddess', 'pulpmaster', 'nixatnight'];

export function pickBot(exclude: string | null): string {
  const pool = BOT_BIDDERS.filter((b) => b !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

class AuctionApiError extends Error {
  constructor(name: string) {
    super(name);
    this.name = name;
  }
}

export function makeLiveAuctionAPI(
  getState: () => AuctionItemState | null,
  setState: (next: AuctionItemState) => void,
  hasCardRef: { current: boolean },
): LiveAuctionAPI {
  return {
    // start-bidding: host flips a lot live + arms the soft-close timer.
    startBidding(lot) {
      const endsAt = Date.now() + SOFT_CLOSE_MS;
      setState({
        title: lot.title,
        condition: lot.condition,
        ship: lot.ship,
        grad: lot.grad,
        ceilingCents: lot.ceilingCents,
        priceCents: lot.startCents,
        bidCount: 0,
        biddingEndsAt: endsAt,
        currentWinner: null,
        status: 'bidding',
      });
      return { start_price_cents: lot.startCents, bidding_ends_at: new Date(endsAt).toISOString() };
    },

    // place-bid: viewer-side single $1 bump. Rejects 402 'no_card_on_file' when
    // the bidder has no saved payment method (real fn pre-gates on this).
    placeBid(bidderId) {
      if (!hasCardRef.current) throw new AuctionApiError('no_card_on_file');
      const s = getState();
      if (!s || s.status !== 'bidding') throw new AuctionApiError('not_bidding');
      if (Date.now() > s.biddingEndsAt) throw new AuctionApiError('bidding_closed');
      const next = s.priceCents + BID_INCREMENT_CENTS;
      const endsAt = Math.max(s.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setState({ ...s, priceCents: next, bidCount: s.bidCount + 1, currentWinner: bidderId, biddingEndsAt: endsAt });
      return {
        current_price_cents: next,
        current_winner_id: bidderId,
        bid_count: s.bidCount + 1,
        bidding_ends_at: new Date(endsAt).toISOString(),
      };
    },

    // place-bid with an explicit jump (the "Custom" pill — sets a specific
    // higher amount in one motion instead of a single $1 bump).
    placeCustomBid(bidderId, amountCents) {
      if (!hasCardRef.current) throw new AuctionApiError('no_card_on_file');
      const s = getState();
      if (!s || s.status !== 'bidding' || Date.now() > s.biddingEndsAt) throw new AuctionApiError('bidding_closed');
      if (amountCents <= s.priceCents) throw new AuctionApiError('bid_too_low');
      const endsAt = Math.max(s.biddingEndsAt, Date.now() + ANTI_SNIPE_MS);
      setState({ ...s, priceCents: amountCents, bidCount: s.bidCount + 1, currentWinner: bidderId, biddingEndsAt: endsAt });
      return {
        current_price_cents: amountCents,
        current_winner_id: bidderId,
        bid_count: s.bidCount + 1,
      };
    },

    // resolve_livestream_bid RPC: timer expiry flips the lot sold / passed.
    resolveBidding() {
      const s = getState();
      if (!s) return 'no_item';
      const status: 'sold' | 'passed' = s.currentWinner ? 'sold' : 'passed';
      setState({ ...s, status });
      return status;
    },

    // charge-auction-win edge fn: charges the winner's saved card via the
    // seller's Stripe Connect account. Returns the same status union.
    async chargeWin(amountCents) {
      await new Promise<void>((r) => setTimeout(r, 1700)); // network + Stripe round-trip
      return {
        status: 'charged',
        payment_intent_id: 'pi_' + Math.random().toString(36).slice(2, 12),
        amount_cents: amountCents,
      };
    },
  };
}
