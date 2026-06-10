// src/components/livestreams/SpeedLinesEffect.tsx
//
// Manga-style radial focus burst that fires once when the on-block lot
// flips to sold. Two layered conic-gradient sunbursts (white over crimson)
// scale in, hold, then fade. ~1.6s total. Pure CSS — no JS animation.
//
// Reduced motion: render null. The win banner alone is enough; we don't
// want flashing radials when the user has asked the OS to dial things back.
//
// Visual spec: docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.speedlines-layer + .speedlines-layer::before/::after + @keyframes speedLines).
//
// Self-mounts via the same livestream_items realtime watch the banner uses
// — both components will trigger on the same sold transition, in sync.

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

const ACTIVE_MS = 1750;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function SpeedLinesEffect({ livestreamId }: Props) {
  // Each play is keyed so React mounts a fresh element pair — this
  // restarts the CSS animation cleanly (animations don't replay on
  // the same node even with `forwards`).
  const [playKey, setPlayKey] = useState(0);
  const [active, setActive] = useState(false);
  const playedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (prefersReducedMotion()) return;

    function fire() {
      setPlayKey((n) => n + 1);
      setActive(true);
      window.setTimeout(() => setActive(false), ACTIVE_MS);
    }

    const channel = supabase
      .channel(`speed_lines:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        (payload) => {
          const next = (payload.new ?? {}) as { id?: string; status?: string };
          if (!next.id) return;
          if (next.status !== 'sold' && next.status !== 'sold_pending_payment') return;
          if (playedRef.current.has(next.id)) return;
          playedRef.current.add(next.id);
          fire();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [livestreamId]);

  // Reduced motion = nothing renders. The banner alone celebrates.
  if (prefersReducedMotion()) return null;
  if (!active) return null;

  const crimson = inkstashColors.brand;

  return (
    <Box
      key={playKey}
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        // Speed lines sit ABOVE the auction block (z-index 6 in spec)
        // but below the banner (z-index 7) so the lines don't obscure
        // the celebration text.
        zIndex: 6,
        pointerEvents: 'none',
        overflow: 'hidden',
        // Both ::before and ::after pseudo-elements are absolutely
        // positioned full bleed with a 22% bleed-out so the rotated
        // gradient doesn't expose edges as it scales.
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          inset: '-22%',
          transformOrigin: '50% 46%',
          opacity: 0,
          willChange: 'transform, opacity',
        },
        // Layer 1 — white radial sunburst. Wider, brighter, leads the burst.
        '&::before': {
          background:
            'repeating-conic-gradient(from 0deg at 50% 46%, ' +
            'rgba(255,255,255,0) 0deg, rgba(255,255,255,0.5) 0.55deg, ' +
            'rgba(255,255,255,0) 1.15deg, rgba(255,255,255,0) 2.5deg)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 24%, #000 60%)',
          maskImage: 'radial-gradient(circle at 50% 46%, transparent 24%, #000 60%)',
          animation: 'speedLinesInk 1.6s ease-out forwards',
        },
        // Layer 2 — crimson sunburst, slightly tighter mask, 40ms lag.
        // The two-tone effect reads as a brand-colored shockwave.
        '&::after': {
          background:
            'repeating-conic-gradient(from 0.9deg at 50% 46%, ' +
            `rgba(${hexToRgb(crimson)},0) 0deg, rgba(${hexToRgb(crimson)},0.4) 0.4deg, ` +
            `rgba(${hexToRgb(crimson)},0) 0.9deg, rgba(${hexToRgb(crimson)},0) 3.2deg)`,
          WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 30%, #000 66%)',
          maskImage: 'radial-gradient(circle at 50% 46%, transparent 30%, #000 66%)',
          animation: 'speedLinesInk 1.7s ease-out 0.04s forwards',
        },
        '@keyframes speedLinesInk': {
          '0%':   { opacity: 0, transform: 'scale(1.28) rotate(0deg)' },
          '15%':  { opacity: 1, transform: 'scale(1) rotate(2deg)' },
          '70%':  { opacity: 0.85 },
          '100%': { opacity: 0, transform: 'scale(1.05) rotate(3deg)' },
        },
      }}
    />
  );
}

// Tiny inline #RRGGBB → "r,g,b" helper so the conic-gradient can stay
// alpha-controlled per stop. Keeps inkstashColors.brand as the single
// source of truth for the crimson without hardcoding "161,35,44" twice.
function hexToRgb(hex: string): string {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
