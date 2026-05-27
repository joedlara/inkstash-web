// src/pages/CheckoutVendorPack.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Container, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import StripePaymentElement from '../components/checkout/StripePaymentElement';
import { packsAPI, type Pack } from '../api/packs';
import type { Vendor } from '../api/vendors';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function CheckoutVendorPack() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [pack, setPack] = useState<(Pack & { vendor: Vendor | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packId) return;
    (async () => {
      const p = await packsAPI.getByIdWithVendor(packId);
      if (!p) {
        setError('Pack not found.');
      } else if (p.origin !== 'vendor') {
        setError('This pack is not available for USD checkout.');
      } else if (p.status !== 'active') {
        setError('This pack is not currently available.');
      } else {
        setPack(p);
      }
      setLoading(false);
    })();
  }, [packId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pack || !pack.vendor) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">{error ?? 'Pack not available.'}</Alert>
        <Button
          component={RouterLink}
          to="/packs"
          startIcon={<ArrowLeft size={16} />}
          sx={{ mt: 3 }}
        >
          Back to packs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        component={RouterLink}
        to={`/packs/${pack.id}`}
        startIcon={<ArrowLeft size={16} />}
        sx={{ color: inkstashColors.muted, mb: 2 }}
      >
        Back to pack
      </Button>

      <Box
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 28,
          color: inkstashColors.ink,
          mb: 0.5,
        }}
      >
        {pack.name}
      </Box>
      <Box sx={{ color: inkstashColors.muted, mb: 3 }}>
        From @{pack.vendor.handle} · ${pack.price.toFixed(2)}
      </Box>

      <StripePaymentElement
        paymentType="vendor_pack"
        targetId={pack.id}
        buttonLabel={`Pay $${pack.price.toFixed(2)}`}
        returnUrl={`${window.location.origin}/packs/${pack.id}?reveal=pending`}
        onError={(err) => setError(err.message)}
      />
    </Container>
  );
}
