// BidRow — Custom pill + SlideToBid (or the "you're winning" lock).
// Extracted from docs/design-system/live_stream/auction.jsx AuctionBlock's
// `<div className="bid-row">` block.
import { useState } from 'react';
import { SlideToBid } from './SlideToBid';
import { CustomBidPopover } from './CustomBidPopover';

const money = (cents: number): string =>
  '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');

const Chk = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

type Props = {
  currentPriceCents: number;
  nextBidCents: number;
  customOptions: number[];
  bidActive: boolean;
  isWinning: boolean;
  busy: boolean;
  onBid: () => void;
  onCustomBid: (amountCents: number) => void;
};

export function BidRow({
  currentPriceCents: _currentPriceCents,
  nextBidCents,
  customOptions,
  bidActive,
  isWinning,
  busy,
  onBid,
  onCustomBid,
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  const handleCustom = (amountCents: number) => {
    setCustomOpen(false);
    onCustomBid(amountCents);
  };

  const nextLabel = 'Bid ' + money(nextBidCents);

  return (
    <div className="ls-bid-row">
      <div className="ls-custom-wrap">
        <button
          type="button"
          className="ls-btn-custom"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
          style={{ borderWidth: '2px' }}
        >
          Custom
        </button>
        {customOpen && (
          <CustomBidPopover
            options={customOptions}
            onSelect={handleCustom}
            onDismiss={() => setCustomOpen(false)}
          />
        )}
      </div>

      {isWinning ? (
        <div className="ls-bid-lock">
          <Chk /> You're the highest bidder
        </div>
      ) : (
        <SlideToBid
          label={nextLabel}
          onConfirm={onBid}
          busy={busy}
          disabled={!bidActive}
        />
      )}
    </div>
  );
}
