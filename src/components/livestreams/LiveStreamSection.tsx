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
import { inkstashColors , inkstashFonts} from '../../theme/inkstashTokens';

interface Props {
  label: string;
  /** Sub-line under the label — design spec: 13px muted body. */
  sub?: string;
  streams: Livestream[];
  emptyHint?: string;
  /** Render a countdown-style pill on the tile instead of the Live pill. */
  scheduled?: boolean;
  /** Wrap the section in a charcoal panel and switch tile bodies to dark.
   *  Used by the Featured row so it visually pops against the cream page. */
  dark?: boolean;
}

export default function LiveStreamSection({
  label, sub, streams, emptyHint, scheduled = false, dark = false,
}: Props) {
  if (streams.length === 0 && !emptyHint) return null;

  const headerColor = dark ? '#fff' : inkstashColors.ink;
  const linkColor = dark ? 'rgba(255,255,255,0.6)' : inkstashColors.muted;

  const inner = (
    <>
      {/* Header — display font label + optional muted sub-line. Right side
          carries the "Show all" control. Design spec: align-items end. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: { xs: 22, md: 28 },
              color: headerColor,
              letterSpacing: '-0.005em',
              lineHeight: 1,
              textTransform: 'uppercase',
              mb: sub ? 0.5 : 0,
            }}
          >
            {label}
          </Typography>
          {sub && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.ui,
                fontSize: 13,
                color: dark ? 'rgba(255,255,255,0.62)' : inkstashColors.muted,
                lineHeight: 1.5,
                maxWidth: 440,
              }}
            >
              {sub}
            </Typography>
          )}
        </Box>
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
              color: linkColor,
              fontFamily: inkstashFonts.ui,
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
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            color: linkColor,
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
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
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
              <LiveStreamCard
                stream={s}
                scheduled={scheduled}
                variant={dark ? 'dark' : 'light'}
              />
            </Box>
          ))}
        </Box>
      )}
    </>
  );

  if (dark) {
    return (
      <Box
        sx={{
          mb: 4,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          bgcolor: '#16110E', // ink — matches the rest of the brand palette
        }}
      >
        {inner}
      </Box>
    );
  }
  return <Box sx={{ mb: 4 }}>{inner}</Box>;
}
