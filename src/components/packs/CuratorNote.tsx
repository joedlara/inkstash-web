// src/components/packs/CuratorNote.tsx
import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  note: string;
  vendorName: string;
}

export default function CuratorNote({ note, vendorName }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        my: 3,
        py: 2.5,
        px: 3,
        borderLeft: `3px solid ${inkstashColors.brand}`,
        bgcolor: inkstashColors.bgSunken,
        borderRadius: '0 4px 4px 0',
      }}
    >
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 1,
        }}
      >
        Curator's note · {vendorName}
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 14,
          fontStyle: 'italic',
          color: inkstashColors.ink,
          lineHeight: 1.55,
        }}
      >
        {note}
      </Box>
    </Box>
  );
}
