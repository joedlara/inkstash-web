import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, ShoppingCart, LocalShipping, Payment, CheckCircle } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { type PaymentMethod, type ShippingAddress, paymentMethodsAPI, shippingAddressesAPI } from '../api/payments';
import { ordersAPI } from '../api/orders';
import DashboardHeader from '../components/home/DashboardHeader';

interface CheckoutState {
  auctionId: string;
  itemTitle: string;
  price: number;
  imageUrl: string;
  type: 'buy_now' | 'bid_won';
  sellerId: string;
  shippingCost?: number;
}

const steps = ['Shipping', 'Payment', 'Review'];

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const checkoutData = location.state as CheckoutState;

  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const shippingCost = checkoutData?.shippingCost || 10.00; // Default shipping cost
  const subtotal = checkoutData?.price || 0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shippingCost + tax;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!checkoutData) {
      // Try to restore from localStorage
      const savedCheckout = localStorage.getItem('checkout_session');
      if (savedCheckout) {
        try {
          const parsed = JSON.parse(savedCheckout);
          // Check if session is less than 24 hours old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            navigate('/checkout', { state: parsed.data, replace: true });
            return;
          } else {
            // Clear expired session
            localStorage.removeItem('checkout_session');
          }
        } catch (err) {
          console.error('Error parsing saved checkout session:', err);
          localStorage.removeItem('checkout_session');
        }
      }
      navigate('/');
      return;
    }

    // Save checkout session to localStorage
    localStorage.setItem('checkout_session', JSON.stringify({
      data: checkoutData,
      timestamp: Date.now(),
    }));

    loadData();
  }, [user, checkoutData, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentMethodsData, shippingAddressesData] = await Promise.all([
        paymentMethodsAPI.getAll(),
        shippingAddressesAPI.getAll(),
      ]);

      setPaymentMethods(paymentMethodsData);
      setShippingAddresses(shippingAddressesData);

      // Auto-select default payment and shipping if available
      const defaultPayment = paymentMethodsData.find(pm => pm.is_default);
      const defaultShipping = shippingAddressesData.find(addr => addr.is_default);

      if (defaultPayment) setSelectedPayment(defaultPayment.id);
      if (defaultShipping) setSelectedShipping(defaultShipping.id);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load payment and shipping information');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedShipping) {
      setError('Please select a shipping address');
      return;
    }
    if (activeStep === 1 && !selectedPayment) {
      setError('Please select a payment method');
      return;
    }

    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedPayment || !selectedShipping) {
      setError('Please select payment method and shipping address');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // TODO: Implement actual payment processing with Stripe
      // For now, we'll simulate a successful payment
      // In production, you would call your backend to create a Stripe PaymentIntent
      // and confirm the payment before creating the order

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create the order in the database
      const orderResult = await ordersAPI.create({
        auctionId: checkoutData.auctionId,
        paymentMethodId: selectedPayment,
        shippingAddressId: selectedShipping,
        itemPrice: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        purchaseType: checkoutData.type,
        // stripePaymentIntentId: paymentIntent.id, // Would come from Stripe
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      // Clear saved checkout session
      localStorage.removeItem('checkout_session');

      // Navigate to success page with order details
      navigate('/order-success', {
        state: {
          orderId: orderResult.order_id,
          orderNumber: orderResult.order_number,
        },
      });

      // TODO: Send order confirmation email
      // This would be handled by a backend service or edge function
    } catch (err) {
      console.error('Order failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Order failed. Please try again or contact support.'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!checkoutData) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Container maxWidth="lg" sx={{ py: 4, mt: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 100px)' }}>
          <CircularProgress size={60} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.primary' }}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Checkout
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ShoppingCart />}
            onClick={() => navigate('/cart')}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Edit Cart
          </Button>
        </Box>

        {/* Stepper */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left side - Steps */}
          <Box sx={{ flex: 2 }}>
            {/* Step 0: Shipping */}
            {activeStep === 0 && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <LocalShipping color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Select Shipping Address
                  </Typography>
                </Stack>

                {shippingAddresses.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No shipping addresses found
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate('/payments', { state: { tab: 1 } })}
                      sx={{ mt: 2 }}
                    >
                      Add Shipping Address
                    </Button>
                  </Box>
                ) : (
                  <RadioGroup value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)}>
                    {shippingAddresses.map((address) => (
                      <Paper
                        key={address.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 2,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: selectedShipping === address.id ? 'primary.main' : 'divider',
                        }}
                        onClick={() => setSelectedShipping(address.id)}
                      >
                        <FormControlLabel
                          value={address.id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {address.full_name}
                                {address.is_default && (
                                  <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                    (Default)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.address_line1}
                              </Typography>
                              {address.address_line2 && (
                                <Typography variant="body2" color="text.secondary">
                                  {address.address_line2}
                                </Typography>
                              )}
                              <Typography variant="body2" color="text.secondary">
                                {address.city}, {address.state} {address.postal_code}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {address.country}
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    ))}
                  </RadioGroup>
                )}

                <Button
                  variant="text"
                  onClick={() => navigate('/payments', { state: { tab: 1 } })}
                  sx={{ mt: 2 }}
                >
                  + Add New Address
                </Button>
              </Paper>
            )}

            {/* Step 1: Payment */}
            {activeStep === 1 && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <Payment color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Select Payment Method
                  </Typography>
                </Stack>

                {paymentMethods.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No payment methods found
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate('/payments', { state: { tab: 0 } })}
                      sx={{ mt: 2 }}
                    >
                      Add Payment Method
                    </Button>
                  </Box>
                ) : (
                  <RadioGroup value={selectedPayment} onChange={(e) => setSelectedPayment(e.target.value)}>
                    {paymentMethods.map((method) => (
                      <Paper
                        key={method.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          mb: 2,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: selectedPayment === method.id ? 'primary.main' : 'divider',
                        }}
                        onClick={() => setSelectedPayment(method.id)}
                      >
                        <FormControlLabel
                          value={method.id}
                          control={<Radio />}
                          label={
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {method.card_brand?.toUpperCase()} •••• {method.last_four}
                                {method.is_default && (
                                  <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                    (Default)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Expires {method.exp_month}/{method.exp_year}
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    ))}
                  </RadioGroup>
                )}

                <Button
                  variant="text"
                  onClick={() => navigate('/payments', { state: { tab: 0 } })}
                  sx={{ mt: 2 }}
                >
                  + Add New Payment Method
                </Button>
              </Paper>
            )}

            {/* Step 2: Review */}
            {activeStep === 2 && (
              <Paper elevation={2} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                  <CheckCircle color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    Review Your Order
                  </Typography>
                </Stack>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Shipping Address
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  {shippingAddresses.find(addr => addr.id === selectedShipping) && (
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {shippingAddresses.find(addr => addr.id === selectedShipping)?.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {shippingAddresses.find(addr => addr.id === selectedShipping)?.address_line1}
                      </Typography>
                      {shippingAddresses.find(addr => addr.id === selectedShipping)?.address_line2 && (
                        <Typography variant="body2" color="text.secondary">
                          {shippingAddresses.find(addr => addr.id === selectedShipping)?.address_line2}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {shippingAddresses.find(addr => addr.id === selectedShipping)?.city},{' '}
                        {shippingAddresses.find(addr => addr.id === selectedShipping)?.state}{' '}
                        {shippingAddresses.find(addr => addr.id === selectedShipping)?.postal_code}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Payment Method
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  {paymentMethods.find(pm => pm.id === selectedPayment) && (
                    <Typography variant="body1">
                      {paymentMethods.find(pm => pm.id === selectedPayment)?.card_brand?.toUpperCase()} ••••{' '}
                      {paymentMethods.find(pm => pm.id === selectedPayment)?.last_four}
                    </Typography>
                  )}
                </Paper>

                <Alert severity="info">
                  By placing your order, you agree to InkStash's terms and conditions
                </Alert>
              </Paper>
            )}

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="outlined"
                size="large"
              >
                Back
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={processing}
                  startIcon={processing ? <CircularProgress size={20} /> : <ShoppingCart />}
                >
                  {processing ? 'Processing...' : `Place Order - $${total.toFixed(2)}`}
                </Button>
              ) : (
                <Button variant="contained" size="large" onClick={handleNext}>
                  Continue
                </Button>
              )}
            </Box>
          </Box>

          {/* Right side - Order Summary */}
          <Box sx={{ flex: 1 }}>
            <Paper elevation={2} sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Order Summary
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* Item */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={checkoutData.imageUrl || 'https://via.placeholder.com/300'}
                  alt={checkoutData.itemTitle}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {checkoutData.itemTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {checkoutData.type === 'buy_now' ? 'Buy Now Price' : 'Winning Bid'}
                  </Typography>
                </CardContent>
              </Card>

              {/* Price Breakdown */}
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Item Price</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${subtotal.toFixed(2)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${shippingCost.toFixed(2)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Tax</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${tax.toFixed(2)}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6" fontWeight="bold">
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    ${total.toFixed(2)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
