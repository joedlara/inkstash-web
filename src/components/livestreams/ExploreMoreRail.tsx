// src/components/livestreams/ExploreMoreRail.tsx
//
// Desktop-only horizontal scroller of other live streams beneath the
// 3-panel stream surface. Per docs/design-system/claude-design/
// live_stream/stream.css :: .explore.
//
// Hidden in tablet/mobile/fullscreen states — those layouts use the
// whole viewport for the video + chat overlay.
//
// Reuses MomentumCard since the spec's `.ecard` shape is essentially the
// same as `.mcard` (host row above thumb, 4:5 ratio, title+tag row).
// Excludes the current stream from the rail so the viewer can't "jump"
// back to themselves.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { livestreamsAPI, type Livestream } from '../../api/livestreams';
import MomentumCard from './MomentumCard';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** The current stream id; excluded from the rail. */
  excludeId: string;
}

export default function ExploreMoreRail({ excludeId }: Props) {
  const [streams, setStreams] = useState<Livestream[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Reuse the same sections endpoint /live uses; combine live +
      // featured for variety, dedupe by id, drop the current stream.
      const sections = await livestreamsAPI.listSections();
      if (cancelled) return;
      const seen = new Set<string>([excludeId]);
      const combined: Livestream[] = [];
      for (const s of [...sections.featured, ...sections.live]) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        combined.push(s);
        if (combined.length >= 10) break;
      }
      setStreams(combined);
    })();
    return () => { cancelled = true; };
  }, [excludeId]);

  if (streams.length === 0) return null;

  return (
    <Box sx={{ pt: 3, pb: 1 }}>
      <Typography
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 22,
          color: inkstashColors.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          mb: 2,
          lineHeight: 1,
        }}
      >
        Explore More Shows
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: { xs: 168, sm: 196 },
          gap: 2,
          overflowX: 'auto',
          pb: 1.25,
          mx: -0.5,
          px: 0.5,
          scrollSnapType: 'x mandatory',
          '& > *': { scrollSnapAlign: 'start' },
          // Light-page-tinted scrollbar so it sits with the section
          scrollbarWidth: 'thin',
          scrollbarColor: `${inkstashColors.borderStrong} transparent`,
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: inkstashColors.borderStrong,
            borderRadius: 999,
          },
        }}
      >
        {streams.map((s) => <MomentumCard key={s.id} stream={s} variant="light" />)}
      </Box>
    </Box>
  );
}
