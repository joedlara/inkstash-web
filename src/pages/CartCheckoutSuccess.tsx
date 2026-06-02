// src/pages/CartCheckoutSuccess.tsx
//
// Landing page after Stripe confirmPayment. Polls order_groups until the
// webhook flips status from 'pending' to 'paid' (or paid variants). Then
// redirects to /order-group/:id for the full summary.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import { supabase } from '../api/supabase/supabaseClient';
import { useCart } from '../contexts/CartContext';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20; // ~30s

export default function CartCheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const groupId = searchParams.get('order_group_id');

  const [status, setStatus] = useState<'polling' | 'paid' | 'timeout' | 'error'>('polling');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setStatus('error');
      setErrorMsg('Missing order_group_id in URL.');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;

      const { data, error } = await supabase
        .from('order_groups')
        .select('status')
        .eq('id', groupId)
        .maybeSingle();

      if (error) {
        console.warn('[CartCheckoutSuccess] poll error', error);
        // Keep polling — could be a transient RLS / network blip.
      }

      const groupStatus = (data as { status?: string } | null)?.status;
      if (groupStatus && groupStatus !== 'pending') {
        if (cancelled) return;
        setStatus('paid');
        // Clear cart now that the order is real. clearCart hits the server.
        clearCart().catch(() => { /* non-fatal */ });
        // Brief celebration moment before navigating.
        setTimeout(() => {
          if (!cancelled) navigate(`/order-group/${groupId}`, { replace: true });
        }, 1200);
        return;
      }

      if (attempts >= MAX_POLLS) {
        if (!cancelled) setStatus('timeout');
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; };
  }, [groupId, navigate, clearCart]);

  return (
    <AppShell>
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          {status === 'polling' && (
            <>
              <CircularProgress size={48} sx={{ color: inkstashColors.brand, mb: 3 }} />
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 900,
                  fontSize: 28,
                  color: inkstashColors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: '0.005em',
                  mb: 1,
                }}
              >
                Confirming payment…
              </Typography>
              <Typography sx={{ color: inkstashColors.muted, fontSize: 14 }}>
                Your card was charged. Setting up your order with each seller.
              </Typography>
            </>
          )}

          {status === 'paid' && (
            <>
              <CheckCircle sx={{ fontSize: 64, color: inkstashColors.brand, mb: 2 }} />
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 900,
                  fontSize: 32,
                  color: inkstashColors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: '0.005em',
                  mb: 1,
                }}
              >
                Order placed!
              </Typography>
              <Typography sx={{ color: inkstashColors.muted, fontSize: 14 }}>
                Redirecting to your order summary…
              </Typography>
            </>
          )}

          {status === 'timeout' && (
            <>
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                Payment confirmed, but the order is taking longer than usual to set up. It should appear in My Stash → Purchases shortly.
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate('/my-stash?tab=history')}
                sx={{
                  bgcolor: inkstashColors.brand,
                  color: '#fff',
                  fontWeight: 700,
                  px: 3,
                  py: 1.1,
                  textTransform: 'uppercase',
                  '&:hover': { bgcolor: inkstashColors.brandDeep },
                }}
              >
                View my purchases
              </Button>
            </>
          )}

          {status === 'error' && (
            <Alert severity="error" sx={{ textAlign: 'left' }}>{errorMsg}</Alert>
          )}
        </Box>
      </Container>
    </AppShell>
  );
}
