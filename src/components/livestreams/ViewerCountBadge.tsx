// src/components/livestreams/ViewerCountBadge.tsx
//
// Top-right pill showing the live viewer count. Brand-red bg, eye icon +
// number. Animates a single-frame scale pulse when the count changes so a
// joining viewer feels noticed without being annoying.

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
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: 999,
        bgcolor: inkstashColors.live,
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        transform: pulse ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 160ms ease-out',
      }}
    >
      <Eye size={13} strokeWidth={2.5} />
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
