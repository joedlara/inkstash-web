// src/components/livestreams/WalletDrawer.tsx
//
// Right-rail "Wallet" popover. Anchored to the rail Wallet chip so it
// floats next to the button instead of taking over the bottom of the
// screen. Surfaces saved-payment-method count at a glance; CTA opens
// /settings for full management.

import { Popover, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Element to anchor the popover next to. When null, the popover hides. */
  anchorEl: HTMLElement | null;
}

export default function WalletDrawer({ open, onClose, anchorEl }: Props) {
  const navigate = useNavigate();

  return (
    <Popover
      open={open && !!anchorEl}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
      transformOrigin={{ vertical: 'center', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            // Slight gap from the anchor so the popover doesn't kiss the
            // button. Negative right margin pulls back from the rail.
            mr: 1.5,
            width: 280,
            bgcolor: inkstashColors.bgElev,
            borderRadius: inkstashRadii.md,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            border: `1px solid ${inkstashColors.border}`,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 15,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            mb: 1,
            color: inkstashColors.ink,
          }}
        >
          Wallet
        </Typography>
        <Typography sx={{ fontSize: 12, color: inkstashColors.muted, mb: 1.5, lineHeight: 1.5 }}>
          Manage payment methods used for stream purchases and auctions.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.5,
            borderRadius: inkstashRadii.sm,
            border: `1px solid ${inkstashColors.border}`,
            mb: 1.5,
            color: inkstashColors.ink,
          }}
        >
          <CreditCard size={18} />
          <Typography sx={{ fontFamily: inkstashFonts.ui, fontSize: 13, fontWeight: 600 }}>
            View saved cards
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            fontWeight: 800,
            py: 1,
            fontSize: 12.5,
            textTransform: 'uppercase',
            fontFamily: inkstashFonts.ui,
            letterSpacing: '0.06em',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
          }}
        >
          Open settings
        </Button>
      </Box>
    </Popover>
  );
}
