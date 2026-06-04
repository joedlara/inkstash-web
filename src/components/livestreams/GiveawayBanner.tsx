// src/components/livestreams/GiveawayBanner.tsx
//
// Standalone rounded card that sits above the chat rail. Shows the current
// giveaway entry count and a chevron to expand/collapse details.
// Stubbed at 0 entries until L4 raffles ships; the click handler is a no-op
// for now but the structure is in place so L4 just wires real data + open
// state.

import { Box, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  entryCount?: number;
}

export default function GiveawayBanner({ entryCount = 0 }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        px: 1.5,
        py: 1.25,
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: 'inherit',
        cursor: 'pointer',
        transition: 'border-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
        '&:hover': { borderColor: inkstashColors.borderStrong },
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.85, minWidth: 0 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: inkstashColors.gold,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          🎁
        </Box>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            fontWeight: 700,
            color: inkstashColors.ink,
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Giveaway with {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
        </Typography>
      </Box>
      <ChevronDown size={18} color={inkstashColors.muted} />
    </Box>
  );
}
