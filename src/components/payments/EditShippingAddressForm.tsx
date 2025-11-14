import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { type ShippingAddress } from '../../api/payments';

interface EditShippingAddressFormProps {
  address: ShippingAddress;
  onSave: (updates: Partial<ShippingAddress>) => void;
  onCancel: () => void;
}

export default function EditShippingAddressForm({
  address,
  onSave,
  onCancel,
}: EditShippingAddressFormProps) {
  const [formData, setFormData] = useState({
    full_name: address.full_name,
    address_line1: address.address_line1,
    address_line2: address.address_line2 || '',
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
    phone: address.phone || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      onSave(formData);
    } catch (err) {
      console.error('Error updating shipping address:', err);
      setError(err instanceof Error ? err.message : 'Failed to update shipping address');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          fullWidth
          label="Full Name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          label="Address Line 1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          label="Address Line 2 (Optional)"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleChange}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="Postal Code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            required
          />
          <TextField
            fullWidth
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
          />
        </Box>
        <TextField
          fullWidth
          label="Phone (Optional)"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          type="tel"
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={processing}
          startIcon={processing && <CircularProgress size={20} />}
        >
          {processing ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </form>
  );
}
