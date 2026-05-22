import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { type PaymentMethod, paymentMethodsAPI } from '../../api/payments';
import PaymentMethodsList from '../payments/PaymentMethodsList';

export default function PaymentsTab() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const paymentMethodsData = await paymentMethodsAPI.getAll();
      setPaymentMethods(paymentMethodsData);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultPayment = async (id: string) => {
    try {
      await paymentMethodsAPI.setDefault(id);
      await loadData();
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError('Failed to set default payment method');
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await paymentMethodsAPI.delete(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      setError('Failed to delete payment method');
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
        Payment Methods
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cards saved during Ruby purchases. We never store your full card number — only the brand, last 4 digits, and expiry.
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
      ) : paymentMethods.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography variant="body2" color="text.secondary">
            No saved cards yet. Buy Rubies once and your card will be saved here for one-tap top-ups.
          </Typography>
        </Box>
      ) : (
        <PaymentMethodsList
          paymentMethods={paymentMethods}
          onSetDefault={handleSetDefaultPayment}
          onDelete={handleDeletePayment}
        />
      )}
    </Paper>
  );
}
