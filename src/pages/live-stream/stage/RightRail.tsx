// RightRail — vertically centered right-side actions on the stage.
// Each action is a stacked icon + label (icon top, text label below) with NO
// pill background — clean, TikTok-style chrome over the video. The Like
// control additionally draws a circular meter ring around the heart (fills as
// taps land within RING_WINDOW_MS in the parent) and renders a brief
// celebration burst of small hearts when `celebrateKey` bumps.
//
// State stays upstream (LiveStreamView): `likes` is the formatted-input count,
// `ringTaps`/`ringTapsTarget` drive the meter arc, `celebrateKey` is bumped to
// re-trigger the burst. This component only paints what it's told.
import { useEffect, useRef, useState } from 'react';

const Heart = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

const More = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const Share = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

const Wallet = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

// Items: matches prototype SIcon.List exactly (3 lines + 3 dot bullets)
const List = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </svg>
);

// Buy: shopping-bag (prototype's SIcon.Buy is rect+line which collides visually
// with Wallet in the same rail — substituted with a bag for clear affordance)
const Buy = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="22"
    height="22"
  >
    <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7z" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
  </svg>
);

// 12 → "12", 1240 → "1.2K", 12300 → "12.3K", 99999 → "100K".
function fmtLikes(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  if (n < 1_000_000) return Math.round(n / 100) / 10 + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// Heart meter ring: SVG circle stroked with dasharray/dashoffset for the arc.
const RING_RADIUS = 26;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export type RightRailPill = 'more' | 'share' | 'wallet' | 'items' | 'buy' | 'like';

const ALL_PILLS: readonly RightRailPill[] = ['more', 'share', 'wallet', 'items', 'buy', 'like'];

type Props = {
  likes: number;
  liked: boolean;
  ringTaps: number;
  ringTapsTarget: number;
  celebrateKey: number;
  onLike: () => void;
  onShare?: () => void;
  onMore?: () => void;
  onWallet?: () => void;
  onItems?: () => void;
  onBuy?: () => void;
  /** Whitelist of pills to render. Default = all six (live-state behavior).
   *  Pre-show passes ['more','share','items','buy'] (no wallet, no like). */
  visiblePills?: ReadonlyArray<RightRailPill>;
};

type Burst = { id: number; dx: number; rot: number; delay: number };

export function RightRail({
  likes,
  liked,
  ringTaps,
  ringTapsTarget,
  celebrateKey,
  onLike,
  onShare,
  onMore,
  onWallet,
  onItems,
  onBuy,
  visiblePills = ALL_PILLS,
}: Props) {
  const show = (p: RightRailPill) => visiblePills.includes(p);
  // Celebration: every `celebrateKey` bump fires a 4-heart burst that fades
  // out over ~1s. We track an array of bursts so multiple completions stack
  // without canceling the previous animation.
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);

  useEffect(() => {
    if (celebrateKey === 0) return; // initial render — nothing to fire
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // accessibility: no celebration on reduce
    const id = ++burstId.current;
    const seeds: Burst[] = [0, 1, 2, 3].map((i) => ({
      id: id * 10 + i,
      dx: (Math.random() * 2 - 1) * 34,
      rot: (Math.random() * 2 - 1) * 28,
      delay: i * 55,
    }));
    setBursts((b) => [...b, ...seeds]);
    const ids = new Set(seeds.map((s) => s.id));
    const t = setTimeout(() => {
      setBursts((b) => b.filter((x) => !ids.has(x.id)));
    }, 1100);
    return () => clearTimeout(t);
  }, [celebrateKey]);

  const progress = Math.min(ringTaps / ringTapsTarget, 1);
  const dashOffset = RING_CIRC * (1 - progress);
  const ringActive = ringTaps > 0;

  return (
    <div className="ls-vf-actions">
      {show('more') && (
        <button
          type="button"
          className="ls-vf-action ls-vf-action-stack"
          aria-label="More"
          onClick={onMore}
        >
          <More />
          <span className="ls-vf-action-label">More</span>
        </button>
      )}

      {show('share') && (
        <button
          type="button"
          className="ls-vf-action ls-vf-action-stack"
          aria-label="Share"
          onClick={onShare}
        >
          <Share />
          <span className="ls-vf-action-label">Share</span>
        </button>
      )}

      {show('wallet') && (
        <button
          type="button"
          className="ls-vf-action ls-vf-action-stack"
          aria-label="Wallet"
          onClick={onWallet}
        >
          <Wallet />
          <span className="ls-vf-action-label">Wallet</span>
        </button>
      )}

      {show('items') && (
        <button
          type="button"
          className="ls-vf-action ls-vf-action-stack"
          aria-label="Items"
          onClick={onItems}
        >
          <List />
          <span className="ls-vf-action-label">Items</span>
        </button>
      )}

      {show('buy') && (
        <button
          type="button"
          className="ls-vf-action ls-vf-action-stack"
          aria-label="Buy"
          onClick={onBuy}
        >
          <Buy />
          <span className="ls-vf-action-label">Buy</span>
        </button>
      )}

      {show('like') && (
      <div className="ls-vf-like">
        <button
          type="button"
          className={'ls-vf-like-btn' + (liked ? ' ls-liked' : '')}
          aria-label="Like"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
        >
          {/* Meter ring around the heart */}
          <svg
            className={'ls-vf-like-ring' + (ringActive ? ' ls-active' : '')}
            viewBox="0 0 64 64"
            width="64"
            height="64"
            aria-hidden
          >
            <circle
              className="ls-vf-like-ring-track"
              cx="32"
              cy="32"
              r={RING_RADIUS}
              fill="none"
            />
            <circle
              className="ls-vf-like-ring-fill"
              cx="32"
              cy="32"
              r={RING_RADIUS}
              fill="none"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="ls-vf-like-heart">
            <Heart filled={liked} />
          </span>
          {/* Celebration burst — tiny hearts flying upward */}
          <span className="ls-vf-like-burst" aria-hidden>
            {bursts.map((b) => (
              <span
                key={b.id}
                className="ls-vf-burst-heart"
                style={
                  {
                    ['--dx' as string]: b.dx + 'px',
                    ['--rot' as string]: b.rot + 'deg',
                    animationDelay: b.delay + 'ms',
                  } as React.CSSProperties
                }
              >
                <Heart filled />
              </span>
            ))}
          </span>
        </button>
        <span className="ls-vf-like-count">{fmtLikes(likes)}</span>
      </div>
      )}
    </div>
  );
}
