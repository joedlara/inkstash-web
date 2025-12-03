import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { type ShippingAddress, shippingAddressesAPI } from '../../api/payments';
import ShippingAddressesList from '../payments/ShippingAddressesList';
import AddShippingAddressForm from '../payments/AddShippingAddressForm';

export default function AddressesTab() {
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddShipping, setShowAddShipping] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const shippingAddressesData = await shippingAddressesAPI.getAll();

      // If there's only one address and it's not set as default, set it as default
      if (shippingAddressesData.length === 1 && !shippingAddressesData[0].is_default) {
        await shippingAddressesAPI.setDefault(shippingAddressesData[0].id);
        // Reload to get updated data
        const updatedData = await shippingAddressesAPI.getAll();
        setShippingAddresses(updatedData);
      } else {
        setShippingAddresses(shippingAddressesData);
      }
    } catch (err) {
      console.error('Error loading shipping addresses:', err);
      setError('Failed to load shipping addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleShippingAddressAdded = async () => {
    setShowAddShipping(false);
    await loadData();
  };

  const handleSetDefaultShipping = async (id: string) => {
    try {
      await shippingAddressesAPI.setDefault(id);
      await loadData();
    } catch (err) {
      console.error('Error setting default shipping address:', err);
      setError('Failed to set default shipping address');
    }
  };

  const handleDeleteShipping = async (id: string) => {
    try {
      await shippingAddressesAPI.delete(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting shipping address:', err);
      setError('Failed to delete shipping address');
    }
  };

  const handleEditShipping = async (id: string, updates: Partial<ShippingAddress>) => {
    try {
      await shippingAddressesAPI.update(id, updates);
      await loadData();
    } catch (err) {
      console.error('Error updating shipping address:', err);
      setError('Failed to update shipping address');
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Shipping Addresses
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your shipping addresses for deliveries
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : showAddShipping ? (
        <AddShippingAddressForm
          onSuccess={handleShippingAddressAdded}
          onCancel={() => setShowAddShipping(false)}
        />
      ) : (
        <Box>
          <ShippingAddressesList
            addresses={shippingAddresses}
            onSetDefault={handleSetDefaultShipping}
            onDelete={handleDeleteShipping}
            onEdit={handleEditShipping}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => setShowAddShipping(true)}
              sx={{ minWidth: 200 }}
            >
              Add Shipping Address
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
