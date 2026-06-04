// src/components/creatorHub/panels/OverviewPanel.tsx
//
// "Home" panel — the landing surface when the user enters the hub.
// In this first commit it's an empty frame with the title + a Go Live
// CTA in the header. Real KPI tiles, recent activity, and shortcuts
// land in a later commit when the panel data is wired.

import { ButtonBase, Box, Typography } from '@mui/material';
import { Radio } from 'lucide-react';
import HubPanelFrame from '../HubPanelFrame';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  onGoLive: () => void;
}

export default function OverviewPanel({ onGoLive }: Props) {
  return (
    <HubPanelFrame
      eyebrow="Welcome back"
      title="Creator Home"
      sub="Your at-a-glance view of what's live, what's coming up, and what just sold."
      actions={(
        <ButtonBase
          onClick={onGoLive}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.85,
            height: 40,
            px: 2.25,
            borderRadius: 999,
            bgcolor: inkstashColors.brand,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.005em',
            transition: 'background-color 120ms ease, transform 120ms ease',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
            '&:active': { transform: 'translateY(1px)' },
          }}
        >
          <Radio size={16} strokeWidth={2.4} />
          Go live now
        </ButtonBase>
      )}
    >
      {/* Placeholder content. Real KPI grid + recent activity + shortcuts
          land in the next commit pass. */}
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
          Overview Coming Online
        </Typography>
        <Typography sx={{ fontFamily: inkstashFonts.ui, fontSize: 13, color: inkstashColors.muted }}>
          KPI tiles, recent activity, and quick actions will land here.
        </Typography>
      </Box>
    </HubPanelFrame>
  );
}
