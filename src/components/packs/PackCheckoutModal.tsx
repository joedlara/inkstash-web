import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  Box,
  Typography,
  Alert,
  LinearProgress,
  IconButton,
} from '@mui/material';
import { Close, Lock } from '@mui/icons-material';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../../config/stripe';
import { packCheckoutAPI } from '../../api/packCheckout';
import { packsAPI } from '../../api/packs';
import type { Pack } from '../../api/packs';
import {
  inkstashColors,
  inkstashFonts,
  inkstashRadii,
} from '../../theme/inkstashTokens';

type Phase = 'loading' | 'pay' | 'confirming' | 'polling' | 'success' | 'error' | 'mockPay';

interface PackCheckoutModalProps {
  open: boolean;
  pack: Pack | null;
  onClose: () => void;
  mockMode?: boolean;
}

export default function PackCheckoutModal({
  open,
  pack,
  onClose,
  mockMode = true,
}: PackCheckoutModalProps) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    if (!open || !pack) return;

    setPhase('loading');
    setError('');
    setClientSecret('');
    setPaymentIntentId('');

    if (mockMode) {
      const t = setTimeout(() => setPhase('mockPay'), 600);
      return () => clearTimeout(t);
    }

    packCheckoutAPI
      .createPaymentIntent(pack.id)
      .then((res) => {
        setClientSecret(res.clientSecret);
        setPaymentIntentId(res.paymentIntentId);
        setPhase('pay');
      })
      .catch((err) => {
        setError(err.message || 'Could not start checkout');
        setPhase('error');
      });
  }, [open, pack, mockMode]);

  const handleMockPay = async () => {
    if (!pack) return;
    setPhase('confirming');
    await new Promise((r) => setTimeout(r, 900));
    setPhase('polling');
    try {
      const result = await packsAPI.openPack(pack.id);
      setPhase('success');
      setTimeout(() => {
        onClose();
        navigate(`/pack-reveal/${result.purchase_id}`);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
      setPhase('error');
    }
  };

  const handleConfirmed = async () => {
    if (!pack) return;
    setPhase('polling');

    const start = Date.now();
    const TIMEOUT_MS = 30_000;
    const POLL_MS = 1_500;

    while (Date.now() - start < TIMEOUT_MS) {
      const purchaseId = await packCheckoutAPI.pollPurchaseByIntent(paymentIntentId);
      if (purchaseId) {
        setPhase('success');
        setTimeout(() => {
          onClose();
          navigate(`/pack-reveal/${purchaseId}`);
        }, 700);
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }

    setError('Payment confirmed but pack is still being prepared. Check Purchases shortly.');
    setPhase('error');
  };

  const closable = phase !== 'confirming' && phase !== 'polling' && phase !== 'success';

  return (
    <Dialog
      open={open}
      onClose={closable ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!closable}
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
          overflow: 'hidden',
        },
      }}
    >
      {(phase === 'loading' || phase === 'confirming' || phase === 'polling') && (
        <LinearProgress
          sx={{
            height: 3,
            bgcolor: inkstashColors.bgSunken,
            '& .MuiLinearProgress-bar': { bgcolor: inkstashColors.brand },
          }}
        />
      )}

      {closable && (
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
      )}

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        {pack && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            {pack.cover_image && (
              <Box
                component="img"
                src={pack.cover_image}
                alt={pack.name}
                sx={{
                  width: 64,
                  height: 80,
                  objectFit: 'cover',
                  borderRadius: inkstashRadii.sm,
                  border: `1px solid ${inkstashColors.border}`,
                  flexShrink: 0,
                }}
              />
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 10.5,
                  color: inkstashColors.muted,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                {pack.partner}
              </Box>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: 20,
                  lineHeight: 1.1,
                  color: inkstashColors.ink,
                  textTransform: 'uppercase',
                  letterSpacing: '0.005em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {pack.name}
              </Typography>
              <Box
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: 22,
                  color: inkstashColors.brand,
                  mt: 0.5,
                }}
              >
                ${pack.price.toFixed(2)}
              </Box>
            </Box>
          </Box>
        )}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 2.5, fontFamily: inkstashFonts.ui }}
          >
            {error}
          </Alert>
        )}

        {phase === 'loading' && (
          <Box sx={{ py: 4, textAlign: 'center', color: inkstashColors.muted }}>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Preparing checkout...
            </Typography>
          </Box>
        )}

        {phase === 'mockPay' && pack && (
          <MockPayForm pack={pack} onPay={handleMockPay} />
        )}

        {phase === 'pay' && clientSecret && (
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: inkstashColors.brand,
                  colorBackground: inkstashColors.bgElev,
                  colorText: inkstashColors.ink,
                  colorTextSecondary: inkstashColors.muted,
                  colorDanger: '#ef4444',
                  fontFamily: 'Geist, system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <StripePayForm
              onConfirmed={handleConfirmed}
              onError={(msg) => {
                setError(msg);
                setPhase('error');
              }}
              onConfirming={() => setPhase('confirming')}
              backToPay={() => setPhase('pay')}
            />
          </Elements>
        )}

        {phase === 'confirming' && (
          <ProcessingPanel label="Confirming payment..." />
        )}

        {phase === 'polling' && (
          <ProcessingPanel label="Preparing your pack..." />
        )}

        {phase === 'success' && (
          <ProcessingPanel label="Done. Opening pack..." />
        )}

        {phase === 'error' && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Box
              component="button"
              type="button"
              onClick={onClose}
              sx={{
                bgcolor: 'transparent',
                border: `1px solid ${inkstashColors.border}`,
                color: inkstashColors.ink2,
                padding: '10px 20px',
                borderRadius: 999,
                fontFamily: inkstashFonts.ui,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                '&:hover': { bgcolor: inkstashColors.bgSunken },
              }}
            >
              Close
            </Box>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

function MockPayForm({ pack, onPay }: { pack: Pack; onPay: () => void }) {
  return (
    <Box>
      <Box
        sx={{
          bgcolor: inkstashColors.goldSoft,
          border: `1px solid ${inkstashColors.gold}40`,
          borderRadius: inkstashRadii.sm,
          padding: '10px 14px',
          mb: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Lock sx={{ fontSize: 14, color: inkstashColors.gold }} />
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.ink2,
            letterSpacing: '0.02em',
          }}
        >
          Mock mode — Stripe Edge Functions not yet deployed. Click Pay to test the success flow.
        </Box>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5,
            color: inkstashColors.muted,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            mb: 0.75,
          }}
        >
          Card number
        </Box>
        <Box
          sx={{
            padding: '12px 14px',
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.sm,
            bgcolor: inkstashColors.bgSunken,
            fontFamily: inkstashFonts.mono,
            fontSize: 14,
            color: inkstashColors.muted2,
            letterSpacing: '0.04em',
          }}
        >
          4242 4242 4242 4242
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10.5,
              color: inkstashColors.muted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              mb: 0.75,
            }}
          >
            Expiry
          </Box>
          <Box
            sx={{
              padding: '12px 14px',
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.sm,
              bgcolor: inkstashColors.bgSunken,
              fontFamily: inkstashFonts.mono,
              fontSize: 14,
              color: inkstashColors.muted2,
            }}
          >
            12 / 28
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10.5,
              color: inkstashColors.muted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              mb: 0.75,
            }}
          >
            CVC
          </Box>
          <Box
            sx={{
              padding: '12px 14px',
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.sm,
              bgcolor: inkstashColors.bgSunken,
              fontFamily: inkstashFonts.mono,
              fontSize: 14,
              color: inkstashColors.muted2,
            }}
          >
            123
          </Box>
        </Box>
      </Box>

      <Box
        component="button"
        type="button"
        onClick={onPay}
        sx={{
          width: '100%',
          bgcolor: inkstashColors.brand,
          color: '#fff',
          border: 'none',
          padding: '14px',
          borderRadius: 999,
          fontFamily: inkstashFonts.ui,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 140ms ease, transform 100ms ease',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        Pay ${pack.price.toFixed(2)}
      </Box>

      <Box
        sx={{
          mt: 1.5,
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5,
          color: inkstashColors.muted,
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        Test mode · No real charges
      </Box>
    </Box>
  );
}

function StripePayForm({
  onConfirmed,
  onError,
  onConfirming,
  backToPay,
}: {
  onConfirmed: () => void;
  onError: (msg: string) => void;
  onConfirming: () => void;
  backToPay: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    onConfirming();
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/packs' },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? 'Payment failed');
      backToPay();
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onConfirmed();
    } else {
      onError('Payment not completed');
      backToPay();
    }
  };

  return (
    <form onSubmit={submit}>
      <PaymentElement />
      <Box
        component="button"
        type="submit"
        disabled={!stripe || submitting}
        sx={{
          width: '100%',
          mt: 2.5,
          bgcolor: inkstashColors.brand,
          color: '#fff',
          border: 'none',
          padding: '14px',
          borderRadius: 999,
          fontFamily: inkstashFonts.ui,
          fontWeight: 700,
          fontSize: 14,
          cursor: submitting ? 'wait' : 'pointer',
          letterSpacing: '0.02em',
          transition: 'background 140ms ease, transform 100ms ease',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.98)' },
          '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
        }}
      >
        {submitting ? 'Processing...' : 'Pay now'}
      </Box>
    </form>
  );
}

function ProcessingPanel({ label }: { label: string }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `3px solid ${inkstashColors.bgSunken}`,
          borderTopColor: inkstashColors.brand,
          mx: 'auto',
          mb: 2,
          animation: 'inkstashSpin 0.8s linear infinite',
          '@keyframes inkstashSpin': {
            to: { transform: 'rotate(360deg)' },
          },
        }}
      />
      <Typography
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 18,
          color: inkstashColors.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.005em',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          color: inkstashColors.muted,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          mt: 0.75,
        }}
      >
        This usually takes a moment
      </Box>
    </Box>
  );
}
