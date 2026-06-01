// src/components/checkout/CheckoutListingModal.tsx
//
// Buy a marketplace listing. Mirrors CheckoutVendorPackModal from Phase 5:
// Dialog wrapper + StripePaymentElement. Apple Pay / card auto-show per
// the buyer's device.
//
// The modal calls create-payment-intent with payment_type='listing'. The
// edge function loads the listing + seller, validates, and creates a
// destination-charge PaymentIntent. On Stripe success, the user is
// redirected to /item/:id?listing_purchase=success. The webhook fires
// open-listing-order asynchronously, which inserts the order, transfers
// vault inventory ownership (if applicable), inserts seller_payouts, and
// sends both confirmation emails.

import { useEffect, useState } from 'react';
import { Dialog, Box, IconButton, Typography, Alert, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import StripePaymentElement from './StripePaymentElement';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

// Minimum shape of a listing the modal needs. Pass whatever your ItemDetail
// has loaded — typically a Pick<Listing, ...> with the seller embedded.
export interface CheckoutListingModalListing {
  id: string;
  title: string;
  buy_now_price: number;
  source_inventory_id: string | null;
  comic_publisher: string | null;
  photos: Array<{ url?: string }> | null;
  // Either embed the seller (preferred) OR rely on the edge function to look it up.
  user_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  listing: CheckoutListingModalListing;
}

export default function CheckoutListingModal({ open, onClose, listing }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // For v1 the shipping rate is chosen server-side (cheapest active rate
  // saved against the listing at creation time). Later we can surface a
  // picker here; for now we just show "Shipping: calculated at checkout".

  const itemPrice = Number(listing.buy_now_price);
  const coverUrl = listing.photos?.[0]?.url ?? null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
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
      {!submitting && (
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

      <Box sx={{ p: { xs: 3, sm: 3.5 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 22,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 2,
          }}
        >
          Confirm purchase
        </Typography>

        {/* Item summary */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            mb: 2.5,
            p: 1.25,
            bgcolor: inkstashColors.bgSunken,
            borderRadius: inkstashRadii.md,
          }}
        >
          {coverUrl && (
            <Box
              component="img"
              src={coverUrl}
              alt={listing.title}
              sx={{ width: 48, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            {listing.comic_publisher && (
              <Typography sx={{ fontSize: 10.5, color: inkstashColors.gold, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.25 }}>
                {listing.comic_publisher}
              </Typography>
            )}
            <Typography sx={{
              fontSize: 14, fontWeight: 700, color: inkstashColors.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {listing.title}
            </Typography>
          </Box>
        </Box>

        {/* Price summary */}
        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 1.5,
            mb: 2.5,
            fontFamily: inkstashFonts.mono,
            fontSize: 13,
            color: inkstashColors.ink,
          }}
        >
          <Row label="Item" value={`$${itemPrice.toFixed(2)}`} />
          <Row label="Shipping" value="Calculated at checkout" color={inkstashColors.muted} />
          {listing.source_inventory_id && (
            <Row label="Ship-from" value="InkStash vault" color={inkstashColors.brand} />
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Stripe Payment Element */}
        <StripePaymentElement
          paymentType="listing"
          targetId={listing.id}
          buttonLabel={`Pay $${itemPrice.toFixed(2)}`}
          returnUrl={(() => {
            const base = window.location.origin + window.location.pathname;
            const params = new URLSearchParams(window.location.search);
            params.set('listing_purchase', 'success');
            return `${base}?${params.toString()}`;
          })()}
          onError={(err) => {
            setError(err.message);
            setSubmitting(false);
          }}
        />

        <Typography sx={{ mt: 1.5, fontSize: 10.5, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          {listing.source_inventory_id
            ? 'Ships from the InkStash vault on payment.'
            : 'Seller ships from their address on payment.'}
        </Typography>
      </Box>
    </Dialog>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
      <span style={{ color: color ?? 'inherit' }}>{label}</span>
      <span style={{ color: color ?? 'inherit' }}>{value}</span>
    </Box>
  );
}
