// src/components/livestreams/ViewerCountBadge.tsx
//
// Top-right pill showing the live viewer count. Brand-red bg + tabular
// number. Subtle scale pulse on count change.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Eye } from 'lucide-react';
import { inkstashColors , inkstashFonts} from '../../theme/inkstashTokens';

interface Props {
  count: number;
}

export default function ViewerCountBadge({ count }: Props) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 200);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        pl: 1,
        pr: 1.1,
        py: 0.5,
        borderRadius: 999,
        bgcolor: inkstashColors.live,
        color: '#fff',
        boxShadow: '0 4px 12px rgba(220,38,38,0.35)',
        transform: pulse ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      <Eye size={13} strokeWidth={2.5} />
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}
