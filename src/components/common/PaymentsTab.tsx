import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { getStripe } from '../../config/stripe';
import { type PaymentMethod, paymentMethodsAPI } from '../../api/payments';
import PaymentMethodsList from '../payments/PaymentMethodsList';
import AddPaymentMethodForm from '../payments/AddPaymentMethodForm';

export default function PaymentsTab() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);

  const stripePromise = getStripe();

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

  const handlePaymentMethodAdded = async () => {
    setShowAddPayment(false);
    await loadData();
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
        Manage your payment methods for purchases
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
      ) : showAddPayment ? (
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => setShowAddPayment(false)}
          />
        </Elements>
      ) : (
        <Box>
          <PaymentMethodsList
            paymentMethods={paymentMethods}
            onSetDefault={handleSetDefaultPayment}
            onDelete={handleDeletePayment}
          />
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => setShowAddPayment(true)}
              sx={{ minWidth: 200 }}
            >
              Add Payment Method
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
