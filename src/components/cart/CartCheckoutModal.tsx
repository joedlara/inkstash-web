// src/components/cart/CartCheckoutModal.tsx
//
// Wraps the cart checkout: calls create-cart-payment-intent on mount, then
// mounts a Stripe Payment Element with the returned client_secret. After
// the buyer confirms, Stripe redirects to /cart-checkout-success which
// polls the order_group until the webhook flips it to 'paid'.

import { useEffect, useState } from 'react';
import {
  Box, Dialog, IconButton, Typography, Button, CircularProgress, Alert, Divider,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useCart } from '../../contexts/CartContext';
import { cartAPI } from '../../api/cart';
import { getStripe } from '../../config/stripe';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartCheckoutModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { items, groupedBySeller, grandTotal, removeItem, setDrawerOpen } = useCart();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderGroupId, setOrderGroupId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initErrorCode, setInitErrorCode] = useState<string | null>(null);
  const [staleItemIds, setStaleItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Kick off the PaymentIntent creation whenever the modal opens. Re-runs
  // if the cart contents change while the modal is open (e.g. the buyer
  // removed an item before retry).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setClientSecret(null);
    setOrderGroupId(null);
    setInitError(null);
    setInitErrorCode(null);
    setStaleItemIds([]);
    setLoading(true);

    cartAPI.createPaymentIntent()
      .then((res) => {
        if (cancelled) return;
        setClientSecret(res.client_secret);
        setOrderGroupId(res.order_group_id);
      })
      .catch((err: Error & { details?: { stale_item_ids?: string[]; seller_ids?: string[] } }) => {
        if (cancelled) return;
        setInitErrorCode(err.name || 'unknown');
        setInitError(err.message);
        if (err.name === 'stale_items') {
          setStaleItemIds(err.details?.stale_item_ids ?? []);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, items.length]);

  async function handleRemoveStale() {
    for (const id of staleItemIds) {
      try { await removeItem(id); } catch { /* ignore */ }
    }
    setStaleItemIds([]);
    setInitError(null);
    setInitErrorCode(null);
  }

  function handleAddAddress() {
    onClose();
    setDrawerOpen(false);
    navigate('/settings?tab=addresses');
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
      <Box sx={{ p: { xs: 2.5, sm: 3 }, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          disabled={loading}
          sx={{ position: 'absolute', right: 10, top: 10, color: inkstashColors.muted }}
        >
          <Close fontSize="small" />
        </IconButton>

        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 22,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 2,
          }}
        >
          Checkout
        </Typography>

        {/* Compact summary so the buyer sees what they're paying for */}
        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 1.5,
            mb: 2.5,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {groupedBySeller.map((group) => (
            <Box key={group.seller_id} sx={{ mb: 1.5, '&:last-of-type': { mb: 0 } }}>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: inkstashColors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: 0.5,
                }}
              >
                @{group.seller_username}
              </Typography>
              {group.items.map((it) => (
                <Box key={it.listing_id} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, py: 0.25 }}>
                  <Typography sx={{ flex: 1, fontSize: 13, color: inkstashColors.ink, pr: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.title}
                  </Typography>
                  <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.ink }}>
                    ${(it.price + it.shipping_cost).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
          <Divider sx={{ my: 1, borderColor: inkstashColors.border }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', color: inkstashColors.ink }}>
              Total
            </Typography>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 18, color: inkstashColors.ink }}>
              ${grandTotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Init error handlers — branch by structured error code from the edge fn */}
        {initErrorCode === 'no_shipping_address' && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleAddAddress}>
                Add address
              </Button>
            }
          >
            Add a default shipping address before checking out.
          </Alert>
        )}

        {initErrorCode === 'stale_items' && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRemoveStale}>
                Remove
              </Button>
            }
          >
            {staleItemIds.length} item(s) in your cart are no longer available. Remove them to continue.
          </Alert>
        )}

        {initErrorCode === 'seller_not_connect_active' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            One or more sellers in your cart haven't finished setting up payouts yet. Try again later or remove their items.
          </Alert>
        )}

        {initError && !['no_shipping_address', 'stale_items', 'seller_not_connect_active'].includes(initErrorCode ?? '') && (
          <Alert severity="error" sx={{ mb: 2 }}>{initError}</Alert>
        )}

        {/* Stripe Payment Element — only mounts once we have a client_secret */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {clientSecret && orderGroupId && (
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
            <CartPaymentForm
              buttonLabel={`Pay $${grandTotal.toFixed(2)}`}
              orderGroupId={orderGroupId}
            />
          </Elements>
        )}
      </Box>
    </Dialog>
  );
}

function CartPaymentForm({ buttonLabel, orderGroupId }: { buttonLabel: string; orderGroupId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const returnUrl = `${window.location.origin}/cart-checkout-success?order_group_id=${orderGroupId}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // confirmPayment only returns here on error; success triggers the
    // return_url redirect and this component unmounts.
    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={!stripe || submitting}
        sx={{
          mt: 2,
          py: 1.4,
          fontWeight: 800,
          bgcolor: inkstashColors.brand,
          color: '#fff',
          textTransform: 'uppercase',
          fontFamily: inkstashFonts.ui,
          letterSpacing: '0.06em',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
        }}
      >
        {submitting ? <CircularProgress size={20} color="inherit" /> : buttonLabel}
      </Button>
    </Box>
  );
}
