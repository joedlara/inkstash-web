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
  CircularProgress,
  TextField,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { ArrowBack, CreditCard } from '@mui/icons-material';
import { Elements } from '@stripe/react-stripe-js';
import { useAuth } from '../hooks/useAuth';
import { type PaymentMethod, type ShippingAddress, paymentMethodsAPI, shippingAddressesAPI } from '../api/payments';
import { ordersAPI } from '../api/orders';
import { sendOrderConfirmationEmail } from '../api/email';
import AppShell from '../components/layout/AppShell';
import ApplePayButton from '../components/payments/ApplePayButton';
import AddPaymentMethodForm from '../components/payments/AddPaymentMethodForm';
import AddShippingAddressForm from '../components/payments/AddShippingAddressForm';
import { getStripe } from '../config/stripe';
import { PLACEHOLDER_IMAGE_URL } from '../utils/placeholders';

interface CheckoutState {
  auctionId: string;
  itemTitle: string;
  price: number;
  imageUrl: string;
  type: 'buy_now' | 'bid_won';
  sellerId: string;
  shippingCost?: number;
}

export default function CheckoutNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const checkoutData = location.state as CheckoutState;
  const stripePromise = getStripe();

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddShipping, setShowAddShipping] = useState(false);
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);

  // New credit card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const shippingCost = checkoutData?.shippingCost || 10.00;
  const subtotal = checkoutData?.price || 0;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shippingCost + tax;

  // Check Apple Pay availability
  useEffect(() => {
    if (window.ApplePaySession) {
      try {
        // In development (HTTP), show Apple Pay option for UI testing
        // In production (HTTPS), check if device can actually make payments
        if (window.location.protocol === 'https:') {
          const canMakePayments = window.ApplePaySession.canMakePayments();
          setIsApplePayAvailable(canMakePayments);
        } else {
          // Development mode - show UI but it won't actually work
          console.warn('Apple Pay requires HTTPS. Showing UI for development only.');
          setIsApplePayAvailable(true); // Show in dev for UI testing
        }
      } catch (err) {
        console.error('Error checking Apple Pay availability:', err);
        setIsApplePayAvailable(false);
      }
    }
  }, []);

  useEffect(() => {
    async function initCheckout() {
      if (!user) {
        navigate('/login');
        return;
      }

      if (!checkoutData) {
        const savedCheckout = localStorage.getItem('checkout_session');
        if (savedCheckout) {
          try {
            const parsed = JSON.parse(savedCheckout);
            if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              navigate('/checkout', { state: parsed.data, replace: true });
              return;
            } else {
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

      localStorage.setItem('checkout_session', JSON.stringify({
        data: checkoutData,
        timestamp: Date.now(),
      }));

      await loadData();
    }

    initCheckout();
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

  const handlePaymentAdded = async () => {
    setShowAddPayment(false);
    await loadData();
  };

  const handleShippingAdded = async () => {
    setShowAddShipping(false);
    await loadData();
  };

  const handleApplePaySuccess = async (paymentData: any) => {
    setProcessing(true);
    setError(null);

    try {
      let shippingAddressId = selectedShipping;

      // If no shipping address selected but Apple Pay provided one, create it
      if (!shippingAddressId && paymentData.shippingInfo) {
        const shippingInfo = paymentData.shippingInfo;

        // Create shipping address from Apple Pay data
        const newAddress = await shippingAddressesAPI.add({
          full_name: shippingInfo.fullName,
          address_line1: shippingInfo.addressLine1,
          address_line2: shippingInfo.addressLine2,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postal_code: shippingInfo.postalCode,
          country: shippingInfo.country,
          phone: shippingInfo.phone,
          is_default: shippingAddresses.length === 0, // Make default if first address
        });

        shippingAddressId = newAddress.id;
      }

      if (!shippingAddressId) {
        setError('Unable to process shipping information');
        return;
      }

      const orderResult = await ordersAPI.create({
        auctionId: checkoutData.auctionId,
        paymentMethodId: undefined,
        shippingAddressId: shippingAddressId,
        itemPrice: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        purchaseType: checkoutData.type,
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      try {
        const orderData = await ordersAPI.getById(orderResult.order_id!);
        if (orderData && user?.email) {
          await sendOrderConfirmationEmail(
            orderData,
            user.email,
            user.user_metadata?.full_name || user.email
          );
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      localStorage.removeItem('checkout_session');

      navigate('/order-success', {
        state: {
          orderId: orderResult.order_id,
          orderNumber: orderResult.order_number,
        },
      });
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

  const handleApplePayError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handlePlaceOrder = async () => {
    if (!selectedShipping) {
      setError('Please select a shipping address');
      return;
    }

    // If Apple Pay is selected, trigger Apple Pay instead
    if (selectedPayment === 'apple_pay') {
      // Apple Pay button will handle the payment
      return;
    }

    if (!selectedPayment) {
      setError('Please select a payment method');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const orderResult = await ordersAPI.create({
        auctionId: checkoutData.auctionId,
        paymentMethodId: selectedPayment,
        shippingAddressId: selectedShipping,
        itemPrice: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        purchaseType: checkoutData.type,
      });

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      try {
        const orderData = await ordersAPI.getById(orderResult.order_id!);
        if (orderData && user?.email) {
          const emailResult = await sendOrderConfirmationEmail(
            orderData,
            user.email,
            user.user_metadata?.full_name || user.email
          );

          if (!emailResult.success) {
            console.error('Failed to send confirmation email:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
      }

      localStorage.removeItem('checkout_session');

      navigate('/order-success', {
        state: {
          orderId: orderResult.order_id,
          orderNumber: orderResult.order_number,
        },
      });
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

  if (loading || !user) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 100px)' }}>
          <CircularProgress size={60} />
        </Container>
      </AppShell>
    );
  }

  if (!checkoutData) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">
            No checkout data found. Redirecting to home...
          </Alert>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 4, mb: 10 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'text.primary' }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Checkout
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Single Page Checkout - Like Nisplay */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          {/* Shipping Address Section */}
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Ship to
          </Typography>

          {showAddShipping ? (
            <AddShippingAddressForm
              onSuccess={handleShippingAdded}
              onCancel={() => setShowAddShipping(false)}
            />
          ) : shippingAddresses.length === 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Please add a shipping address to continue
              </Alert>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setShowAddShipping(true)}
              >
                + Add Shipping Address
              </Button>
            </Box>
          ) : (
            <Box>
              <RadioGroup value={selectedShipping} onChange={(e) => setSelectedShipping(e.target.value)}>
                {shippingAddresses.map((address) => (
                  <Paper
                    key={address.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      cursor: 'pointer',
                      border: 1,
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
                            {address.address_line2 && `, ${address.address_line2}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {address.city}, {address.state} {address.postal_code}, {address.country}
                          </Typography>
                          {address.phone && (
                            <Typography variant="body2" color="text.secondary">
                              {address.phone}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </Paper>
                ))}
              </RadioGroup>
              <Button
                variant="text"
                onClick={() => setShowAddShipping(true)}
                sx={{ mt: 1 }}
              >
                + Add New Address
              </Button>
            </Box>
          )}

          <Divider sx={{ my: 4 }} />

          {/* Payment Section */}
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Payment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            All transactions are secure and encrypted.
          </Typography>

          <RadioGroup value={selectedPayment} onChange={(e) => {
            setSelectedPayment(e.target.value);
            if (e.target.value === 'credit_card') {
              setShowCreditCardForm(true);
            } else {
              setShowCreditCardForm(false);
            }
          }}>
            {/* Credit Card Option */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: selectedPayment === 'credit_card' || (paymentMethods.length > 0 && paymentMethods.some(pm => pm.id === selectedPayment)) ? '#2e7d32' : 'divider',
                bgcolor: selectedPayment === 'credit_card' || (paymentMethods.length > 0 && paymentMethods.some(pm => pm.id === selectedPayment)) ? 'rgba(46, 125, 50, 0.04)' : 'transparent',
              }}
              onClick={() => {
                setSelectedPayment('credit_card');
                setShowCreditCardForm(true);
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Radio
                  checked={selectedPayment === 'credit_card' || (paymentMethods.length > 0 && paymentMethods.some(pm => pm.id === selectedPayment))}
                  value="credit_card"
                  sx={{
                    color: '#2e7d32',
                    '&.Mui-checked': {
                      color: '#2e7d32',
                    }
                  }}
                />
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    Credit card
                  </Typography>
                  <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" sx={{ height: 16 }} />
                  <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" sx={{ height: 16 }} />
                  <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_(2018).svg" alt="Amex" sx={{ height: 16 }} />
                  <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg" alt="Discover" sx={{ height: 16 }} />
                  <Typography variant="body2" color="text.secondary">+4</Typography>
                </Stack>
              </Stack>

              {/* Show credit card form when selected */}
              {selectedPayment === 'credit_card' && (
                <Box sx={{ mt: 3 }}>
                  <Stack spacing={2}>
                    {/* Card Number */}
                    <TextField
                      fullWidth
                      label="Card number"
                      variant="outlined"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 1234 1234 1234"
                      InputProps={{
                        endAdornment: <CreditCard sx={{ color: 'text.secondary' }} />,
                      }}
                    />

                    {/* Expiration Date and Security Code */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Expiration date (MM / YY)"
                          variant="outlined"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          placeholder="MM / YY"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Security code"
                          variant="outlined"
                          value={securityCode}
                          onChange={(e) => setSecurityCode(e.target.value)}
                          placeholder="CVV"
                          InputProps={{
                            endAdornment: (
                              <IconButton size="small">
                                <Typography variant="caption" color="text.secondary">?</Typography>
                              </IconButton>
                            ),
                          }}
                        />
                      </Grid>
                    </Grid>

                    {/* Name on Card */}
                    <TextField
                      fullWidth
                      label="Name on card"
                      variant="outlined"
                      value={nameOnCard}
                      onChange={(e) => setNameOnCard(e.target.value)}
                    />

                    {/* Use Shipping Address Checkbox */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={useSameAddress}
                          onChange={(e) => setUseSameAddress(e.target.checked)}
                          sx={{
                            color: '#2e7d32',
                            '&.Mui-checked': {
                              color: '#2e7d32',
                            }
                          }}
                        />
                      }
                      label="Use shipping address as billing address"
                    />

                    {/* Billing Address Form - Only show if not using same address */}
                    {!useSameAddress && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Billing address
                        </Typography>
                        <Stack spacing={2}>
                          {/* Country/Region */}
                          <FormControl fullWidth>
                            <InputLabel>Country/Region</InputLabel>
                            <Select
                              value={billingAddress.country}
                              label="Country/Region"
                              onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                            >
                              <MenuItem value="United States">United States</MenuItem>
                              <MenuItem value="Canada">Canada</MenuItem>
                              <MenuItem value="United Kingdom">United Kingdom</MenuItem>
                            </Select>
                          </FormControl>

                          {/* First Name */}
                          <TextField
                            fullWidth
                            label="First name"
                            value={billingAddress.firstName}
                            onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                          />

                          {/* Last Name */}
                          <TextField
                            fullWidth
                            label="Last name"
                            value={billingAddress.lastName}
                            onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                          />

                          {/* Company (optional) */}
                          <TextField
                            fullWidth
                            label="Company (optional)"
                            value={billingAddress.company}
                            onChange={(e) => setBillingAddress({ ...billingAddress, company: e.target.value })}
                          />

                          {/* Address */}
                          <TextField
                            fullWidth
                            label="Address"
                            value={billingAddress.address}
                            onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
                          />

                          {/* Apartment (optional) */}
                          <TextField
                            fullWidth
                            label="Apartment, suite, etc. (optional)"
                            value={billingAddress.apartment}
                            onChange={(e) => setBillingAddress({ ...billingAddress, apartment: e.target.value })}
                          />

                          {/* City */}
                          <TextField
                            fullWidth
                            label="City"
                            value={billingAddress.city}
                            onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                          />

                          {/* State and ZIP */}
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <FormControl fullWidth>
                                <InputLabel>State</InputLabel>
                                <Select
                                  value={billingAddress.state}
                                  label="State"
                                  onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                                >
                                  <MenuItem value="CA">California</MenuItem>
                                  <MenuItem value="NY">New York</MenuItem>
                                  <MenuItem value="TX">Texas</MenuItem>
                                  {/* Add more states as needed */}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                label="ZIP code"
                                value={billingAddress.zipCode}
                                onChange={(e) => setBillingAddress({ ...billingAddress, zipCode: e.target.value })}
                              />
                            </Grid>
                          </Grid>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* PayPal Option */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: selectedPayment === 'paypal' ? '#2e7d32' : 'divider',
                bgcolor: selectedPayment === 'paypal' ? 'rgba(46, 125, 50, 0.04)' : 'transparent',
              }}
              onClick={() => {
                setSelectedPayment('paypal');
                setShowCreditCardForm(false);
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Radio
                  checked={selectedPayment === 'paypal'}
                  value="paypal"
                  sx={{
                    color: '#2e7d32',
                    '&.Mui-checked': {
                      color: '#2e7d32',
                    }
                  }}
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body1" fontWeight={600}>
                    PayPal
                  </Typography>
                  <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" sx={{ height: 20 }} />
                </Stack>
              </Stack>
            </Paper>

            {/* Apple Pay Option - Only for buy_now and when available */}
            {checkoutData?.type === 'buy_now' && isApplePayAvailable && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 2,
                  cursor: 'pointer',
                  border: 2,
                  borderColor: selectedPayment === 'apple_pay' ? '#2e7d32' : 'divider',
                  bgcolor: selectedPayment === 'apple_pay' ? 'rgba(46, 125, 50, 0.04)' : 'transparent',
                }}
                onClick={() => {
                  setSelectedPayment('apple_pay');
                  setShowCreditCardForm(false);
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Radio
                    checked={selectedPayment === 'apple_pay'}
                    value="apple_pay"
                    sx={{
                      color: '#2e7d32',
                      '&.Mui-checked': {
                        color: '#2e7d32',
                      }
                    }}
                  />
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body1" fontWeight={600}>
                      Apple Pay
                    </Typography>
                    <Box
                      component="img"
                      src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
                      alt="Apple Pay"
                      sx={{ height: 20 }}
                    />
                  </Stack>
                </Stack>

                {selectedPayment === 'apple_pay' && (
                  <Box sx={{ mt: 2 }}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Apple Pay will collect your shipping and payment information in one step
                    </Alert>
                    <ApplePayButton
                      amount={total}
                      label={`${checkoutData.itemTitle}`}
                      onSuccess={handleApplePaySuccess}
                      onError={handleApplePayError}
                      disabled={processing}
                    />
                  </Box>
                )}
              </Paper>
            )}
          </RadioGroup>

          <Divider sx={{ my: 4 }} />

          {/* Order Summary */}
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Order summary
          </Typography>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ p: 2 }}>
              <CardMedia
                component="img"
                image={checkoutData.imageUrl || PLACEHOLDER_IMAGE_URL}
                alt={checkoutData.itemTitle}
                sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
              />
              <CardContent sx={{ flex: 1, p: 0, '&:last-child': { pb: 0 } }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {checkoutData.itemTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {checkoutData.type === 'buy_now' ? 'Buy Now Price' : 'Winning Bid'}
                </Typography>
                <Typography variant="h6" color="primary" fontWeight={600}>
                  ${subtotal.toFixed(2)}
                </Typography>
              </CardContent>
            </Stack>
          </Card>

          {/* Price Breakdown */}
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Subtotal</Typography>
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
              <Typography variant="body2">Estimated taxes</Typography>
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

          {/* Place Order Button */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handlePlaceOrder}
            disabled={processing || !selectedShipping || !selectedPayment}
            startIcon={processing && <CircularProgress size={20} />}
            sx={{ mt: 4 }}
          >
            {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </Button>
        </Paper>
      </Container>
    </AppShell>
  );
}
