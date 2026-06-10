// VideoStage — 9:16 dark card hosting the player + every overlay chrome piece
// (HostPill, ViewerCountBadge, GiveawayPill, RightRail, TapLayer) plus the
// auction overlay block. In Phase 2 the player itself is a static motif
// placeholder; Phase 3d swaps in the real player.
//
// Like state is owned upstream (LiveStreamView) so the same `onLike` callback
// fires from BOTH the side-rail button and TapLayer's double-tap — the meter
// ring + celebration burst stay in sync no matter which surface the user taps.
// This file owns only the floating heart-pop visual layer (a separate effect
// from the celebration burst — these are the per-tap hearts that fly upward
// from the double-tap coordinate, mirroring the prototype).
import { useRef, useState, type ReactNode } from 'react';
import { mockHost } from '../_mock/streamData.mock';
import { HostPill } from './HostPill';
import { ViewerCountBadge } from './ViewerCountBadge';
import { GiveawayPill } from './GiveawayPill';
import { RightRail } from './RightRail';
import { TapLayer } from './TapLayer';

const Heart = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="20"
    height="20"
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

type FloatingHeart = {
  id: number;
  x: number;
  y: number;
  rot: number;
  dx: number;
};

type Props = {
  /** Overlay nodes rendered along the bottom: winner banner, immersive chat,
   *  composer, AuctionBlock — composed by the page shell. */
  bottomOverlay: ReactNode;
  /** Like state owned by LiveStreamView so TapLayer + RightRail share it. */
  likes: number;
  liked: boolean;
  ringTaps: number;
  ringTapsTarget: number;
  /** Bumps every time a celebration burst should fire. */
  celebrateKey: number;
  /** Called on every like — heart button click OR double-tap on the video. */
  onLike: () => void;
  /** Wallet pill in the side rail. Phase 3b: opens the in-stream
   *  WalletSheet so viewers can add a card without leaving the stream. */
  onWallet?: () => void;
};

export function VideoStage({
  bottomOverlay,
  likes,
  liked,
  ringTaps,
  ringTapsTarget,
  celebrateKey,
  onLike,
  onWallet,
}: Props) {
  const feedRef = useRef<HTMLDivElement | null>(null);
  const heartId = useRef(0);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  // Distraction-free mode (tablet/mobile): single-tap centre fades chat + bidding.
  const [clean, setClean] = useState(false);

  function spawnFloatingHeart(x: number, y: number) {
    const id = ++heartId.current;
    setHearts((hs) => [
      ...hs,
      { id, x, y, rot: (Math.random() * 2 - 1) * 26, dx: (Math.random() * 2 - 1) * 36 },
    ]);
    setTimeout(() => setHearts((hs) => hs.filter((h) => h.id !== id)), 1050);
  }

  function togglePeel() {
    // Single-tap in immersive mode toggles distraction-free; on desktop it's a no-op.
    const immersive =
      window.matchMedia('(max-width: 1024px)').matches ||
      !!document.querySelector('.ls-stream-fullscreen');
    if (immersive) setClean((c) => !c);
  }

  function onDoubleTapLike(x: number, y: number) {
    onLike();
    spawnFloatingHeart(x, y);
  }

  function likeFromButton() {
    onLike();
  }

  return (
    <div className="ls-video-col ls-stream-card">
      <div className="ls-video-stage">
        <div className={'ls-video-feed' + (clean ? ' ls-vf-clean' : '')} ref={feedRef}>
          {/* Placeholder player — Phase 3d mounts the real <Player /> here. */}
          <div className="ls-video-motif">
            <div className="ls-seal">TV</div>
            <div className="ls-cap">Live feed</div>
          </div>

          <TapLayer onTogglePeel={togglePeel} onDoubleTapLike={onDoubleTapLike} />

          <div className="ls-heart-layer">
            {hearts.map((h) => (
              <span
                key={h.id}
                className="ls-heart-pop"
                style={
                  {
                    left: h.x,
                    top: h.y,
                    ['--rot' as string]: h.rot + 'deg',
                    ['--dx' as string]: h.dx + 'px',
                  } as React.CSSProperties
                }
              >
                <Heart filled />
              </span>
            ))}
          </div>

          <div className="ls-vf-top">
            <HostPill
              username={mockHost.name}
              gradient={mockHost.gradient}
              verified={mockHost.verified}
            />
            <div className="ls-vf-top-right">
              <ViewerCountBadge count={mockHost.viewers} />
              <GiveawayPill />
            </div>
          </div>

          <RightRail
            likes={likes}
            liked={liked}
            ringTaps={ringTaps}
            ringTapsTarget={ringTapsTarget}
            celebrateKey={celebrateKey}
            onLike={likeFromButton}
            onWallet={onWallet}
          />

          <div className="ls-vf-overlay-bottom">{bottomOverlay}</div>
        </div>
      </div>
    </div>
  );
}
