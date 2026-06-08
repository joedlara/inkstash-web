// src/components/livestreams/WalletDrawer.tsx
//
// Right-rail "Wallet" popover. Anchored to the rail Wallet chip so it
// floats next to the button instead of taking over the bottom of the
// screen. Lists the viewer's saved cards inline (one default, others
// switchable with a tap) and provides an inline "add a card" form so
// they never have to leave the livestream to start bidding.
//
// The add-card flow uses Stripe SetupIntents via the
// `create-setup-intent` edge fn. On success the stripe-webhook saves
// the card to user_payment_methods; this component polls listMine()
// after confirmSetup() returns so the new card appears without a
// page reload.

import { useCallback, useEffect, useState } from 'react';
import { Popover, Box, Typography, Button, CircularProgress, Alert, IconButton } from '@mui/material';
import { CreditCard, Plus, X, Check, Star } from 'lucide-react';
import {
  Elements, PaymentElement, useStripe, useElements,
} from '@stripe/react-stripe-js';
import { paymentMethodsAPI, type UserPaymentMethod } from '../../api/paymentMethods';
import { getStripe } from '../../config/stripe';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Element to anchor the popover next to. When null, the popover hides. */
  anchorEl: HTMLElement | null;
  /** Optional: when the parent opens the drawer because the user tried
   *  to bid without a card, set this true to skip straight to the
   *  add-card form (instead of the empty-state intro). */
  autoOpenAddCard?: boolean;
  /** Called once a card has been added (or set as default) so callers
   *  can retry the action that opened the drawer (e.g. place-bid). */
  onCardReady?: () => void;
}

export default function WalletDrawer({
  open, onClose, anchorEl, autoOpenAddCard = false, onCardReady,
}: Props) {
  const [cards, setCards] = useState<UserPaymentMethod[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await paymentMethodsAPI.listMine();
      setCards(list);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate when opened. Reset add-card state every open so the form
  // re-mints a fresh SetupIntent (Stripe client_secrets are one-shot).
  useEffect(() => {
    if (open) {
      refresh();
      setAdding(false);
    }
  }, [open, refresh]);

  // Auto-flip to add-card form when the parent asks (e.g. user hit
  // 'no_card_on_file' on a bid). Wait until we've loaded so we know
  // whether the empty-state OR the list+add toggle should be hidden.
  useEffect(() => {
    if (open && autoOpenAddCard && cards !== null && cards.length === 0) {
      setAdding(true);
    } else if (open && autoOpenAddCard && cards !== null && cards.length > 0) {
      setAdding(true);
    }
  }, [open, autoOpenAddCard, cards]);

  // When cards == [] always auto-open the form. No saved cards =
  // there's nothing else useful to render.
  useEffect(() => {
    if (open && cards !== null && cards.length === 0) setAdding(true);
  }, [open, cards]);

  function handleCardAdded(newCard: UserPaymentMethod | null) {
    setAdding(false);
    refresh();
    if (newCard) onCardReady?.();
  }

  async function handleSetDefault(id: string) {
    try {
      await paymentMethodsAPI.setDefault(id);
      await refresh();
      onCardReady?.();
    } catch (err) {
      setError((err as Error).message ?? "Couldn't set default");
    }
  }

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
            mr: 1.5,
            width: 320,
            bgcolor: inkstashColors.bgElev,
            borderRadius: inkstashRadii.md,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            border: `1px solid ${inkstashColors.border}`,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 1, p: 2, pb: 1,
      }}>
        <Typography sx={{
          fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 15,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: inkstashColors.ink,
        }}>
          Wallet
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: inkstashColors.muted }}>
          <X size={16} />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5, fontSize: 12 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && cards === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} sx={{ color: inkstashColors.brand }} />
          </Box>
        ) : adding ? (
          <AddCardSection
            onAdded={handleCardAdded}
            onCancel={() => {
              // If they have no cards and they cancel, just close the
              // whole popover — there's nothing else to look at.
              if (cards && cards.length === 0) {
                onClose();
              } else {
                setAdding(false);
              }
            }}
          />
        ) : (
          <>
            <Typography sx={{
              fontSize: 12, color: inkstashColors.muted, mb: 1.5, lineHeight: 1.5,
            }}>
              Cards used for stream purchases and auction wins.
            </Typography>

            {(cards ?? []).map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onSetDefault={() => handleSetDefault(card.id)}
              />
            ))}

            <Button
              fullWidth
              variant="outlined"
              onClick={() => setAdding(true)}
              startIcon={<Plus size={14} strokeWidth={2.4} />}
              sx={{
                mt: 1,
                borderColor: inkstashColors.border,
                color: inkstashColors.ink,
                fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 12.5,
                textTransform: 'none',
                py: 1,
                '&:hover': { borderColor: inkstashColors.brand, bgcolor: 'transparent' },
              }}
            >
              Add a card
            </Button>
          </>
        )}
      </Box>
    </Popover>
  );
}

// ────────────────────────────────────────────────────────────────────
// Card row
// ────────────────────────────────────────────────────────────────────

function CardRow({
  card, onSetDefault,
}: {
  card: UserPaymentMethod;
  onSetDefault: () => void;
}) {
  return (
    <Box
      onClick={card.is_default ? undefined : onSetDefault}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        p: 1.25,
        borderRadius: inkstashRadii.sm,
        border: `1px solid ${card.is_default ? inkstashColors.brand : inkstashColors.border}`,
        bgcolor: card.is_default ? inkstashColors.brandSoft : 'transparent',
        mb: 1,
        cursor: card.is_default ? 'default' : 'pointer',
        transition: 'background-color 160ms ease, border-color 160ms ease',
        '&:hover': card.is_default ? undefined : {
          borderColor: inkstashColors.ink2,
          bgcolor: inkstashColors.bgSunken,
        },
      }}
    >
      <CreditCard size={18} color={card.is_default ? inkstashColors.brand : inkstashColors.muted} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13, fontWeight: 700,
          color: inkstashColors.ink,
          textTransform: 'capitalize',
        }}>
          {card.card_brand} ····{card.card_last4}
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.mono, fontSize: 10.5,
          color: inkstashColors.muted,
          mt: 0.25,
        }}>
          {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
        </Typography>
      </Box>
      {card.is_default ? (
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.4,
          color: inkstashColors.brand,
          fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Star size={11} strokeWidth={2.6} fill="currentColor" />
          Default
        </Box>
      ) : (
        <Typography sx={{
          fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 700,
          color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Use
        </Typography>
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────
// Add card section — mints SetupIntent then mounts PaymentElement
// ────────────────────────────────────────────────────────────────────

function AddCardSection({
  onAdded, onCancel,
}: {
  onAdded: (card: UserPaymentMethod | null) => void;
  onCancel: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { client_secret } = await paymentMethodsAPI.createSetupIntent();
        if (!cancelled) setClientSecret(client_secret);
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? 'Failed to start add card');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 1.5, fontSize: 12 }}>{error}</Alert>
        <Button fullWidth onClick={onCancel} sx={{ textTransform: 'none' }}>Close</Button>
      </Box>
    );
  }

  if (!clientSecret) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={22} sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  return (
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
      <AddCardForm onAdded={onAdded} onCancel={onCancel} />
    </Elements>
  );
}

function AddCardForm({
  onAdded, onCancel,
}: {
  onAdded: (card: UserPaymentMethod | null) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [waitingForCard, setWaitingForCard] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const result = await stripe.confirmSetup({
      elements,
      // Stay in the popover — no return_url redirect. Stripe still
      // needs the URL for SCA flows that REQUIRE a redirect (3DS);
      // we set it to the current page so worst case we just reload
      // back into the livestream.
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (result.error) {
      setErr(result.error.message ?? 'Card add failed');
      setSubmitting(false);
      return;
    }

    // SetupIntent succeeded client-side. Webhook will save the row
    // in user_payment_methods within ~1-3s. Poll for it so we can
    // show the card appearing inline (and notify the parent so the
    // pending bid can retry).
    setSubmitting(false);
    setWaitingForCard(true);
    const start = Date.now();
    const poll = async () => {
      while (Date.now() - start < 15_000) {
        const list = await paymentMethodsAPI.listMine();
        if (list.length > 0) {
          onAdded(list[0]);
          return;
        }
        await new Promise((r) => setTimeout(r, 800));
      }
      // Webhook is slow — close anyway; refresh in the parent will
      // pick the card up next time the popover opens.
      onAdded(null);
    };
    poll();
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: inkstashColors.muted, mb: 1.25,
      }}>
        Add a card
      </Typography>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && <Alert severity="error" sx={{ mt: 1.5, fontSize: 12 }}>{err}</Alert>}
      {waitingForCard ? (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          mt: 1.75, p: 1.25, borderRadius: 999,
          bgcolor: inkstashColors.brandSoft, color: inkstashColors.brandDeep,
        }}>
          <CircularProgress size={14} sx={{ color: inkstashColors.brand }} />
          <Typography sx={{ fontFamily: inkstashFonts.ui, fontSize: 12.5, fontWeight: 700 }}>
            Saving card…
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, mt: 1.75 }}>
          <Button
            type="button"
            onClick={onCancel}
            sx={{
              flex: 1, textTransform: 'none',
              color: inkstashColors.muted, fontFamily: inkstashFonts.ui, fontWeight: 700,
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!stripe || submitting}
            startIcon={submitting ? null : <Check size={14} strokeWidth={2.6} />}
            sx={{
              flex: 2,
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.ui, fontWeight: 800, fontSize: 13,
              textTransform: 'none',
              '&:hover': { bgcolor: inkstashColors.brandDeep },
            }}
          >
            {submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save card'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
