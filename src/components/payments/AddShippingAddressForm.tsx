import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { shippingAddressesAPI, type ShippingAddress } from '../../api/payments';

interface AddShippingAddressFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddShippingAddressForm({ onSuccess, onCancel }: AddShippingAddressFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    phone: '',
    is_default: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      await shippingAddressesAPI.add(formData as Omit<ShippingAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
      onSuccess();
    } catch (err) {
      console.error('Error adding shipping address:', err);
      setError(err instanceof Error ? err.message : 'Failed to add shipping address');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Add Shipping Address
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Add a new shipping address for your orders
      </Typography>

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
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
          <FormControlLabel
            control={
              <Checkbox
                name="is_default"
                checked={formData.is_default}
                onChange={handleChange}
              />
            }
            label="Set as default shipping address"
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
            {processing ? 'Adding...' : 'Add Address'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
