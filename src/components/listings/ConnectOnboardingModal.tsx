// src/components/listings/ConnectOnboardingModal.tsx
//
// Stripe Connect Express onboarding launcher. Opens when a user wants to
// list something but seller_status !== 'active'.
//
// Calls sellersAPI.initiateConnectOnboarding() to get the Stripe onboarding URL
// (the edge function creates the Connect account if needed) and opens it in
// the same tab. After Stripe-side completion, the webhook flips seller_status
// to 'active' (assuming the Connect-mode webhook config is in place — see
// M1 PR description for the known operational gotcha).

import { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { sellersAPI } from '../../api/sellers';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ConnectOnboardingModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const result = await sellersAPI.initiateConnectOnboarding();
      // Redirect in the same tab — Stripe's hosted onboarding works best when
      // the parent context is the seller's session.
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start verification');
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
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
      {!loading && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: inkstashColors.muted,
            '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 22,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 1,
          }}
        >
          Verify to start selling
        </Typography>

        <Typography sx={{ color: inkstashColors.ink, fontSize: 14, mb: 2.5 }}>
          To list items on InkStash, you need to verify with Stripe (~5 minutes).
          This is the same verification banks use — it confirms your identity
          and connects your payout bank account.
        </Typography>

        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 2,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: 12, color: inkstashColors.muted, mb: 1, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What you'll need
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, m: 0, color: inkstashColors.ink, fontSize: 13, lineHeight: 1.8 }}>
            <li>Government-issued ID (driver's license or passport)</li>
            <li>Social Security Number (last 4 digits accepted)</li>
            <li>Bank account for payouts (routing + account number)</li>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleStart}
          disabled={loading}
          endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <OpenInNew fontSize="small" />}
          sx={{ py: 1.4, fontWeight: 700 }}
        >
          {loading ? 'Opening Stripe...' : 'Start verification'}
        </Button>

        <Typography sx={{ mt: 2, fontSize: 11, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          You'll be redirected to Stripe's secure verification flow.
        </Typography>
      </Box>
    </Dialog>
  );
}
