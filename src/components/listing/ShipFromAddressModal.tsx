import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Add, LocationOn } from '@mui/icons-material';
import { sellerShipFromAddressesAPI, type SellerShipFromAddress } from '../../api/sellerShipFromAddresses';

interface ShipFromAddressModalProps {
  open: boolean;
  onClose: () => void;
  onAddressSelected: (address: SellerShipFromAddress) => void;
}

export default function ShipFromAddressModal({
  open,
  onClose,
  onAddressSelected,
}: ShipFromAddressModalProps) {
  const [addresses, setAddresses] = useState<SellerShipFromAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New address form fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (open) {
      loadAddresses();
    }
  }, [open]);

  const loadAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const allAddresses = await sellerShipFromAddressesAPI.getAll();
      setAddresses(allAddresses);

      // Auto-select default address if exists
      const defaultAddress = allAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }

      // If no addresses exist, show the new address form
      if (allAddresses.length === 0) {
        setShowNewAddressForm(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewAddress = async () => {
    if (!fullName || !addressLine1 || !city || !state || !postalCode) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const newAddress = await sellerShipFromAddressesAPI.add({
        fullName,
        companyName: companyName || undefined,
        addressLine1,
        addressLine2: addressLine2 || undefined,
        city,
        state,
        postalCode,
        country: 'US', // Default to US for now
        phone: phone || undefined,
        isDefault: addresses.length === 0, // Set as default if it's the first address
        nickname: nickname || undefined,
      });

      // Reload addresses
      await loadAddresses();

      // Select the newly added address
      setSelectedAddressId(newAddress.id);

      // Reset form and hide it
      resetNewAddressForm();
      setShowNewAddressForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const resetNewAddressForm = () => {
    setFullName('');
    setCompanyName('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
    setPhone('');
    setNickname('');
  };

  const handleContinue = () => {
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (selectedAddress) {
      onAddressSelected(selectedAddress);
      onClose();
    } else {
      setError('Please select an address');
    }
  };

  const handleCancel = () => {
    resetNewAddressForm();
    setShowNewAddressForm(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocationOn color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Select Ship-From Address
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          To calculate accurate shipping rates, we need your ship-from address. This is where you'll be shipping items from.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && addresses.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {!showNewAddressForm && addresses.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Saved Addresses
                </Typography>
                <RadioGroup value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)}>
                  <Stack spacing={1}>
                    {addresses.map((address) => (
                      <Box
                        key={address.id}
                        sx={{
                          border: '1px solid',
                          borderColor: selectedAddressId === address.id ? 'primary.main' : 'grey.300',
                          borderRadius: 1,
                          p: 2,
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'grey.50',
                          },
                        }}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <FormControlLabel
                          value={address.id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {address.nickname || address.fullName}
                                {address.isDefault && (
                                  <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                    (Default)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.fullName}
                                {address.companyName && ` - ${address.companyName}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.addressLine1}
                                {address.addressLine2 && `, ${address.addressLine2}`}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.city}, {address.state} {address.postalCode}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>

                <Divider sx={{ my: 2 }} />

                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setShowNewAddressForm(true)}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  Add New Address
                </Button>
              </Box>
            )}

            {showNewAddressForm && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {addresses.length > 0 ? 'Add New Address' : 'Add Your Ship-From Address'}
                </Typography>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  <TextField
                    label="Nickname (optional)"
                    placeholder="Home, Warehouse, etc."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Company Name (optional)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Address Line 1"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Address Line 2 (optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    size="small"
                    fullWidth
                  />

                  <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
                    <TextField
                      label="City"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="State"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      inputProps={{ maxLength: 2 }}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <TextField
                      label="ZIP Code"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Phone (optional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      size="small"
                    />
                  </Box>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={handleAddNewAddress}
                      disabled={loading || !fullName || !addressLine1 || !city || !state || !postalCode}
                      fullWidth
                      sx={{ textTransform: 'none' }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Save Address'}
                    </Button>
                    {addresses.length > 0 && (
                      <Button
                        variant="outlined"
                        onClick={() => {
                          resetNewAddressForm();
                          setShowNewAddressForm(false);
                        }}
                        fullWidth
                        sx={{ textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {!showNewAddressForm && addresses.length > 0 && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCancel} variant="outlined" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            variant="contained"
            disabled={!selectedAddressId}
            sx={{ textTransform: 'none' }}
          >
            Continue
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
