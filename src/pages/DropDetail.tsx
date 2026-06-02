// src/pages/DropDetail.tsx
//
// /drop/:id — single-drop view. State-driven buy affordance:
//   upcoming → big live countdown banner, buy disabled
//   live     → "Buy now" CTA, quantity remaining counter, urgency progress bar
//   sold_out → grey "Sold out" banner, buy disabled, link back to /drops
//
// Buy flow (live state only):
//   1. Click "Buy now"
//   2. dropsAPI.createPaymentIntent(dropId) — reserves capacity + returns client_secret
//   3. Mount Stripe Payment Element in a modal
//   4. Buyer confirms → Stripe redirects to /cart-checkout-success
//      (we reuse the cart success page; drops just have a single order in the group)
//   5. Webhook processes the underlying listing/pack buy as usual + records drop_id on the order

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Button, CircularProgress, Alert,
  Dialog, IconButton, Chip, Stack,
} from '@mui/material';
import { ArrowBack, Close, Bolt, AccessTime, Remove, Add } from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { dropsAPI, type DropWithLinked } from '../api/drops';
import DropCountdown from '../components/drops/DropCountdown';
import { PLACEHOLDER_IMAGE_URL } from '../utils/placeholders';
import { getStripe } from '../config/stripe';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../theme/inkstashTokens';

export default function DropDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [drop, setDrop] = useState<DropWithLinked | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    dropsAPI.getDrop(id).then((d) => {
      if (!cancelled) {
        setDrop(d);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <Container maxWidth="lg" sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={48} sx={{ color: inkstashColors.brand }} />
        </Container>
      </AppShell>
    );
  }

  if (!drop) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error" sx={{ mb: 3 }}>Drop not found.</Alert>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/drops')}>Back to drops</Button>
        </Container>
      </AppShell>
    );
  }

  const cover = drop.hero_image_url ?? drop.linked_listing?.photos?.[0]?.url ?? drop.cover_url ?? PLACEHOLDER_IMAGE_URL;
  const title = drop.title ?? drop.linked_listing?.title ?? drop.linked_pack?.name ?? 'Drop';
  const description = drop.description ?? drop.linked_listing?.description ?? drop.linked_pack?.description ?? null;

  const isLive = drop.state === 'live';
  const isUpcoming = drop.state === 'upcoming';
  const isSoldOut = drop.state === 'sold_out';
  const soldPct = drop.quantity_total > 0
    ? Math.min(100, Math.round((drop.quantity_sold / drop.quantity_total) * 100))
    : 0;

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ mb: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/drops')}
            sx={{
              textTransform: 'none',
              color: inkstashColors.muted,
              fontFamily: inkstashFonts.ui,
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { bgcolor: 'transparent', color: inkstashColors.brand },
            }}
          >
            All drops
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 4fr' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
          {/* Cover */}
          <Box
            sx={{
              width: '100%',
              aspectRatio: '4 / 3',
              bgcolor: inkstashColors.bgSunken,
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: inkstashRadii.lg,
              border: `1.5px solid ${inkstashColors.border}`,
            }}
          />

          {/* Right column: meta + state banner + buy */}
          <Box>
            {drop.vendor && (
              <Chip
                label={`@${drop.vendor.username ?? 'vendor'}`}
                onClick={() => drop.vendor?.username && navigate(`/@${drop.vendor.username}`)}
                sx={{
                  bgcolor: inkstashColors.brandSoft,
                  color: inkstashColors.brand,
                  fontFamily: inkstashFonts.mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: inkstashColors.brand, color: '#fff' },
                }}
              />
            )}

            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: { xs: 30, md: 38 },
                color: inkstashColors.ink,
                textTransform: 'uppercase',
                letterSpacing: '0.005em',
                lineHeight: 1.05,
                mb: 1.5,
              }}
            >
              {title}
            </Typography>

            {/* State banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                mb: 3,
                border: `1.5px solid ${isLive ? inkstashColors.brand : isUpcoming ? inkstashColors.borderStrong : inkstashColors.border}`,
                bgcolor: isLive ? inkstashColors.brandSoft : isUpcoming ? inkstashColors.bgElev : inkstashColors.bgSunken,
                borderRadius: inkstashRadii.lg,
              }}
            >
              {isUpcoming && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTime sx={{ fontSize: 16, color: inkstashColors.muted }} />
                    <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                      Drops in
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1.5 }}>
                    <DropCountdown targetDate={drop.go_live_at} />
                  </Box>
                  <Typography sx={{ fontSize: 13, color: inkstashColors.muted }}>
                    {drop.quantity_total} copies will be available at ${Number(drop.price).toFixed(2)} each. First come, first served.
                  </Typography>
                </Box>
              )}

              {isLive && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                    <Bolt sx={{ fontSize: 18, color: inkstashColors.brand }} />
                    <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.brand, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                      Live now
                    </Typography>
                  </Box>
                  <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22, color: inkstashColors.ink, mb: 1.5 }}>
                    {drop.quantity_remaining} of {drop.quantity_total} left
                  </Typography>
                  <Box sx={{ height: 6, bgcolor: inkstashColors.bgElev, borderRadius: 999, overflow: 'hidden', mb: 2 }}>
                    <Box
                      sx={{
                        width: `${soldPct}%`,
                        height: '100%',
                        bgcolor: inkstashColors.brand,
                        transition: 'width 400ms ease',
                      }}
                    />
                  </Box>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setCheckoutOpen(true)}
                    sx={{
                      bgcolor: inkstashColors.brand,
                      color: '#fff',
                      fontWeight: 800,
                      py: 1.3,
                      textTransform: 'uppercase',
                      fontFamily: inkstashFonts.ui,
                      letterSpacing: '0.06em',
                      borderRadius: inkstashRadii.sm,
                      '&:hover': { bgcolor: inkstashColors.brandDeep },
                    }}
                  >
                    Buy now · ${Number(drop.price).toFixed(2)}
                  </Button>
                </Box>
              )}

              {isSoldOut && (
                <Box>
                  <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, mb: 1 }}>
                    Sold out
                  </Typography>
                  <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22, color: inkstashColors.ink, mb: 1 }}>
                    All {drop.quantity_total} copies sold
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 2 }}>
                    Browse other drops or check the marketplace for resales.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => navigate('/drops')} sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>
                      Other drops
                    </Button>
                    <Button variant="outlined" onClick={() => navigate('/marketplace')} sx={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>
                      Marketplace
                    </Button>
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* Description / comic metadata */}
            {description && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, mb: 1 }}>
                  Details
                </Typography>
                <Typography sx={{ fontSize: 14, color: inkstashColors.ink, lineHeight: 1.55 }}>
                  {description}
                </Typography>
              </Box>
            )}

            {drop.linked_listing && (
              <Box sx={{ mb: 3 }}>
                {drop.linked_listing.comic_publisher && (
                  <MetaRow label="Publisher" value={drop.linked_listing.comic_publisher} />
                )}
                {drop.linked_listing.comic_writer && (
                  <MetaRow label="Writer" value={drop.linked_listing.comic_writer} />
                )}
                {drop.linked_listing.comic_artist && (
                  <MetaRow label="Artist" value={drop.linked_listing.comic_artist} />
                )}
                {drop.linked_listing.comic_issue_number && (
                  <MetaRow label="Issue" value={`#${drop.linked_listing.comic_issue_number}`} />
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      <DropCheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        drop={drop}
      />
    </AppShell>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: `1px solid ${inkstashColors.border}` }}>
      <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, color: inkstashColors.ink, fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  drop: DropWithLinked;
}

const MAX_QTY = 5;

function DropCheckoutModal({ open, onClose, drop }: CheckoutModalProps) {
  const [qty, setQty] = useState(1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirmedQty, setConfirmedQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hard ceiling: can't buy more than what's actually left or our per-buy cap.
  const maxAllowedQty = Math.max(1, Math.min(MAX_QTY, drop.quantity_remaining));

  // Reset qty when modal opens to avoid carrying state across visits.
  useEffect(() => {
    if (open) {
      setQty(1);
      setClientSecret(null);
      setError(null);
      setErrorCode(null);
    }
  }, [open]);

  const unitPrice = Number(drop.price);
  const total = unitPrice * qty;

  async function handleProceed() {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const res = await dropsAPI.createPaymentIntent(drop.id, qty);
      setClientSecret(res.client_secret);
      setConfirmedQty(res.qty ?? qty);
    } catch (err) {
      const e = err as Error;
      setErrorCode(e.name || 'unknown');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: inkstashRadii.lg, bgcolor: inkstashColors.bgElev } }}
    >
      <Box sx={{ p: 3, position: 'relative' }}>
        <IconButton onClick={onClose} disabled={loading} sx={{ position: 'absolute', right: 10, top: 10 }}>
          <Close fontSize="small" />
        </IconButton>

        <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', mb: 2 }}>
          {clientSecret ? 'Confirm payment' : 'Confirm purchase'}
        </Typography>

        <Box sx={{ bgcolor: inkstashColors.bgSunken, p: 1.5, borderRadius: inkstashRadii.md, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {drop.title ?? drop.linked_listing?.title ?? drop.linked_pack?.name}
            </Typography>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.25 }}>
              ${unitPrice.toFixed(2)} each · {drop.quantity_remaining} left
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 20 }}>
            ${total.toFixed(2)}
          </Typography>
        </Box>

        {/* Quantity stepper — only shown before PI is locked in */}
        {!clientSecret && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, p: 1, border: `1px solid ${inkstashColors.border}`, borderRadius: inkstashRadii.md }}>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, pl: 1 }}>
              Copies
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                size="small"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1 || loading}
                sx={{ bgcolor: inkstashColors.bgElev, '&:hover': { bgcolor: inkstashColors.bgSunken } }}
              >
                <Remove fontSize="small" />
              </IconButton>
              <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22, minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {qty}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setQty((q) => Math.min(maxAllowedQty, q + 1))}
                disabled={qty >= maxAllowedQty || loading}
                sx={{ bgcolor: inkstashColors.bgElev, '&:hover': { bgcolor: inkstashColors.bgSunken } }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Show locked qty after PI created so buyer can't change it mid-flow */}
        {clientSecret && confirmedQty > 1 && (
          <Box sx={{ bgcolor: inkstashColors.brandSoft, p: 1.25, borderRadius: inkstashRadii.md, mb: 2 }}>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.brand, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
              Buying {confirmedQty} copies
            </Typography>
          </Box>
        )}

        {errorCode === 'not_enough_copies' && (
          <Alert severity="warning" sx={{ mb: 2 }}>Not enough copies left for that quantity. Lower the count or try again.</Alert>
        )}
        {errorCode === 'sold_out' && (
          <Alert severity="warning" sx={{ mb: 2 }}>Sold out! Someone just grabbed the last copy.</Alert>
        )}
        {errorCode === 'not_yet_live' && (
          <Alert severity="info" sx={{ mb: 2 }}>This drop isn't live yet.</Alert>
        )}
        {error && !['not_enough_copies', 'sold_out', 'not_yet_live'].includes(errorCode ?? '') && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
          </Box>
        )}

        {/* Pre-PI step: show big Continue button to lock capacity */}
        {!clientSecret && !loading && (
          <Button
            fullWidth
            variant="contained"
            onClick={handleProceed}
            sx={{
              mt: 1, py: 1.4, fontWeight: 800,
              bgcolor: inkstashColors.brand, color: '#fff',
              textTransform: 'uppercase', fontFamily: inkstashFonts.ui,
              letterSpacing: '0.06em',
              '&:hover': { bgcolor: inkstashColors.brandDeep },
            }}
          >
            Continue · ${total.toFixed(2)}
          </Button>
        )}

        {/* Post-PI step: Stripe element */}
        {clientSecret && (
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
                  fontFamily: 'Geist, system-ui, sans-serif',
                  borderRadius: '8px',
                },
              },
            }}
          >
            <DropPaymentForm dropId={drop.id} amountUsd={unitPrice * confirmedQty} />
          </Elements>
        )}
      </Box>
    </Dialog>
  );
}

function DropPaymentForm({ dropId, amountUsd }: { dropId: string; amountUsd: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const returnUrl = `${window.location.origin}/drop/${dropId}?purchase=success`;
    const res = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });
    if (res.error) {
      setErr(res.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PaymentElement />
      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
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
        {submitting ? <CircularProgress size={20} color="inherit" /> : `Pay $${amountUsd.toFixed(2)}`}
      </Button>
    </Box>
  );
}
