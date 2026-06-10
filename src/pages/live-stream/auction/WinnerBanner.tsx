// WinnerBanner — "X won for $N!" glass banner. Mounts <SpeedLines active />
// while visible. Ported 1:1 from docs/design-system/live_stream/auction.jsx's
// AuctionWinnerBanner. Auto-dismiss happens upstream (useLiveAuction holds the
// banner for 4.6s, then advances to the next lot — matching the prototype).
import { SpeedLines } from '../effects/SpeedLines';

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

export type WinnerBannerData = {
  winner: string;
  amountCents: number;
  isYou: boolean;
};

export type ChargeState = null | 'charging' | 'paid';

type Props = {
  banner: WinnerBannerData | null;
  charge: ChargeState;
};

export function WinnerBanner({ banner, charge }: Props) {
  if (!banner) return null;
  const { winner, amountCents, isYou } = banner;
  return (
    <>
      <SpeedLines active />
      <div className="ls-auction-winner" role="status">
        <div className="ls-aw-title">Winner&nbsp;🎉</div>
        <div className="ls-aw-pill">
          <span className="ls-aw-name">{winner}</span>
          <span className="ls-aw-won"> won for {money(amountCents)}!</span>
        </div>
        {isYou && (
          <div className={'ls-aw-charge' + (charge === 'paid' ? ' ls-is-paid' : '')}>
            {charge === 'paid' ? (
              <>
                <Chk /> Card on file charged · {money(amountCents)}
              </>
            ) : (
              <>
                <span className="ls-aw-spin" /> Charging your card on file…
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
