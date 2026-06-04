// src/components/livestreams/ScheduledRow.tsx
//
// "Coming Up" section frame: shares the same header treatment as
// LiveStreamSection (display label + sub + right-side link) but renders a
// 2-column SchedCard grid (collapses to 1 column <= 760px), per
// docs/design-system/claude-design/live_breaks/breaks.css :: .sched-grid.

import { Box, Typography } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import type { Livestream } from '../../api/livestreams';
import SchedCard from './SchedCard';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  label: string;
  sub?: string;
  streams: Livestream[];
  emptyHint?: string;
  /** Right-side link copy. Defaults to 'Full schedule →' per the spec. */
  linkLabel?: string;
}

export default function ScheduledRow({
  label, sub, streams, emptyHint, linkLabel = 'Full schedule →',
}: Props) {
  if (streams.length === 0 && !emptyHint) return null;

  return (
    <Box sx={{ mb: 4 }}>
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
              color: inkstashColors.ink,
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
                color: inkstashColors.muted,
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
              color: inkstashColors.muted,
              fontFamily: inkstashFonts.ui,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.005em',
              p: 0,
              '&:hover': { color: inkstashColors.brand },
            }}
          >
            {linkLabel.replace('→', '').trim()} <ChevronRight size={14} strokeWidth={2.4} />
          </Box>
        )}
      </Box>

      {streams.length === 0 && emptyHint && (
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            color: inkstashColors.muted,
            py: 2,
          }}
        >
          {emptyHint}
        </Typography>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {streams.map((s) => <SchedCard key={s.id} stream={s} />)}
      </Box>
    </Box>
  );
}
