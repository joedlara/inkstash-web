// src/components/livestreams/host/EndStreamConfirmModal.tsx
//
// Two-tap confirmation so a misplaced finger doesn't kill a live stream.
// "End the stream? You'll have to start a new one to broadcast again."

import { Dialog, Box, Typography, Button } from '@mui/material';
import { inkstashColors, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  ending?: boolean;
}

export default function EndStreamConfirmModal({ open, onCancel, onConfirm, ending = false }: Props) {
  return (
    <Dialog
      open={open}
      onClose={ending ? undefined : onCancel}
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          maxWidth: 360,
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 20,
            fontWeight: 900,
            color: inkstashColors.ink,
            letterSpacing: '-0.02em',
            mb: 1,
          }}
        >
          End the stream?
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13.5,
            color: inkstashColors.muted,
            letterSpacing: '-0.005em',
            lineHeight: 1.5,
            mb: 3,
          }}
        >
          Viewers will be sent back to the live list. You'll have to start a new stream to broadcast again.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={onCancel}
            disabled={ending}
            fullWidth
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'none',
              letterSpacing: '-0.005em',
              color: inkstashColors.ink,
              bgcolor: inkstashColors.bgSunken,
              borderRadius: 999,
              py: 1.1,
              '&:hover': { bgcolor: inkstashColors.border },
            }}
          >
            Keep streaming
          </Button>
          <Button
            onClick={onConfirm}
            disabled={ending}
            fullWidth
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 800,
              textTransform: 'none',
              letterSpacing: '-0.005em',
              color: '#fff',
              bgcolor: inkstashColors.live,
              borderRadius: 999,
              py: 1.1,
              '&:hover': { bgcolor: '#B91C1C' },
              '&.Mui-disabled': { bgcolor: inkstashColors.muted, color: '#fff' },
            }}
          >
            {ending ? 'Ending…' : 'End stream'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
