// src/components/packs/CheckoutVendorPackModal.tsx
//
// Modal for vendor pack USD checkout. Opens over PackDetail when the user
// clicks "Buy with USD" on a vendor pack. Mirrors the RubyBundleModal
// UX pattern but stripped down — no bundle selection, one phase, just
// shows the pack summary + StripePaymentElement.
//
// On payment success, Stripe redirects via StripePaymentElement's
// confirmPayment(return_url), at which point the user lands back on
// PackDetail with ?reveal=pending. The modal will unmount mid-redirect.

import { Dialog, Box, IconButton, Typography, Alert } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useState } from 'react';
import StripePaymentElement from '../checkout/StripePaymentElement';
import type { Pack } from '../../api/packs';
import type { Vendor } from '../../api/vendors';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  pack: Pack;
  vendor: Vendor;
}

export default function CheckoutVendorPackModal({ open, onClose, pack, vendor }: Props) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: inkstashColors.muted,
          zIndex: 2,
          '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
        }}
      >
        <Close fontSize="small" />
      </IconButton>

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 22,
              color: inkstashColors.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              mb: 0.5,
            }}
          >
            Buy Pack
          </Typography>
          <Box
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 14,
              color: inkstashColors.ink,
              fontWeight: 600,
              mb: 0.25,
            }}
          >
            {pack.name}
          </Box>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              color: inkstashColors.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            From @{vendor.handle} · ${pack.price.toFixed(2)} USD
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ mb: 2, fontFamily: inkstashFonts.ui }}
          >
            {error}
          </Alert>
        )}

        <StripePaymentElement
          paymentType="vendor_pack"
          targetId={pack.id}
          buttonLabel={`Pay $${pack.price.toFixed(2)}`}
          returnUrl={(() => {
            const base = window.location.origin + window.location.pathname;
            const params = new URLSearchParams(window.location.search);
            params.set('reveal', 'pending');
            return `${base}?${params.toString()}`;
          })()}
          onError={(err) => setError(err.message)}
        />

        <Box
          sx={{
            mt: 2,
            fontFamily: inkstashFonts.mono,
            fontSize: 10,
            color: inkstashColors.muted,
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}
        >
          All purchases final. Pack will open on your next visit.
        </Box>
      </Box>
    </Dialog>
  );
}
