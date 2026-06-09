// src/components/livestreams/SlideToBid.tsx
//
// Drag-right-to-confirm bid pill, per the live-stream redesign in
// docs/design-system/live_stream/stream.css (.slide-bid).
//
// Layout:
//   - Outer track: 54px tall pill, 2px brand-red outline, transparent
//     interior (8px backdrop blur so it reads on the video).
//   - Inner thumb: 74% of track width, brand gradient pill, carries the
//     bid label + two pulsing chevrons that animate left→right with a
//     0.2s stagger to invite the drag.
//   - Drag the thumb past the halfway point of the remaining gap to
//     confirm. Snaps back if not committed.
//
// Pointer events (vs touch+mouse) cover both desktop drag and mobile
// drag with one code path. setPointerCapture keeps the drag alive
// even if the pointer leaves the pill bounds.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { ChevronsRight, Check } from 'lucide-react';
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
const TRACK_PADDING = 3;
const THUMB_RATIO = 0.74; // matches the prototype's slide-bid spec

// Pulse the two chevrons left→right (0.2s stagger). Implemented as a
// global keyframes injection so we don't need a CSS module — the
// SlideToBid is the only consumer.
const chevronKeyframes = (
  <GlobalStyles
    styles={{
      '@keyframes inkstashChvWave': {
        '0%, 60%, 100%': { opacity: 0.3, transform: 'scale(0.82)' },
        '30%': { opacity: 1, transform: 'scale(1.12)' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '.inkstash-chv': { animation: 'none !important', opacity: 0.9 },
      },
    }}
  />
);

export default function SlideToBid({ label, onConfirm, disabled = false, busy = false }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draggingX, setDraggingX] = useState<number | null>(null);
  // After confirm, briefly hold the thumb at the right end so the
  // checkmark is visible. Parent clears its busy state, which springs
  // the thumb back via the effect below.
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

  // Reset thumb position when the label changes (e.g. price went up
  // after our bid landed — the next bid starts from the left again).
  useEffect(() => {
    if (!busy) setDraggingX(null);
  }, [label, busy]);

  const thumbWidth = Math.max(150, Math.floor(trackWidth * THUMB_RATIO));
  const restX = TRACK_PADDING;
  const maxX = Math.max(restX, trackWidth - thumbWidth - TRACK_PADDING);
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
    const pointerOffsetFromThumbRight = e.clientX - trackRect.left - thumbWidth;
    const clamped = Math.max(restX, Math.min(maxX, restX + pointerOffsetFromThumbRight));
    setDraggingX(clamped);
  }, [draggingX, thumbWidth, restX, maxX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Confirm threshold: thumb must reach halfway through the gap.
    if (draggingX >= restX + gapWidth * 0.5) {
      setConfirmed(true);
      setDraggingX(maxX);
      onConfirm();
    } else {
      setDraggingX(null);
    }
  }, [draggingX, onConfirm, restX, gapWidth, maxX]);

  const thumbX = confirmed ? maxX : draggingX !== null ? draggingX : restX;
  const progress = gapWidth > 0 ? Math.max(0, Math.min(1, (thumbX - restX) / gapWidth)) : 0;
  const live = draggingX !== null && !confirmed;

  return (
    <>
      {chevronKeyframes}
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
          bgcolor: 'transparent',
          border: `2px solid ${disabled ? 'rgba(255,255,255,0.25)' : inkstashColors.brand}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          overflow: 'hidden',
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : (live ? 'grabbing' : 'grab'),
          opacity: disabled ? 0.55 : 1,
          userSelect: 'none',
        }}
      >
        {/* Fill — thin trail of solid brand red behind the thumb, only
            visible during the drag so the gap reads as "filling up". */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: thumbX + thumbWidth - 14,
            width: Math.max(0, maxX - thumbX + 14),
            bgcolor: inkstashColors.brand,
            opacity: progress * 0.7,
            transition: !live ? 'opacity 200ms ease-out' : 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Thumb */}
        <Box
          sx={{
            position: 'absolute',
            top: TRACK_PADDING,
            left: thumbX,
            height: TRACK_HEIGHT - TRACK_PADDING * 2,
            width: thumbWidth,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
            boxShadow: '0 6px 16px -4px rgba(161,35,44,0.6), inset 0 1px 0 rgba(255,255,255,0.25)',
            transition: !live
              ? 'left 220ms cubic-bezier(0.34, 1.4, 0.64, 1)'
              : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.005em',
            pointerEvents: 'none',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {confirmed ? (
            <>
              <Check size={18} strokeWidth={2.6} />
              <Box component="span">Bid placed</Box>
            </>
          ) : (
            <>
              <Box component="span">{label}</Box>
              {/* Two chevrons pulsing in sequence to invite the drag
                  — matches stream.css .slide-bid-thumb .chv (0.2s
                  stagger). Single ChevronsRight icon per slot; the
                  whole pair sits to the right of the bid label. */}
              <Box
                component="span"
                aria-hidden
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginLeft: '-4px',
                  '& > .inkstash-chv': {
                    display: 'inline-flex',
                    transformOrigin: 'center',
                    animation: 'inkstashChvWave 1.25s ease-in-out infinite',
                  },
                  '& > .inkstash-chv-a': { animationDelay: '0s' },
                  '& > .inkstash-chv-b': { animationDelay: '0.2s', marginLeft: '-10px' },
                }}
              >
                <Box component="span" className="inkstash-chv inkstash-chv-a">
                  <ChevronsRight size={18} strokeWidth={2.4} />
                </Box>
                <Box component="span" className="inkstash-chv inkstash-chv-b">
                  <ChevronsRight size={18} strokeWidth={2.4} />
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </>
  );
}
