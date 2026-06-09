// src/components/livestreams/StreamTapLayer.tsx
//
// Catches taps on the video and disambiguates single-tap (toggle
// distraction-free mode on ≤1024px) vs double-tap (place a like).
// Per the live-stream redesign:
//
//   - Double-tap → fires onLike(x, y) and pops a floating heart that
//     drifts up and fades.
//   - Single-tap → on tablet/mobile or fullscreen, toggles a "clean"
//     mode that fades the host pill, action rail, and bottom auction
//     overlay so the viewer can focus on the camera.
//
// Single vs double is resolved with a 300ms delay (matches the
// prototype). The catcher sits ABOVE the video but BELOW any
// overlay you want to keep interactive, so children of the video
// stage decide their own z-index.
//
// Likes count is currently client-only — persisted to localStorage
// per stream so the count keeps accumulating across reloads. Real
// backend (`livestream_likes` table) lands in a later round.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { Heart } from 'lucide-react';
import { inkstashColors } from '../../theme/inkstashTokens';

const TAP_GAP_MS = 300;
const HEART_LIFETIME_MS = 1050;

interface Heart {
  id: number;
  x: number;
  y: number;
  rot: number;
  dx: number;
}

interface UseStreamTapsResult {
  /** Wire to the catcher Box's onPointerUp. */
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  hearts: Heart[];
  /** Like count (persisted to localStorage keyed by livestreamId). */
  likes: number;
  /** True when distraction-free mode is on (single-tap toggle). */
  clean: boolean;
  /** Manual like (e.g. from the right-rail Like button). Renders a
   *  heart at a fallback corner position. */
  likeFromButton: (anchorRect?: DOMRect) => void;
}

/**
 * Owner-side hook. The parent component decides where to mount the
 * catcher + heart layer; we just track state.
 */
export function useStreamTaps(livestreamId: string): UseStreamTapsResult {
  const storageKey = `inkstash.stream.likes.${livestreamId}`;

  const [hearts, setHearts] = useState<Heart[]>([]);
  const [likes, setLikes] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = Number(localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  });
  const [clean, setClean] = useState(false);

  const heartId = useRef(0);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(likes));
      // Notify LikeButton (or any sibling surface) that the count
      // changed without forcing them to subscribe to localStorage.
      window.dispatchEvent(new CustomEvent('inkstash:likes-changed', {
        detail: { livestreamId, likes },
      }));
    }
  }, [likes, storageKey, livestreamId]);

  // Broadcast clean-mode changes so other overlays (right rail,
  // bottom auction, etc.) can react. Avoids prop-drilling through
  // every render branch of LiveStreamView.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('inkstash:clean-mode', {
      detail: { clean },
    }));
  }, [clean]);

  const addLike = useCallback((x: number, y: number) => {
    setLikes((l) => l + 1);
    const id = ++heartId.current;
    const newHeart: Heart = {
      id,
      x,
      y,
      rot: (Math.random() * 2 - 1) * 26,
      dx: (Math.random() * 2 - 1) * 36,
    };
    setHearts((hs) => [...hs, newHeart]);
    window.setTimeout(() => {
      setHearts((hs) => hs.filter((h) => h.id !== id));
    }, HEART_LIFETIME_MS);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = Date.now();
    if (now - lastTap.current < TAP_GAP_MS) {
      // Second tap inside the window — cancel the pending single-tap
      // timer and place a like instead.
      if (tapTimer.current) {
        window.clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      lastTap.current = 0;
      addLike(x, y);
    } else {
      lastTap.current = now;
      // Wait for a second tap; if none lands within the gap, treat
      // as a single tap and (if we're on a small viewport or in
      // fullscreen) toggle distraction-free mode.
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        const isImmersive = typeof window !== 'undefined'
          && (window.matchMedia('(max-width: 1024px)').matches
              || !!document.fullscreenElement);
        if (isImmersive) setClean((c) => !c);
      }, TAP_GAP_MS);
    }
  }, [addLike]);

  const likeFromButton = useCallback((anchorRect?: DOMRect) => {
    // Fall back to a sensible right-side anchor when no rect is
    // supplied. The heart layer is positioned absolutely against
    // the video card, so (0, 0) would land top-left.
    if (anchorRect) {
      addLike(anchorRect.left + anchorRect.width / 2, anchorRect.top + anchorRect.height / 2);
    } else {
      addLike(280, 360);
    }
  }, [addLike]);

  // LikeButton dispatches `inkstash:like-from-button` rather than
  // calling this hook directly (it doesn't have access). Listen here
  // and route into the same addLike path.
  useEffect(() => {
    const onButtonLike = (e: Event) => {
      const detail = (e as CustomEvent<{ livestreamId: string; anchorRect: DOMRect | null }>).detail;
      if (detail?.livestreamId !== livestreamId) return;
      likeFromButton(detail.anchorRect ?? undefined);
    };
    window.addEventListener('inkstash:like-from-button', onButtonLike);
    return () => window.removeEventListener('inkstash:like-from-button', onButtonLike);
  }, [livestreamId, likeFromButton]);

  return { onPointerUp, hearts, likes, clean, likeFromButton };
}

/**
 * Subscribes any descendant of the stream view to clean-mode changes.
 * Used by RightRailActions, the auction bottom strip, etc. to fade
 * out when single-tap toggle is on.
 */
export function useCleanMode(): boolean {
  const [clean, setClean] = useState(false);
  useEffect(() => {
    const onChange = (e: Event) => {
      setClean((e as CustomEvent<{ clean: boolean }>).detail.clean);
    };
    window.addEventListener('inkstash:clean-mode', onChange);
    return () => window.removeEventListener('inkstash:clean-mode', onChange);
  }, []);
  return clean;
}

// ───────────────────────────────────────────────────────────────────
// Rendered layers (drop into the video card)
// ───────────────────────────────────────────────────────────────────

const heartKeyframes = (
  <GlobalStyles
    styles={{
      '@keyframes inkstashHeartPop': {
        '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.3) rotate(var(--inkstash-rot, 0deg))' },
        '18%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.15) rotate(var(--inkstash-rot, 0deg))' },
        '35%': { transform: 'translate(-50%, -50%) scale(0.95) rotate(var(--inkstash-rot, 0deg))' },
        '100%': { opacity: 0, transform: 'translate(calc(-50% + var(--inkstash-dx, 0)), -185px) scale(1.05) rotate(var(--inkstash-rot, 0deg))' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '.inkstash-heart-pop': { animationDuration: '0.6s !important' },
      },
    }}
  />
);

/**
 * Invisible tap catcher. Mount inside the video card at z-index
 * UNDER any overlays you want to keep interactive (so taps on the
 * right rail or the bid slider don't trigger likes / clean toggle).
 */
export function TapCatcher({ onPointerUp }: { onPointerUp: UseStreamTapsResult['onPointerUp'] }) {
  return (
    <Box
      onPointerUp={onPointerUp}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        bgcolor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
      }}
    />
  );
}

/**
 * Floating hearts layer. Mount inside the video card above the
 * TapCatcher; pointer-events:none so taps still reach the catcher.
 */
export function HeartLayer({ hearts }: { hearts: Heart[] }) {
  return (
    <>
      {heartKeyframes}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 9,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {hearts.map((h) => (
          <Box
            key={h.id}
            className="inkstash-heart-pop"
            sx={{
              position: 'absolute',
              left: h.x,
              top: h.y,
              transform: 'translate(-50%, -50%)',
              color: inkstashColors.brand,
              willChange: 'transform, opacity',
              animation: 'inkstashHeartPop 1.05s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
              filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.45))',
              // CSS custom props consumed by the keyframes above.
              '--inkstash-rot': `${h.rot}deg`,
              '--inkstash-dx': `${h.dx}px`,
            }}
          >
            <Heart size={52} fill="currentColor" strokeWidth={0} />
          </Box>
        ))}
      </Box>
    </>
  );
}
