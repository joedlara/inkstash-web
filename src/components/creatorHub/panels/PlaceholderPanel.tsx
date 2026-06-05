// src/components/creatorHub/panels/PlaceholderPanel.tsx
//
// Stub panel used by every hub tab whose real implementation hasn't
// landed yet. Each tab gets its title + eyebrow + a clear "coming online"
// hint so the rail is fully clickable from day one.

import { Box, Typography } from '@mui/material';
import HubPanelFrame from '../HubPanelFrame';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  eyebrow?: string;
  title: string;
  sub?: string;
}

export default function PlaceholderPanel({ eyebrow, title, sub }: Props) {
  return (
    <HubPanelFrame eyebrow={eyebrow} title={title} sub={sub}>
      <Box
        sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px dashed ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          p: 6,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 18,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            color: inkstashColors.ink,
            mb: 1,
          }}
        >
          Coming Online
        </Typography>
        <Typography sx={{ fontFamily: inkstashFonts.ui, fontSize: 13, color: inkstashColors.muted }}>
          This panel ships in a follow-up commit.
        </Typography>
      </Box>
    </HubPanelFrame>
  );
}
