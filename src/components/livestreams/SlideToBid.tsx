// src/components/livestreams/SlideToBid.tsx
//
// Drag-right-to-confirm bid pill. Replaces the tap-Bid button so a
// stray tap on the mobile auction card can't accidentally land a
// $1 bid — the user has to physically commit by dragging.
//
// Layout (per design ask):
//
//   ┌─────────────────────────────────────────┐
//   │ [  Bid $3                          »  ] │
//   └─────────────────────────────────────────┘
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ thumb (~75% wide pill)
//                                     ^^^^^^^ drag gap (~25%)
//
// The thumb itself is a brand-red pill carrying the bid label and a
// chevron-right indicator. User grabs it anywhere and drags it
// rightward into the 25% gap. Confirm threshold = halfway through the
// gap (so a flick lands the bid; an accidental tap does not).
//
// Pointer events (vs touch+mouse) cover both desktop drag and mobile
// drag with one code path. setPointerCapture keeps the drag alive
// even if the pointer leaves the pill bounds.

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
// Thumb occupies most of the track. The remaining strip on the right
// is the "commit zone" the user drags into. Ratio is the share of
// track width devoted to the thumb pill at rest.
const THUMB_RATIO = 0.75;

export default function SlideToBid({ label, onConfirm, disabled = false, busy = false }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [draggingX, setDraggingX] = useState<number | null>(null);
  // After confirm, briefly hold the thumb at the right end so the
  // checkmark is visible. Parent clears its busy state, which springs
  // the thumb back via the effect below.
  const [confirmed, setConfirmed] = useState(false);
  // Track width drives both thumb size and max drag distance. Update
  // on mount and on resize so the pill stays responsive (e.g. when
  // the BottomBar collapses and the layout reflows).
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

  const thumbWidth = Math.max(120, Math.floor(trackWidth * THUMB_RATIO));
  // Inset the thumb 2px from each edge so it sits nicely inside the
  // track border. maxDrag is how far the LEFT edge of the thumb can
  // travel from x=2 to x=(trackWidth - thumbWidth - 2).
  const restX = 2;
  const maxX = Math.max(restX, trackWidth - thumbWidth - 2);
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
    // Anchor the thumb so the pointer stays roughly in the middle of
    // the gap as it drags. Specifically: pointer x relative to the
    // RIGHT edge of the resting thumb position controls how far the
    // thumb has slid into the gap.
    const pointerOffsetFromGap = e.clientX - trackRect.left - thumbWidth;
    const clamped = Math.max(restX, Math.min(maxX, restX + pointerOffsetFromGap));
    setDraggingX(clamped);
  }, [draggingX, thumbWidth, restX, maxX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingX === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    // Confirm threshold: thumb must reach halfway through the drag
    // gap. The gap is only ~25% of track width so half-gap is a
    // small commit motion — fast for live auctions — but big enough
    // that an accidental tap (no movement) doesn't trigger.
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

  // Gap-fill progress (0..1) used to highlight the drag track behind
  // the thumb so it reads as "filling" while the user commits.
  const progress = gapWidth > 0 ? Math.max(0, Math.min(1, (thumbX - restX) / gapWidth)) : 0;

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
        // Track is a subtle dark slot. Brand-red lives on the thumb.
        bgcolor: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)',
        touchAction: 'none',  // prevent the page from scrolling while dragging
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Hint label in the gap — fades in slightly as the user grabs
          the thumb, fades out as they advance. Disappears completely
          once committed. */}
      <Typography
        sx={{
          position: 'absolute',
          right: 14, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          pointerEvents: 'none',
          opacity: confirmed ? 0 : Math.max(0, 1 - progress * 2),
          transition: draggingX === null ? 'opacity 200ms ease-out' : 'none',
        }}
      >
        Slide
      </Typography>

      {/* Progress trail — brand-red wash that fills as the thumb
          advances, so the gap reads as "filling up" behind the
          thumb. Sits between track and thumb. */}
      <Box
        sx={{
          position: 'absolute',
          top: 0, bottom: 0,
          left: thumbX + thumbWidth - 12,
          width: Math.max(0, (maxX - thumbX) + 12),
          bgcolor: inkstashColors.brand,
          opacity: 0.35 + progress * 0.4,
          transition: draggingX === null || confirmed
            ? 'opacity 200ms ease-out'
            : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Thumb — wide pill with label + chevron */}
      <Box
        sx={{
          position: 'absolute',
          top: 2,
          left: thumbX,
          height: TRACK_HEIGHT - 4,
          width: thumbWidth,
          borderRadius: 999,
          bgcolor: disabled ? 'rgba(255,255,255,0.18)' : inkstashColors.brand,
          background: disabled
            ? 'rgba(255,255,255,0.18)'
            : `linear-gradient(90deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          boxShadow: disabled
            ? 'none'
            : '0 6px 16px -4px rgba(161,35,44,0.55)',
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
            <Box component="span">Bid placed</Box>
          </>
        ) : (
          <>
            <Box component="span">{label}</Box>
            <ChevronsRight size={18} strokeWidth={2.4} />
          </>
        )}
      </Box>
    </Box>
  );
}
