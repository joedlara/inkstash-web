// src/components/livestreams/WalletDrawer.tsx
//
// Right-rail "Wallet" placeholder drawer. Surfaces the user's saved payment
// methods at a glance (count for now; cards detail in L2 when the auction
// auto-charge flow needs it). CTA links out to /settings for full management.

import { Drawer, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WalletDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: inkstashColors.bgElev,
          borderTopLeftRadius: inkstashRadii.lg,
          borderTopRightRadius: inkstashRadii.lg,
          pb: 'max(env(safe-area-inset-bottom), 16px)',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 18,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            mb: 1,
          }}
        >
          Wallet
        </Typography>
        <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 3 }}>
          Manage payment methods used for stream purchases and auctions.
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: inkstashRadii.md,
            border: `1px solid ${inkstashColors.border}`,
            mb: 2,
          }}
        >
          <CreditCard size={20} />
          <Typography sx={{ fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 600 }}>
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
            py: 1.3,
            textTransform: 'uppercase',
            fontFamily: inkstashFonts.ui,
            letterSpacing: '0.06em',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
          }}
        >
          Open settings
        </Button>
        <Button
          fullWidth
          onClick={onClose}
          sx={{
            mt: 1,
            py: 1.2,
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: inkstashColors.muted,
          }}
        >
          Cancel
        </Button>
      </Box>
    </Drawer>
  );
}
