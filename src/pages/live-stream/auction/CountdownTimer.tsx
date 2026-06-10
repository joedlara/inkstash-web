// CountdownTimer — extracted from docs/design-system/live_stream/auction.jsx's
// AuctionBlock so AuctionBlock stays readable. 200ms tick; renders amber by
// default, red-blink at ≤3s (the `.ls-urgent` modifier), green "SOLD" when fired.
// Phase 2 prop: `endsAt: number | null` (ms epoch — matches the mock state).
// Phase 3b switches this to an ISO string.
import { useEffect, useState } from 'react';

type Props = {
  endsAt: number | null;
  sold: boolean;
};

export function CountdownTimer({ endsAt, sold }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const secs = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const urgent = !sold && endsAt !== null && endsAt > now && secs <= 3;
  const timerLabel = sold ? 'SOLD' : `00:${String(secs).padStart(2, '0')}`;

  return (
    <div className={'ls-ac-timer' + (urgent ? ' ls-urgent' : '') + (sold ? ' ls-sold' : '')}>
      {timerLabel}
    </div>
  );
}
