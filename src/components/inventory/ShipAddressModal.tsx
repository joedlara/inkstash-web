import { useEffect, useState } from 'react';
import { inkstashFonts } from "../theme/inkstashTokens";
import {
  Dialog,
  Box,
  Typography,
  Alert,
  IconButton,
  TextField,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { Truck } from 'lucide-react';
import { addressesAPI } from '../../api/addresses';
import type { UserAddress } from '../../api/addresses';
import {
  inkstashColors,
  inkstashFonts,
  inkstashRadii,
} from '../../theme/inkstashTokens';

interface ShipAddressModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen / created address id when the user confirms. */
  onConfirm: (addressId: string) => Promise<void> | void;
  /** Title override — used to show which comic is shipping. */
  itemLabel?: string;
}

type Mode = 'pick' | 'new';

export default function ShipAddressModal({
  open,
  onClose,
  onConfirm,
  itemLabel,
}: ShipAddressModalProps) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('pick');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // New-address form fields
  const [fullName, setFullName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    addressesAPI.listMine()
      .then((list) => {
        setAddresses(list);
        if (list.length === 0) {
          setMode('new');
        } else {
          setMode('pick');
          setSelectedId(list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null);
        }
      })
      .catch(() => setError('Could not load saved addresses'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleConfirm = async () => {
    setError('');
    setSubmitting(true);
    try {
      let addressId: string | null = null;
      if (mode === 'new') {
        if (!fullName.trim() || !line1.trim() || !city.trim() || !stateField.trim() || !postalCode.trim()) {
          throw new Error('Please fill in name, street, city, state, and ZIP.');
        }
        const created = await addressesAPI.create({
          full_name: fullName.trim(),
          line1: line1.trim(),
          line2: line2.trim() || null,
          city: city.trim(),
          state: stateField.trim(),
          postal_code: postalCode.trim(),
        });
        addressId = created.id;
      } else {
        if (!selectedId) throw new Error('Pick an address');
        addressId = selectedId;
      }
      await onConfirm(addressId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request shipping');
    } finally {
      setSubmitting(false);
    }
  };

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

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack direction="row" alignItems="center" gap={1.25} mb={0.5}>
          <Truck size={22} color={inkstashColors.brand} />
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 22,
              color: inkstashColors.ink,
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
            }}
          >
            Ship to me
          </Typography>
        </Stack>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.muted,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mb: 2.5,
          }}
        >
          {itemLabel ?? 'Shipping a vaulted comic'}
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, fontFamily: inkstashFonts.ui }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
          </Box>
        ) : (
          <>
            {addresses.length > 0 && (
              <Stack direction="row" gap={1} mb={2.5}>
                <ModeTab active={mode === 'pick'} onClick={() => setMode('pick')}>
                  Saved address
                </ModeTab>
                <ModeTab active={mode === 'new'} onClick={() => setMode('new')}>
                  New address
                </ModeTab>
              </Stack>
            )}

            {mode === 'pick' && addresses.length > 0 && (
              <Stack gap={1} mb={3}>
                {addresses.map((addr) => (
                  <Box
                    key={addr.id}
                    component="button"
                    type="button"
                    onClick={() => setSelectedId(addr.id)}
                    sx={{
                      textAlign: 'left',
                      bgcolor: selectedId === addr.id ? inkstashColors.brandSoft : inkstashColors.bgSunken,
                      border: `1.5px solid ${selectedId === addr.id ? inkstashColors.brand : inkstashColors.border}`,
                      borderRadius: inkstashRadii.md,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      fontFamily: inkstashFonts.ui,
                      transition: 'border-color 140ms ease, background 140ms ease',
                      '&:hover': { borderColor: inkstashColors.brand },
                    }}
                  >
                    <Box sx={{ fontWeight: 700, fontSize: 14, color: inkstashColors.ink, mb: 0.5 }}>
                      {addr.full_name}
                    </Box>
                    <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 11.5, color: inkstashColors.ink2 }}>
                      {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                      <br />
                      {addr.city}, {addr.state} {addr.postal_code}
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}

            {mode === 'new' && (
              <Stack gap={1.5} mb={3}>
                <TextField
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="Street address"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="Apt / Suite (optional)"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  fullWidth
                  size="small"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
                  <TextField
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    fullWidth
                    size="small"
                    required
                  />
                  <TextField
                    label="State"
                    value={stateField}
                    onChange={(e) => setStateField(e.target.value)}
                    sx={{ minWidth: 100 }}
                    size="small"
                    required
                  />
                  <TextField
                    label="ZIP"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    sx={{ minWidth: 120 }}
                    size="small"
                    required
                  />
                </Stack>
              </Stack>
            )}

            <Box
              component="button"
              type="button"
              onClick={handleConfirm}
              disabled={submitting || (mode === 'pick' && !selectedId)}
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
                letterSpacing: '0.02em',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': submitting ? {} : { bgcolor: inkstashColors.brandDeep },
                '&:active': submitting ? {} : { transform: 'scale(0.98)' },
                '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              {submitting && (
                <Box
                  sx={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    animation: 'inkstashShipBtn 0.7s linear infinite',
                    '@keyframes inkstashShipBtn': { to: { transform: 'rotate(360deg)' } },
                  }}
                />
              )}
              {submitting ? 'Requesting...' : 'Request shipment'}
            </Box>

            <Box
              sx={{
                mt: 1.5,
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                color: inkstashColors.muted,
                textAlign: 'center',
                letterSpacing: '0.04em',
              }}
            >
              We'll reach out about timing within 3 business days.
            </Box>
          </>
        )}
      </Box>
    </Dialog>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        bgcolor: active ? inkstashColors.ink : 'transparent',
        color: active ? '#fff' : inkstashColors.ink2,
        border: `1px solid ${active ? inkstashColors.ink : inkstashColors.border}`,
        padding: '8px 12px',
        borderRadius: 999,
        fontFamily: inkstashFonts.ui,
        fontWeight: 700,
        fontSize: 12.5,
        cursor: 'pointer',
        transition: 'background 140ms ease, color 140ms ease',
      }}
    >
      {children}
    </Box>
  );
}
