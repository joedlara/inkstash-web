import { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Alert,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '../../config/stripe';
import { rubiesAPI } from '../../api/rubies';
import { paymentMethodsAPI } from '../../api/paymentMethods';
import type { UserPaymentMethod } from '../../api/paymentMethods';
import { RUBY_BUNDLES, smallestBundleFor } from '../../config/rubyBundles';
import type { RubyBundle } from '../../config/rubyBundles';
import { useAuth } from '../../hooks/useAuth';
import RubyIcon from '../ui/RubyIcon';
import HoldToOpenButton from './HoldToOpenButton';
import {
  inkstashColors,
  inkstashFonts,
  inkstashRadii,
  inkstashShadows,
} from '../../theme/inkstashTokens';

type Phase = 'select' | 'pay' | 'confirming' | 'crediting' | 'success' | 'error';

interface RubyBundleModalProps {
  open: boolean;
  onClose: () => void;
  /** If supplied, the modal pre-selects the smallest bundle that, when added
   *  to the user's current balance, covers this Ruby cost. */
  requiredRubies?: number;
  currentBalance?: number;
  /** Fires once Rubies have actually been credited to the user (after webhook). */
  onCredited?: (newBalance: number) => void;
}

function formatRubies(n: number): string {
  return n.toLocaleString('en-US');
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RubyBundleModal({
  open,
  onClose,
  requiredRubies,
  currentBalance,
  onCredited,
}: RubyBundleModalProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<RubyBundle>(RUBY_BUNDLES[1]);
  const [defaultCard, setDefaultCard] = useState<UserPaymentMethod | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setPhase('select');
    setError('');
    setClientSecret('');
    setPaymentIntentId('');

    if (requiredRubies != null) {
      setSelected(smallestBundleFor(requiredRubies, currentBalance ?? 0));
    } else {
      setSelected(RUBY_BUNDLES[1]); // Popular
    }

    paymentMethodsAPI.getDefault().then(setDefaultCard).catch(() => setDefaultCard(null));
  }, [open, requiredRubies, currentBalance]);

  const handleConfirmPurchase = async () => {
    setError('');
    setPhase('confirming');

    try {
      if (defaultCard) {
        // One-tap path — server-side off_session confirm
        const result = await rubiesAPI.chargeBundleSavedCard(selected.id);
        setPhase('crediting');
        await waitForCredit(result.rubyTotal);
      } else {
        // First-time path — need Elements clientSecret
        const intent = await rubiesAPI.createBundleIntent(selected.id);
        setClientSecret(intent.clientSecret);
        setPaymentIntentId(intent.paymentIntentId);
        setPhase('pay');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete purchase');
      setPhase('error');
    }
  };

  const waitForCredit = async (rubyTotal: number) => {
    if (!user?.id) {
      setError('Not authenticated');
      setPhase('error');
      return;
    }
    const startBalance = currentBalance ?? 0;
    const expected = startBalance + rubyTotal;
    const finalBalance = await rubiesAPI.waitForBalanceAtLeast(user.id, expected, 20_000);
    if (finalBalance == null) {
      setError('Payment confirmed. Your Rubies will land in a moment.');
      setPhase('error');
      return;
    }
    setPhase('success');
    onCredited?.(finalBalance);
    setTimeout(() => onClose(), 900);
  };

  const handleStripeConfirmed = async () => {
    setPhase('crediting');
    await waitForCredit(selected.totalRubies);
  };

  const handleStripeError = (msg: string) => {
    setError(msg);
    setPhase('pay');
  };

  const closable =
    phase === 'select' || phase === 'pay' || phase === 'error';

  return (
    <Dialog
      open={open}
      onClose={closable ? onClose : undefined}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={!closable}
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
    >
      {(phase === 'confirming' || phase === 'crediting') && (
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
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 24,
              color: inkstashColors.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              mb: 0.75,
            }}
          >
            Buy Rubies
          </Typography>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11.5,
              color: inkstashColors.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {requiredRubies != null
              ? `You need ${formatRubies(Math.max(0, requiredRubies - (currentBalance ?? 0)))} more to open this pack`
              : 'Stock up on Rubies — bigger bundles, bigger bonuses'}
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 2.5, fontFamily: inkstashFonts.ui }}
          >
            {error}
          </Alert>
        )}

        {(phase === 'select' || phase === 'confirming' || phase === 'error') && (
          <>
            {/* Bundle tiles */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: { xs: 1.25, sm: 1.5 },
                mb: 3,
              }}
            >
              {RUBY_BUNDLES.map((bundle) => (
                <BundleTile
                  key={bundle.id}
                  bundle={bundle}
                  selected={selected.id === bundle.id}
                  onSelect={() => phase === 'select' && setSelected(bundle)}
                  disabled={phase !== 'select'}
                />
              ))}
            </Box>

            {/* Confirm row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                padding: '16px 20px',
                bgcolor: inkstashColors.bgSunken,
                border: `1px solid ${inkstashColors.border}`,
                borderRadius: inkstashRadii.md,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                rowGap: 2,
              }}
            >
              <Box>
                <Box
                  sx={{
                    fontFamily: inkstashFonts.mono,
                    fontSize: 11,
                    color: inkstashColors.muted,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  You'll receive
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontFamily: inkstashFonts.display,
                    fontWeight: 800,
                    fontSize: 22,
                    color: inkstashColors.ink,
                    lineHeight: 1,
                  }}
                >
                  <RubyIcon size={18} />
                  {formatRubies(selected.totalRubies)}
                </Box>
              </Box>

              {defaultCard ? (
                <HoldToOpenButton
                  label={`Hold to pay ${formatUsd(selected.usdCents)}`}
                  onComplete={handleConfirmPurchase}
                  busy={phase !== 'select'}
                />
              ) : (
                <Box
                  component="button"
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={phase !== 'select'}
                  sx={{
                    bgcolor: inkstashColors.brand,
                    color: '#fff',
                    border: 'none',
                    padding: '12px 28px',
                    borderRadius: 999,
                    fontFamily: inkstashFonts.ui,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: phase === 'select' ? 'pointer' : 'not-allowed',
                    opacity: phase === 'select' ? 1 : 0.6,
                    letterSpacing: '0.02em',
                    transition: 'background 140ms ease, transform 100ms ease',
                    '&:hover': { bgcolor: inkstashColors.brandDeep },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  Buy {formatUsd(selected.usdCents)}
                </Box>
              )}
            </Box>

            <Box
              sx={{
                mt: 1.75,
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                color: inkstashColors.muted,
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              All purchases final. Rubies are non-refundable and cannot be transferred to cash.
            </Box>
          </>
        )}

        {phase === 'pay' && clientSecret && (
          <Box>
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
              <BundleStripeForm
                amountLabel={formatUsd(selected.usdCents)}
                onConfirmed={handleStripeConfirmed}
                onError={handleStripeError}
                paymentIntentId={paymentIntentId}
              />
            </Elements>
          </Box>
        )}

        {(phase === 'crediting' || phase === 'success') && (
          <ProcessingPanel
            label={phase === 'success' ? 'Stashed. Ready to rip.' : 'Stashing your Rubies...'}
            rubies={selected.totalRubies}
            isSuccess={phase === 'success'}
          />
        )}
      </Box>
    </Dialog>
  );
}

function BundleTile({
  bundle,
  selected,
  onSelect,
  disabled,
}: {
  bundle: RubyBundle;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  const accent =
    bundle.highlight === 'popular'
      ? inkstashColors.brand
      : bundle.highlight === 'best_value'
        ? inkstashColors.gold
        : null;

  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      disabled={disabled}
      sx={{
        position: 'relative',
        textAlign: 'left',
        bgcolor: inkstashColors.bgElev,
        border: `1.5px solid ${selected ? inkstashColors.brand : inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        padding: '14px 14px 16px',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 140ms ease, transform 120ms ease, box-shadow 140ms ease',
        boxShadow: selected ? inkstashShadows.md : 'none',
        '&:hover': disabled
          ? {}
          : {
              borderColor: selected ? inkstashColors.brand : inkstashColors.borderStrong,
              transform: 'translateY(-2px)',
            },
        '&:active': disabled ? {} : { transform: 'scale(0.99)' },
      }}
    >
      {bundle.bonusPct > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            right: 10,
            bgcolor: accent ?? inkstashColors.ink,
            color: '#fff',
            padding: '3px 8px',
            borderRadius: 999,
            fontFamily: inkstashFonts.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: inkstashShadows.sm,
          }}
        >
          +{bundle.bonusPct}% extra
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1.5,
        }}
      >
        <RubyIcon size={26} glow={selected || !!accent} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1,
          }}
        >
          <Box
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 22,
              color: inkstashColors.ink,
              lineHeight: 1,
            }}
          >
            {formatRubies(bundle.totalRubies)}
          </Box>
          {bundle.bonusRubies > 0 && (
            <Box
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                color: accent ?? inkstashColors.muted,
                mt: 0.4,
                letterSpacing: '0.04em',
              }}
            >
              incl. {formatRubies(bundle.bonusRubies)} bonus
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          color: inkstashColors.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.4,
        }}
      >
        {bundle.label}
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 700,
          fontSize: 16,
          color: inkstashColors.ink,
        }}
      >
        {formatUsd(bundle.usdCents)}
      </Box>
    </Box>
  );
}

function BundleStripeForm({
  amountLabel,
  onConfirmed,
  onError,
}: {
  amountLabel: string;
  onConfirmed: () => void;
  onError: (msg: string) => void;
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? 'Payment failed');
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onConfirmed();
    } else {
      onError('Payment not completed');
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
        {submitting ? 'Processing...' : `Pay ${amountLabel}`}
      </Box>
    </form>
  );
}

function ProcessingPanel({ label, rubies, isSuccess }: { label: string; rubies: number; isSuccess?: boolean }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      {isSuccess ? (
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: 'auto',
            mb: 2.5,
            display: 'grid',
            placeItems: 'center',
            animation: 'inkstashStashPop 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes inkstashStashPop': {
              '0%': { transform: 'scale(0.3)', opacity: 0 },
              '60%': { transform: 'scale(1.15)', opacity: 1 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: inkstashColors.brand,
              opacity: 0.15,
              animation: 'inkstashStashRipple 1.4s ease-out infinite',
              '@keyframes inkstashStashRipple': {
                '0%': { transform: 'scale(1)', opacity: 0.3 },
                '100%': { transform: 'scale(1.8)', opacity: 0 },
              },
            }}
          />
          <RubyIcon size={56} glow />
        </Box>
      ) : (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: `3px solid ${inkstashColors.bgSunken}`,
            borderTopColor: inkstashColors.brand,
            mx: 'auto',
            mb: 2.5,
            animation: 'inkstashRubySpin 0.8s linear infinite',
            '@keyframes inkstashRubySpin': { to: { transform: 'rotate(360deg)' } },
          }}
        />
      )}
      <Typography
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 22,
          color: isSuccess ? inkstashColors.brandDeep : inkstashColors.ink,
          textTransform: 'uppercase',
          letterSpacing: '0.005em',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          mt: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          fontFamily: inkstashFonts.mono,
          fontSize: 13,
          fontWeight: 700,
          color: isSuccess ? inkstashColors.brand : inkstashColors.muted,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        <RubyIcon size={13} />
        +{formatRubies(rubies)}
      </Box>
    </Box>
  );
}
