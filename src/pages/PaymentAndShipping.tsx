import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getStripe } from '../config/stripe';
import { type PaymentMethod, type ShippingAddress, paymentMethodsAPI, shippingAddressesAPI } from '../api/payments';
import DashboardHeader from '../components/home/DashboardHeader';
import PaymentMethodsList from '../components/payments/PaymentMethodsList';
import AddPaymentMethodForm from '../components/payments/AddPaymentMethodForm';
import ShippingAddressesList from '../components/payments/ShippingAddressesList';
import AddShippingAddressForm from '../components/payments/AddShippingAddressForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PaymentAndShipping() {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddShipping, setShowAddShipping] = useState(false);

  const stripePromise = getStripe();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [paymentMethodsData, shippingAddressesData] = await Promise.all([
        paymentMethodsAPI.getAll(),
        shippingAddressesAPI.getAll(),
      ]);
      setPaymentMethods(paymentMethodsData);
      setShippingAddresses(shippingAddressesData);
    } catch (err) {
      console.error('Error loading payment and shipping data:', err);
      setError('Failed to load payment and shipping information');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setShowAddPayment(false);
    setShowAddShipping(false);
  };

  const handlePaymentMethodAdded = async () => {
    setShowAddPayment(false);
    await loadData();
  };

  const handleShippingAddressAdded = async () => {
    setShowAddShipping(false);
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
    <>
      <DashboardHeader />
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.primary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Payment & Shipping
          </Typography>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          <Tab label="Payment Methods" />
          <Tab label="Shipping Addresses" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
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
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
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
        </TabPanel>
      </Paper>
      </Container>
    </>
  );
}
