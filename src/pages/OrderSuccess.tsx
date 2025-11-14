import { useEffect, useState } from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Home,
  Receipt,
  LocalShipping,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI, type Order } from '../api/orders';
import DashboardHeader from '../components/home/DashboardHeader';

interface OrderSuccessState {
  orderId?: string;
  orderNumber?: string;
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const orderState = location.state as OrderSuccessState;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!orderState?.orderId && !orderState?.orderNumber) {
      navigate('/');
      return;
    }

    loadOrder();
  }, [user, orderState, navigate]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      let orderData: Order | null = null;

      if (orderState.orderId) {
        orderData = await ordersAPI.getById(orderState.orderId);
      } else if (orderState.orderNumber) {
        orderData = await ordersAPI.getByOrderNumber(orderState.orderNumber);
      }

      if (!orderData) {
        setError('Order not found');
        return;
      }

      setOrder(orderData);
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

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

  if (error || !order) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || 'Order not found'}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </Container>
      </Box>
    );
  }

  const auction = Array.isArray(order.auctions) ? order.auctions[0] : order.auctions;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="md" sx={{ py: 4, mt: 8 }}>
        {/* Success Header */}
        <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CheckCircle sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            Order Successful!
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Thank you for your purchase
          </Typography>
        </Paper>

        {/* Order Details */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Order Details
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Order Number
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {order.order_number}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Order Date
              </Typography>
              <Typography variant="body1">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary">
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Item Purchased */}
        {auction && (
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Item Purchased
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Card variant="outlined">
              <CardMedia
                component="img"
                height="200"
                image={auction.image_url || 'https://via.placeholder.com/400x200'}
                alt={auction.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {auction.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.purchase_type === 'buy_now' ? 'Buy Now Purchase' : 'Winning Bid'}
                </Typography>
              </CardContent>
            </Card>
          </Paper>
        )}

        {/* Price Summary */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Order Summary
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Item Price</Typography>
              <Typography variant="body2" fontWeight={600}>
                ${order.item_price.toFixed(2)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Shipping</Typography>
              <Typography variant="body2" fontWeight={600}>
                ${order.shipping_cost.toFixed(2)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Tax</Typography>
              <Typography variant="body2" fontWeight={600}>
                ${order.tax.toFixed(2)}
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">
                Total
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="primary">
                ${order.total.toFixed(2)}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Shipping Address */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LocalShipping color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Shipping Address
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" fontWeight={600}>
            {order.shipping_full_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order.shipping_address_line1}
          </Typography>
          {order.shipping_address_line2 && (
            <Typography variant="body2" color="text.secondary">
              {order.shipping_address_line2}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order.shipping_country}
          </Typography>
          {order.shipping_phone && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Phone: {order.shipping_phone}
            </Typography>
          )}
        </Paper>

        {/* Confirmation Message */}
        <Alert severity="info" icon={<Receipt />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            A confirmation email with your order details has been sent to your email address.
            You can track your order status from your purchases page.
          </Typography>
        </Alert>

        {/* Action Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Receipt />}
            onClick={() => navigate('/purchases')}
            fullWidth
          >
            View My Purchases
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            fullWidth
          >
            Continue Shopping
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
