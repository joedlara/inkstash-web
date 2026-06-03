// src/components/livestreams/LiveStreamSection.tsx
//
// Horizontally scrolling row of stream tiles, used by /live to render each
// section (Live now / Coming up / Featured). Matches the WhatNot section
// pattern: kicker header + "Show all" link on the right, snap-scrolling
// tile carousel below.

import { Box, Typography } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import type { Livestream } from '../../api/livestreams';
import LiveStreamCard from './LiveStreamCard';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  label: string;
  streams: Livestream[];
  emptyHint?: string;
  /** Render a "starts in 5m" countdown instead of the live progress bar. */
  scheduled?: boolean;
}

export default function LiveStreamSection({ label, streams, emptyHint, scheduled = false }: Props) {
  if (streams.length === 0 && !emptyHint) return null;

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          mb: 1.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: { xs: 18, md: 22 },
            color: inkstashColors.ink,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
        {streams.length > 0 && (
          <Box
            component="button"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.25,
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              color: inkstashColors.muted,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              p: 0,
              '&:hover': { color: inkstashColors.brand },
            }}
          >
            Show all <ChevronRight size={14} strokeWidth={2.4} />
          </Box>
        )}
      </Box>

      {/* Empty state for the section */}
      {streams.length === 0 && emptyHint && (
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            color: inkstashColors.muted,
            py: 2,
          }}
        >
          {emptyHint}
        </Typography>
      )}

      {/* Horizontal scroll row */}
      {streams.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            // Hide scrollbar — the row should feel like a carousel, not a
            // div with a scroll thumb hanging off the bottom.
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Negative side margin + matching padding so the first/last
            // tiles can scroll flush to the page edge without clipping
            // their hover shadow.
            mx: -1,
            px: 1,
            pb: 1,
          }}
        >
          {streams.map((s) => (
            <Box
              key={s.id}
              sx={{
                flexShrink: 0,
                width: { xs: 160, sm: 180, md: 200 },
                scrollSnapAlign: 'start',
              }}
            >
              <LiveStreamCard stream={s} scheduled={scheduled} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
