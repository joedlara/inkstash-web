// src/components/livestreams/ViewerCountBadge.tsx
//
// Top-right pill showing the live viewer count. Editorial: brand-red bg,
// uppercase mono "LIVE" kicker beside the number. Pulses on count change.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Eye } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  count: number;
}

export default function ViewerCountBadge({ count }: Props) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 250);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        pl: 0.85,
        pr: 1,
        py: 0.5,
        // Mirror of HostPill's asymmetric pill so the corners point opposite
        // ways and the two clusters feel like brackets framing the video
        borderRadius: '14px 4px 4px 14px',
        bgcolor: inkstashColors.live,
        color: '#fff',
        boxShadow: '0 2px 0 #6F0E14, 0 6px 14px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.12)',
        transform: pulse ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 160ms ease-out',
      }}
    >
      <Eye size={12} strokeWidth={2.6} />
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}
