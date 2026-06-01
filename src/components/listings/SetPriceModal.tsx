// src/components/listings/SetPriceModal.tsx
//
// Lightweight modal: enter asking price, see the 90/10 fee breakdown,
// confirm to list. Calls listingsAPI.listVaultItem and closes on success.

import { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { listingsAPI } from '../../api/listings';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
  itemTitle: string;
  itemImageUrl?: string | null;
  /** Fires after successful listing creation with the new listing id. */
  onListed?: (listingId: string) => void;
}

const FEE_PCT = 0.10;

export default function SetPriceModal({
  open, onClose, inventoryId, itemTitle, itemImageUrl, onListed,
}: Props) {
  const [priceUsd, setPriceUsd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPriceUsd('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const priceCents = (() => {
    const parsed = parseFloat(priceUsd);
    if (!isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  })();

  const feeCents = Math.round(priceCents * FEE_PCT);
  const receiveCents = priceCents - feeCents;

  const canSubmit = priceCents >= 100 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await listingsAPI.listVaultItem(inventoryId, priceCents);
      onListed?.(result.listing_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list item');
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
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
            fontSize: 20,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 2,
          }}
        >
          Set your asking price
        </Typography>

        {/* Item summary */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2.5,
            p: 1.25,
            bgcolor: inkstashColors.bgSunken,
            borderRadius: inkstashRadii.md,
          }}
        >
          {itemImageUrl && (
            <Box
              component="img"
              src={itemImageUrl}
              alt={itemTitle}
              sx={{
                width: 40, height: 60,
                objectFit: 'cover',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
          )}
          <Typography sx={{
            fontSize: 13, color: inkstashColors.ink, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {itemTitle}
          </Typography>
        </Box>

        <TextField
          autoFocus
          fullWidth
          label="Asking price (USD)"
          type="number"
          value={priceUsd}
          onChange={(e) => setPriceUsd(e.target.value)}
          slotProps={{
            htmlInput: { min: 1, step: 0.01, inputMode: 'decimal' },
            input: { startAdornment: <Box sx={{ mr: 1, color: inkstashColors.muted }}>$</Box> },
          }}
          disabled={submitting}
          sx={{ mb: 2 }}
        />

        {/* Fee breakdown */}
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
          <Row label="Buyers will pay" value={`$${(priceCents / 100).toFixed(2)}`} />
          <Row label="InkStash fee (10%)" value={`-$${(feeCents / 100).toFixed(2)}`} color={inkstashColors.muted} />
          <Box sx={{ borderTop: `1px solid ${inkstashColors.border}`, mt: 1, pt: 1 }}>
            <Row label="You'll receive" value={`$${(receiveCents / 100).toFixed(2)}`} bold />
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button
          variant="contained"
          fullWidth
          disabled={!canSubmit}
          onClick={handleSubmit}
          sx={{ py: 1.4, fontWeight: 700 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'List for sale'}
        </Button>

        <Typography sx={{ mt: 1.5, fontSize: 10.5, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          Book stays in the InkStash vault. We ship to the buyer on sale.
        </Typography>
      </Box>
    </Dialog>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
      <span style={{ color: color ?? 'inherit' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: color ?? 'inherit' }}>{value}</span>
    </Box>
  );
}
