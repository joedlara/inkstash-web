// WinnerBanner — "X won for $N!" glass banner. Mounts <SpeedLines active />
// while visible. Ported 1:1 from docs/design-system/live_stream/auction.jsx's
// AuctionWinnerBanner.
//
// Purely presentational: the parent passes a `winner` blob when the banner
// should show; `null` hides it. Auto-dismiss timing lives in useLiveAuction
// (the hook clears the banner after 4.6s, matching the prototype's
// resolve→advance cadence). Phase 2 drops the "Charging your card…" inline
// charge state — Phase 3b will reintroduce it via the real charge edge fn.
import { SpeedLines } from '../effects/SpeedLines';

const money = (cents: number): string =>
  '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');

type Props = {
  winner: { winnerUsername: string; finalPriceCents: number } | null;
  onDismiss: () => void;
};

export function WinnerBanner({ winner, onDismiss: _onDismiss }: Props) {
  if (!winner) return null;
  const { winnerUsername, finalPriceCents } = winner;
  return (
    <>
      <SpeedLines active />
      <div className="ls-auction-winner" role="status">
        <div className="ls-aw-title">Winner&nbsp;🎉</div>
        <div className="ls-aw-pill">
          <span className="ls-aw-name">{winnerUsername}</span>
          <span className="ls-aw-won"> won for {money(finalPriceCents)}!</span>
        </div>
      </div>
    </>
  );
}
