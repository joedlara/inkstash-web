import { useEffect, useState } from 'react';
import { inkstashFonts } from "../theme/inkstashTokens";
import {
  Dialog,
  Box,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { RUBY_BUNDLES, smallestBundleFor } from '../../config/rubyBundles';
import type { RubyBundle } from '../../config/rubyBundles';
import RubyIcon from '../ui/RubyIcon';
import StripePaymentElement from '../checkout/StripePaymentElement';
import {
  inkstashColors,
  inkstashFonts,
  inkstashRadii,
  inkstashShadows,
} from '../../theme/inkstashTokens';

type Phase = 'select' | 'pay' | 'error';

interface RubyBundleModalProps {
  open: boolean;
  onClose: () => void;
  /** If supplied, the modal pre-selects the smallest bundle that, when added
   *  to the user's current balance, covers this Ruby cost. */
  requiredRubies?: number;
  currentBalance?: number;
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
}: RubyBundleModalProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<RubyBundle>(RUBY_BUNDLES[1]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setPhase('select');
    setError('');

    if (requiredRubies != null) {
      setSelected(smallestBundleFor(requiredRubies, currentBalance ?? 0));
    } else {
      setSelected(RUBY_BUNDLES[1]); // Popular
    }
  }, [open, requiredRubies, currentBalance]);

  const handleConfirmPurchase = () => {
    setError('');
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

        {(phase === 'select' || phase === 'error') && (
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
                Continue to payment — {formatUsd(selected.usdCents)}
              </Box>
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

        {phase === 'pay' && (
          <Box>
            <StripePaymentElement
              paymentType="ruby_bundle"
              targetId={selected.id}
              buttonLabel={`Pay ${formatUsd(selected.usdCents)}`}
              returnUrl={(() => {
                const base = window.location.origin + window.location.pathname;
                const params = new URLSearchParams(window.location.search);
                params.set('ruby_purchase', 'success');
                return `${base}?${params.toString()}`;
              })()}
              onError={(err) => {
                setError(err.message);
                setPhase('select');
              }}
            />
          </Box>
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
