// AuctionBlock — glass lot card (status · title · shipping · price · timer)
// + the Custom pill and SlideToBid row. Sits in the video's bottom overlay.
// Phase 3b: drops the `hasCard` prop — the server (place-bid edge fn)
// gates on saved-card now and throws 'no_card_on_file' which the hook
// handles by calling onNeedCard. We keep the wallet-card-ready listener
// for legacy compatibility, but the hook drives the actual retry.
//
// Takes the hook's flat result + a viewerId + onNeedCard hook. The hook's
// `placeBid` / `placeCustomBid` are async; on rejection we sniff the thrown
// Error.name (bidding_closed, bid_too_low, etc.) and flash a toast.
// `no_card_on_file` is consumed by the hook (it calls onNeedCard) but we
// still tag pendingRef so the legacy wallet-card-ready event re-fires bid
// in case any other surface dispatches it.
import { useEffect, useRef, useState } from 'react';
import { StatusLine } from './StatusLine';
import { LotRow } from './LotRow';
import { BidRow } from './BidRow';
import type { UseLiveAuction } from './useLiveAuction';

// Display constant for the local optimistic next-bid amount on the
// flat-bid path. The real increment is owned server-side; this just
// paints the BidRow button while we wait for the place-bid round
// trip. Phase 3b-2 wires custom amounts ($5/$10/$25) through the same
// place-bid edge fn — those bypass this constant entirely and pass
// their absolute target through to the RPC.
const BID_INCREMENT_CENTS = 100;

type Props = {
  auction: UseLiveAuction;
  viewerId: string | null;
  onNeedCard: () => void;
  glass?: boolean;
};

export function AuctionBlock({ auction, viewerId, onNeedCard, glass = true }: Props) {
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

  // Auto-retry the bid once a card is added. The hook's own listener
  // does the canonical retry; this is a belt-and-suspenders for the
  // case where AuctionBlock's optimistic loop fires before the hook's
  // pendingBidRef latches.
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
  // bidActive gates BidRow rendering. True only when the lot is mid-bidding
  // AND the soft-close timer hasn't elapsed. The hook flips status from
  // 'bidding' → 'sold'/'passed' via the resolveBidding RPC once the
  // server processes the expiry, so a "Bidding closed" slider can briefly
  // show between client-side expiry and the round-trip — that's OK; the
  // hook surfaces 'bidding_closed' errors as a toast in that window.
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
        // Hook already invoked onNeedCard; we just remember the bid so
        // legacy 'inkstash:wallet-card-ready' surfaces can retry.
        pendingRef.current = true;
      } else if (name === 'bidding_closed' || name === 'item_not_bidding') {
        flash('Too late — bidding just closed.');
      } else if (name === 'Not logged in.') {
        flash('Sign in to bid.');
      } else {
        flash("Couldn't place your bid — try again.");
      }
    } finally {
      setTimeout(() => setBidding(false), 360);
    }
  }

  async function doCustom(amountCents: number) {
    try {
      await placeCustomBid(amountCents);
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'no_card_on_file') {
        pendingRef.current = true;
      } else if (name === 'bid_below_minimum') {
        // Someone else bid past your target between popover-open and
        // server-receive. Phase 3b-2: the RPC validates against the
        // row-locked current price, so a custom amount that was valid
        // when you tapped it can race-lose by the time it lands.
        flash('Bid was below minimum — someone bid first.');
      } else if (name === 'invalid_amount' || name === 'bid_too_low') {
        flash('Enter more than the current bid.');
      } else if (name === 'bidding_closed' || name === 'item_not_bidding') {
        flash('Bidding just closed.');
      } else {
        flash("Couldn't place your bid — try again.");
      }
    }
  }

  // onNeedCard is exposed in props for parents that want to open the
  // wallet from a button (e.g. RightRail Wallet pill). The hook itself
  // also calls it on 402; the prop wiring just keeps the interface
  // explicit. Reference it to satisfy unused-var lint (real consumer
  // is the parent's useLiveAuction config).
  void onNeedCard;

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
