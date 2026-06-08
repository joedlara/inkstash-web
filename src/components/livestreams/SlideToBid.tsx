// src/components/livestreams/SlideToBid.tsx
//
// Drag-right-to-confirm bid pill. Replaces the tap-Bid button so a
// stray tap on the mobile auction card can't accidentally land a
// $1 bid — the user has to physically commit by dragging the thumb
// from left to right.
//
// Visual: brand-red pill with a white circular thumb on the left.
// Label "Bid $X" floats centered in the track and fades as the
// thumb covers it. On release before the end, the thumb springs
// back (200ms ease-out). On reaching the right edge, fires
// onConfirm and disables briefly while the parent processes the bid.
//
// Pointer events (vs touch+mouse) covers both desktop drag and
// mobile drag with one code path. setPointerCapture keeps the
// drag alive even if the pointer leaves the pill bounds.

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

const THUMB_SIZE = 44;
const TRACK_HEIGHT = 52;

export default function SlideToBid({ label, onConfirm, disabled = false, busy = false }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draggingX, setDraggingX] = useState<number | null>(null);
  // After confirm, briefly hold the thumb at the right end so the
  // checkmark is visible. Parent clears its busy state, which springs
  // the thumb back via the effect below.
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!busy) setConfirmed(false);
  }, [busy]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;
    const localX = e.clientX - trackRect.left - THUMB_SIZE / 2;
    setDraggingX(clampDrag(localX, trackRect.width));
  }, [disabled, busy]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    const trackRect = trackRef.current?.getBoundingClientRect();
    if (!trackRect) return;
    const localX = e.clientX - trackRect.left - THUMB_SIZE / 2;
    setDraggingX(clampDrag(localX, trackRect.width));
  }, [draggingX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const trackRect = trackRef.current?.getBoundingClientRect();
    const max = trackRect ? trackRect.width - THUMB_SIZE - 4 : 0;
    // Confirm threshold: thumb must reach ~55% of the way. Every
    // second counts in live auctions — bumping this lower means a
    // quick flick lands the bid instead of forcing a full-width
    // drag. Still high enough that an accidental tap doesn't cross
    // it (a stationary press leaves the thumb near 0).
    if (draggingX >= max * 0.55) {
      setConfirmed(true);
      setDraggingX(max);
      onConfirm();
    } else {
      setDraggingX(null);
    }
  }, [draggingX, onConfirm]);

  // Reset thumb position when the label changes (e.g. price went up
  // after our bid landed — the next bid starts from the left again).
  useEffect(() => {
    if (!busy) setDraggingX(null);
  }, [label, busy]);

  const thumbX = confirmed
    ? '100%'
    : draggingX !== null
      ? `${draggingX}px`
      : '2px';

  // Label opacity fades from 1 at thumb=0 to 0 when the thumb is
  // ~halfway across, so the text doesn't fight the thumb visually.
  let labelOpacity = 1;
  if (confirmed) labelOpacity = 0;
  else if (draggingX !== null && trackRef.current) {
    const trackWidth = trackRef.current.clientWidth;
    labelOpacity = Math.max(0, 1 - (draggingX / (trackWidth * 0.5)));
  }

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
        bgcolor: disabled
          ? 'rgba(255,255,255,0.16)'
          : `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
        background: disabled
          ? 'rgba(255,255,255,0.16)'
          : `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
        boxShadow: disabled
          ? 'none'
          : '0 10px 24px -8px rgba(161,35,44,0.65)',
        touchAction: 'none',  // prevent the page from scrolling while dragging
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Centered label — fades as the thumb advances. */}
      <Typography
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: inkstashFonts.ui,
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '0.01em',
          pointerEvents: 'none',
          opacity: labelOpacity,
          transition: draggingX === null ? 'opacity 200ms ease-out' : 'none',
        }}
      >
        {label}
      </Typography>

      {/* Thumb */}
      <Box
        sx={{
          position: 'absolute',
          top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
          left: thumbX,
          // While dragging we want zero transition (1:1 finger tracking).
          // On release with no confirm OR when label changes, we want a
          // spring-back. confirmed state holds at 100%.
          transition: draggingX === null || confirmed
            ? 'left 200ms cubic-bezier(0.34, 1.4, 0.64, 1)'
            : 'none',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          bgcolor: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: inkstashColors.brand,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}
      >
        {confirmed
          ? <Check size={20} strokeWidth={2.6} />
          : <ChevronsRight size={20} strokeWidth={2.4} />}
      </Box>
    </Box>
  );
}

function clampDrag(x: number, trackWidth: number): number {
  const max = trackWidth - THUMB_SIZE - 4;
  if (x < 2) return 2;
  if (x > max) return max;
  return x;
}
