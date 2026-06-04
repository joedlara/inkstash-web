// src/components/livestreams/FeaturedBreaksBand.tsx
//
// Dark "momentum" rail on /live. Per docs/design-system/claude-design/
// live_breaks/breaks.css :: .featured-band:
//   - Radial highlight at 85% 0% (brand-tinted) + vertical linear fade
//     from #201813 -> #16110E (warmer than flat ink)
//   - 1px #2C231D edge so the band lifts off the cream page
//   - Display header + light sub-line + light "Show all" link on the right
//   - Horizontal carousel of MomentumCards with side arrows
//     (arrows disable + fade out at the scroll bounds; hidden < 560px)

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Livestream } from '../../api/livestreams';
import MomentumCard from './MomentumCard';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  label: string;
  sub?: string;
  streams: Livestream[];
}

export default function FeaturedBreaksBand({ label, sub, streams }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ atStart: true, atEnd: false });

  const updateBounds = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setBounds({
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [updateBounds, streams.length]);

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // Page by ~85% of the visible width or 460px, whichever is smaller.
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 460), behavior: 'smooth' });
  };

  if (streams.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 4,
        p: { xs: 2.5, md: '26px 26px 28px' },
        borderRadius: inkstashRadii.xl,
        border: '1px solid #2C231D',
        background: `
          radial-gradient(600px 300px at 85% 0%, rgba(161,35,44,0.16), transparent 60%),
          linear-gradient(180deg, #201813 0%, #16110E 100%)
        `,
      }}
    >
      {/* Band header — display label, light sub, light "Show all" link */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2.5,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 'clamp(22px, 2.4vw, 28px)',
              color: '#FAF7F2',
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
              lineHeight: 1,
            }}
          >
            {label}
          </Typography>
          {sub && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.ui,
                fontSize: 13,
                color: '#A89A8A',
                mt: 0.75,
              }}
            >
              {sub}
            </Typography>
          )}
        </Box>
        <Box
          component="button"
          sx={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            fontFamily: inkstashFonts.ui,
            color: '#EAD9C6',
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'color 120ms ease',
            '&:hover': { color: '#fff' },
          }}
        >
          Show all →
        </Box>
      </Box>

      {/* Rail (relative wrapper for the absolute arrows) */}
      <Box sx={{ position: 'relative' }}>
        <ArrowButton
          direction="left"
          disabled={bounds.atStart}
          onClick={() => scrollRail(-1)}
        />
        <Box
          ref={railRef}
          onScroll={updateBounds}
          sx={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: { xs: '178px', sm: '216px' },
            gap: 2,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            padding: '2px 4px 8px',
            mx: -0.5,
            '& > *': { scrollSnapAlign: 'start' },
            // Custom scrollbar tinted for the dark band
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.22) transparent',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.22)',
              borderRadius: 999,
            },
          }}
        >
          {streams.map((s) => <MomentumCard key={s.id} stream={s} />)}
        </Box>
        <ArrowButton
          direction="right"
          disabled={bounds.atEnd}
          onClick={() => scrollRail(1)}
        />
      </Box>
    </Box>
  );
}

function ArrowButton({
  direction, disabled, onClick,
}: {
  direction: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      sx={{
        position: 'absolute',
        top: '46%',
        transform: 'translateY(-50%)',
        [direction === 'left' ? 'left' : 'right']: -12,
        width: 42,
        height: 42,
        bgcolor: 'rgba(14,10,8,0.82)',
        border: '1px solid rgba(255,255,255,0.22)',
        color: '#FAF7F2',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
        zIndex: 6,
        transition: 'background 120ms ease, opacity 180ms ease, transform 120ms ease',
        '&:hover': {
          bgcolor: 'rgba(14,10,8,0.96)',
          transform: 'translateY(-50%) scale(1.06)',
        },
        '&.Mui-disabled': {
          opacity: 0,
          pointerEvents: 'none',
        },
        // Hide arrows on small screens — touch-scroll only
        display: { xs: 'none', sm: 'inline-flex' },
      }}
    >
      {direction === 'left' ? <ChevronLeft size={20} strokeWidth={2.2} /> : <ChevronRight size={20} strokeWidth={2.2} />}
    </IconButton>
  );
}
