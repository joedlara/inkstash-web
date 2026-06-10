// AuctionBlock — glass lot card (status · title · shipping · price · timer)
// + the Custom pill and SlideToBid row. Sits in the video's bottom overlay.
// Ported 1:1 from docs/design-system/live_stream/auction.jsx — wraps the
// extracted primitives (StatusLine, LotRow, BidRow) and keeps the original's
// wallet-card-ready auto-retry + toast machinery.
//
// Takes the hook's flat result + a viewerId + onNeedCard hook. The hook's
// `placeBid` / `placeCustomBid` are async; on rejection we sniff the thrown
// AuctionApiError name (no_card_on_file, bidding_closed, bid_too_low) the
// same way the prototype did and route to either the wallet sheet or a toast.
import { useEffect, useRef, useState } from 'react';
import { BID_INCREMENT_CENTS } from '../_mock/LiveAuctionAPI.mock';
import { StatusLine } from './StatusLine';
import { LotRow } from './LotRow';
import { BidRow } from './BidRow';
import type { UseLiveAuction } from './useLiveAuction';

type Props = {
  auction: UseLiveAuction;
  viewerId: string;
  hasCard: boolean;
  onNeedCard: () => void;
  glass?: boolean;
};

export function AuctionBlock({ auction, viewerId, hasCard, onNeedCard, glass = true }: Props) {
  const {
    currentItem,
    status,
    currentPriceCents,
    currentWinnerId,
    endsAt,
    placeBid,
    placeCustomBid,
  } = auction;

  const [bidding, setBidding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pendingRef = useRef(false);

  // Auto-retry the bid once a card is added (mirrors inkstash:wallet-card-ready).
  // The empty-state guard reproduces the prototype: doBid closes over `currentItem`
  // through the surrounding closure on each render.
  useEffect(() => {
    const onReady = () => {
      if (pendingRef.current) {
        pendingRef.current = false;
        void doBid();
      }
    };
    window.addEventListener('inkstash:wallet-card-ready', onReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem]);

  if (!currentItem) return null;

  const now = Date.now();
  // bidActive gates BidRow rendering (line below the JSX). It is true ONLY
  // when the lot is mid-bidding AND the soft-close timer hasn't elapsed.
  // The mock's state machine (useLiveAuction → resolveBidding) flips status
  // from 'bidding' → 'sold' the instant the timer expires, before the next
  // render — so a "Bidding closed" slider cannot appear on a sold lot in
  // steady state. If you see one in dev, hard-reload (Vite HMR can show a
  // stale BidRow from the previous lot for one frame). Issue 4 (2026-06-10).
  const bidActive = status === 'bidding' && endsAt !== null && endsAt > now;
  const isWinning = bidActive && currentWinnerId === viewerId;
  const sold = status === 'sold';
  const nextBidCents = currentPriceCents + BID_INCREMENT_CENTS;
  const customOpts = [500, 1000, 2500].map((c) => currentPriceCents + c);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function doBid() {
    if (bidding) return;
    setBidding(true);
    try {
      await placeBid();
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'no_card_on_file') {
        pendingRef.current = true;
        onNeedCard();
      } else if (name === 'bidding_closed') {
        flash('Too late — bidding just closed.');
      } else {
        flash("Couldn't place your bid — try again.");
      }
    } finally {
      setTimeout(() => setBidding(false), 360);
    }
  }

  async function doCustom(amountCents: number) {
    if (!hasCard) {
      pendingRef.current = true;
      onNeedCard();
      return;
    }
    try {
      await placeCustomBid(amountCents);
    } catch (err) {
      const name = (err as Error).name;
      flash(name === 'bid_too_low' ? 'Enter more than the current bid.' : 'Bidding just closed.');
    }
  }

  return (
    <div className="ls-auction-block">
      <StatusLine currentWinner={currentWinnerId} sold={sold} />

      <LotRow
        title={currentItem.title}
        ship={currentItem.ship}
        priceCents={currentPriceCents}
        grad={currentItem.grad}
        endsAt={endsAt}
        glass={glass}
        isWinning={isWinning}
        sold={sold}
      />

      {bidActive && (
        <BidRow
          currentPriceCents={currentPriceCents}
          nextBidCents={nextBidCents}
          customOptions={customOpts}
          bidActive={bidActive}
          isWinning={isWinning}
          busy={bidding}
          onBid={doBid}
          onCustomBid={doCustom}
        />
      )}

      {toast && <div className="ls-bid-toast">{toast}</div>}
    </div>
  );
}
