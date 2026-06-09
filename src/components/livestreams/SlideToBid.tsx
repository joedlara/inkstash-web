// src/components/livestreams/SlideToBid.tsx
//
// Drag-right-to-confirm bid pill, Whatnot-style. The outer track is
// an outlined pill (crimson border, transparent fill so the camera
// reads through). A smaller solid-crimson pill carries the bid label
// and slides inside the outer pill. User drags the inner pill to the
// right edge to confirm.
//
// Layout:
//
//   ┌─────────────────────────────────────────┐  <- outer pill (crimson border)
//   │ ╭─────────────────╮                     │
//   │ │  Bid $9    »»   │       (gap)         │
//   │ ╰─────────────────╯                     │
//   └─────────────────────────────────────────┘
//      ^^^^^^^^^^^^^^^^^^^^ inner pill (solid crimson, draggable)
//                          ^^^^^^^^^^^^^^^^^^^ commit gap (transparent)
//
// Pointer Events cover desktop + mobile in one code path.
// setPointerCapture keeps the drag alive even if the pointer leaves
// the pill bounds.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
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

const TRACK_HEIGHT = 52;
// Padding INSIDE the outer pill (matches Whatnot). Keeps the inner
// pill from kissing the border.
const TRACK_PADDING = 4;
// Inner pill width as a share of the inner usable width. ~70% leaves
// a comfortable commit gap on the right.
const THUMB_RATIO = 0.7;

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

  // Inner geometry. The thumb travels between restX and maxX inside
  // the padded inner region.
  const innerWidth = Math.max(0, trackWidth - TRACK_PADDING * 2);
  const thumbWidth = Math.max(120, Math.floor(innerWidth * THUMB_RATIO));
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
    // Anchor the right edge of the thumb to the pointer so the
    // chevron tracks the finger as it advances into the gap.
    const pointerOffsetFromThumbRight = e.clientX - trackRect.left - thumbWidth;
    const clamped = Math.max(restX, Math.min(maxX, restX + pointerOffsetFromThumbRight));
    setDraggingX(clamped);
  }, [draggingX, thumbWidth, restX, maxX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Confirm threshold: thumb must reach halfway through the
    // commit gap. Small motion in absolute terms, but big enough
    // that a stationary tap (zero motion) cannot clear it.
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

  return (
    <Box
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{
        position: 'relative',
        width: '100%',
        height: TRACK_HEIGHT,
        borderRadius: 999,
        // Outlined pill: crimson border, transparent fill so the
        // background reads through. Matches the Whatnot reference.
        bgcolor: 'transparent',
        border: `2px solid ${disabled ? 'rgba(255,255,255,0.25)' : inkstashColors.brand}`,
        touchAction: 'none',  // prevent the page from scrolling while dragging
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Inner pill — solid crimson, carries the label + chevrons,
          slides within the outer pill. */}
      <Box
        sx={{
          position: 'absolute',
          top: TRACK_PADDING,
          left: thumbX,
          height: TRACK_HEIGHT - TRACK_PADDING * 2,
          width: thumbWidth,
          borderRadius: 999,
          bgcolor: disabled ? 'rgba(255,255,255,0.18)' : inkstashColors.brand,
          background: disabled
            ? 'rgba(255,255,255,0.18)'
            : `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          boxShadow: disabled
            ? 'none'
            : '0 4px 14px -4px rgba(161,35,44,0.55)',
          // While dragging we want zero transition (1:1 finger tracking).
          // On release with no confirm OR when label changes, spring back.
          transition: draggingX === null || confirmed
            ? 'left 200ms cubic-bezier(0.34, 1.4, 0.64, 1)'
            : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.85,
          color: '#fff',
          fontFamily: inkstashFonts.ui,
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '0.005em',
          pointerEvents: 'none',
        }}
      >
        {confirmed ? (
          <>
            <Check size={18} strokeWidth={2.6} />
            <Typography component="span" sx={{ fontWeight: 800, fontSize: 15 }}>Bid placed</Typography>
          </>
        ) : (
          <>
            <Typography component="span" sx={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>
              {label}
            </Typography>
            <ChevronsRight size={18} strokeWidth={2.4} />
          </>
        )}
      </Box>
    </Box>
  );
}
