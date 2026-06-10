// src/components/livestreams/SlideToBid.tsx
//
// Drag-right-to-confirm bid pill. Visual spec:
// docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.slide-bid, .slide-bid-thumb, .chv, .chv-a, .chv-b, @keyframes chvWave).
//
// Track: 54px tall, 2px crimson border on transparent w/ glass blur.
// Thumb: 3px inset top/bottom, 74% of track width, crimson gradient.
// Chevrons: two glyphs pulsing in a left→right wave (0.2s stagger).
// Pointer Events mechanics unchanged from prior version — half-gap
// commit threshold + spring-back via cubic-bezier(0.34, 1.4, 0.64, 1).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Label shown when idle, e.g. "Bid $6". */
  label: string;
  /** Fires when the user drags the thumb past the confirm threshold. */
  onConfirm: () => void;
  /** Disable interaction (e.g. bidding closed). */
  disabled?: boolean;
  /** External "busy" state — parent is processing the bid. Locks
   *  interaction and shows a checkmark. Auto-resets when the parent
   *  flips back to false. */
  busy?: boolean;
}

const TRACK_HEIGHT = 54;
// Inset from the track border to the thumb top/bottom. The crimson
// gradient fill should clear the 2px crimson border with a visible
// 3px gap on all sides.
const THUMB_INSET = 3;
// Thumb width as a share of the track width. 74% leaves a commit gap
// on the right that the user drags into.
const THUMB_RATIO = 0.74;

// Single chevron glyph — kept inline so each animates independently.
function Chev({ delay }: { delay: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{
        width: 18,
        height: 18,
        display: 'block',
        transformBox: 'fill-box',
        transformOrigin: 'center',
        animation: 'slbChvWave 1.25s ease-in-out infinite',
        animationDelay: `${delay}s`,
        '@keyframes slbChvWave': {
          '0%, 60%, 100%': { opacity: 0.3, transform: 'scale(0.82)' },
          '30%':            { opacity: 1,   transform: 'scale(1.12)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          opacity: 0.9,
        },
      }}
    >
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}

export default function SlideToBid({ label, onConfirm, disabled = false, busy = false }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draggingX, setDraggingX] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const update = () => setTrackWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!busy) setConfirmed(false);
  }, [busy]);

  // Reset thumb position when the label changes (e.g. the price went up
  // after our bid landed — the next bid starts from the left again).
  useEffect(() => {
    if (!busy) setDraggingX(null);
  }, [label, busy]);

  // Geometry. The thumb travels between restX and maxX inside the
  // 3px-inset usable region.
  const innerWidth = Math.max(0, trackWidth - THUMB_INSET * 2);
  const thumbWidth = Math.max(140, Math.floor(innerWidth * THUMB_RATIO));
  const restX = THUMB_INSET;
  const maxX = Math.max(restX, trackWidth - thumbWidth - THUMB_INSET);
  const gapWidth = maxX - restX;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingX(restX);
  }, [disabled, busy, restX]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;
    // Anchor the right edge of the thumb to the pointer so the
    // chevrons track the finger as it advances into the gap.
    const pointerOffsetFromThumbRight = e.clientX - trackRect.left - thumbWidth;
    const clamped = Math.max(restX, Math.min(maxX, restX + pointerOffsetFromThumbRight));
    setDraggingX(clamped);
  }, [draggingX, thumbWidth, restX, maxX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Half-gap commit threshold. Enough to require intent; small enough
    // that the gesture feels light. A tap (zero motion) cannot clear it.
    if (draggingX >= restX + gapWidth * 0.5) {
      setConfirmed(true);
      setDraggingX(maxX);
      onConfirm();
    } else {
      setDraggingX(null);
    }
  }, [draggingX, onConfirm, restX, gapWidth, maxX]);

  const thumbX = confirmed
    ? maxX
    : draggingX !== null
      ? draggingX
      : restX;

  const isDragging = draggingX !== null && !confirmed;

  return (
    <Box
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: TRACK_HEIGHT,
        borderRadius: 999,
        background: 'transparent',
        border: `2px solid ${inkstashColors.brand}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
      }}
    >
      {/* Thumb — gradient, 3px inset, chevron wave or check on confirm */}
      <Box
        sx={{
          position: 'absolute',
          top: THUMB_INSET,
          left: thumbX,
          height: `calc(100% - ${THUMB_INSET * 2}px)`,
          width: thumbWidth,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          boxShadow: '0 6px 16px -4px rgba(161,35,44,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
          // Transition: dragging = none (1:1 finger tracking); else spring back.
          transition: isDragging
            ? 'none'
            : 'left 220ms cubic-bezier(0.34, 1.4, 0.64, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#fff',
          fontFamily: inkstashFonts.ui,
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '0.005em',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {confirmed ? (
          <>
            <Check size={18} strokeWidth={2.6} />
            <Typography component="span" sx={{ fontWeight: 800, fontSize: 16 }}>
              Bid placed
            </Typography>
          </>
        ) : (
          <>
            <Typography component="span" sx={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>
              {label}
            </Typography>
            <Chev delay={0} />
            <Chev delay={0.2} />
          </>
        )}
      </Box>
    </Box>
  );
}
