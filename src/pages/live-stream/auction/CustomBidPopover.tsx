// CustomBidPopover — extracted from docs/design-system/live_stream/auction.jsx's
// AuctionBlock. Pops a small list of absolute bid amounts (current + $5/$10/$25).
// The buttons call onSelect(amountCents) with the absolute target — placeCustomBid
// in the prototype takes an absolute amount, not a delta.
import { useEffect, useRef } from 'react';

const money = (cents: number): string =>
  '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');

type Props = {
  options: number[];
  onSelect: (amountCents: number) => void;
  onDismiss: () => void;
};

export function CustomBidPopover({ options, onSelect, onDismiss }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Tap-outside dismiss. Pointer down (not click) so the button still receives
  // the press without the popover stealing the event.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onDismiss();
    };
    // Defer so the same tap that opened the popover doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [onDismiss]);

  return (
    <div ref={ref} className="ls-custom-pop">
      {options.map((c) => (
        <button
          type="button"
          key={c}
          className="ls-custom-opt"
          onClick={() => onSelect(c)}
        >
          {money(c)}
        </button>
      ))}
    </div>
  );
}
