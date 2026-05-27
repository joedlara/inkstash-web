// src/pages/VendorProfile.tsx
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Avatar, Chip, CircularProgress, Alert } from '@mui/material';
import { vendorsAPI, type Vendor } from '../api/vendors';
import type { Pack } from '../api/packs';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function VendorProfile() {
  const { handle } = useParams<{ handle: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle) return;
    (async () => {
      const v = await vendorsAPI.getByHandle(handle);
      if (v) {
        setVendor(v);
        const ps = await vendorsAPI.listPacksByVendor(v.id);
        setPacks(ps);
      }
      setLoading(false);
    })();
  }, [handle]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!vendor) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">Vendor not found.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          src={vendor.avatar_url ?? undefined}
          alt={vendor.display_name}
          sx={{ width: 64, height: 64 }}
        >
          {vendor.display_name[0]?.toUpperCase()}
        </Avatar>
        <Box>
          <Box
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 24,
              color: inkstashColors.ink,
            }}
          >
            {vendor.display_name}
          </Box>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 12,
              color: inkstashColors.muted,
            }}
          >
            @{vendor.handle}
          </Box>
        </Box>
        {vendor.is_publisher && (
          <Chip
            label="Publisher"
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              fontWeight: 700,
            }}
          />
        )}
      </Box>

      {vendor.bio && (
        <Box
          sx={{
            mb: 4,
            color: inkstashColors.ink,
            fontFamily: inkstashFonts.ui,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {vendor.bio}
        </Box>
      )}

      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: inkstashColors.muted,
          mb: 1.5,
        }}
      >
        Active packs ({packs.length})
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {packs.map((p) => (
          <Box
            key={p.id}
            component={RouterLink}
            to={`/packs/${p.id}`}
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: 2,
              p: 2,
              transition: 'border-color 140ms ease',
              '&:hover': { borderColor: inkstashColors.brand },
            }}
          >
            <Box sx={{ fontWeight: 700, mb: 0.5 }}>{p.name}</Box>
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted }}>
              ${p.price.toFixed(2)} · {p.item_count} items
            </Box>
          </Box>
        ))}
        {packs.length === 0 && (
          <Box sx={{ color: inkstashColors.muted, fontSize: 13 }}>No active packs.</Box>
        )}
      </Box>
    </Container>
  );
}
