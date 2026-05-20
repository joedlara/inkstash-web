// src/components/home/RarityDots.tsx
import { Box } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface RarityDotsProps {
  filled?: number;
}

export default function RarityDots({ filled = 4 }: RarityDotsProps) {
  return (
    <Box sx={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Box
          key={i}
          sx={{
            width: 6, height: 6, borderRadius: '50%',
            bgcolor: i < filled ? inkstashColors.brand : inkstashColors.muted2,
          }}
        />
      ))}
    </Box>
  );
}
