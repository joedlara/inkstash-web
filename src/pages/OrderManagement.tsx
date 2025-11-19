import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  LocalShipping,
  CheckCircle,
  Cancel,
  Edit,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { ordersAPI, type Order } from '../api/orders';
import { sendShippingNotificationEmail } from '../api/email';
import DashboardHeader from '../components/home/DashboardHeader';

export default function OrderManagement() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // Update form state
  const [newStatus, setNewStatus] = useState<Order['status']>('processing');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!orderId) {
      navigate('/purchases');
      return;
    }

    loadOrder();
  }, [user, orderId, navigate]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderData = await ordersAPI.getById(orderId!);

      if (!orderData) {
        setError('Order not found');
        return;
      }

      // Check if user is the seller
      if (orderData.seller_id !== user?.id) {
        setError('You are not authorized to manage this order');
        return;
      }

      setOrder(orderData);
      setNewStatus(orderData.status);
      setTrackingNumber(orderData.tracking_number || '');
      setCarrier(orderData.carrier || '');
    } catch (err) {
      console.error('Error loading order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order) return;

    // Validate tracking info for shipped status
    if (newStatus === 'shipped' && (!trackingNumber || !carrier)) {
      setError('Please provide tracking number and carrier for shipped orders');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      // Update order status
      const trackingInfo = newStatus === 'shipped'
        ? { trackingNumber, carrier }
        : undefined;

      const updatedOrder = await ordersAPI.updateStatus(
        order.id,
        newStatus,
        trackingInfo
      );

      // Send shipping notification email if status changed to shipped
      if (newStatus === 'shipped' && user?.email) {
        try {
          const auction = Array.isArray(updatedOrder.auctions)
            ? updatedOrder.auctions[0]
            : updatedOrder.auctions;

          if (auction) {
            await sendShippingNotificationEmail({
              userEmail: user.email,
              userName: updatedOrder.shipping_full_name,
              orderNumber: updatedOrder.order_number,
              itemTitle: auction.title,
              itemImageUrl: auction.image_url,
              trackingNumber: trackingNumber,
              carrier: carrier,
              shippingAddress: {
                fullName: updatedOrder.shipping_full_name,
                addressLine1: updatedOrder.shipping_address_line1,
                addressLine2: updatedOrder.shipping_address_line2,
                city: updatedOrder.shipping_city,
                state: updatedOrder.shipping_state,
                postalCode: updatedOrder.shipping_postal_code,
                country: updatedOrder.shipping_country,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send shipping notification:', emailError);
          // Don't fail the update if email fails
        }
      }

      setOrder(updatedOrder);
      setShowUpdateDialog(false);
      setError(null);
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Failed to update order status');
    } finally {
      setUpdating(false);
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

  if (error && !order) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/purchases')}>
            Back to Orders
          </Button>
        </Container>
      </Box>
    );
  }

  if (!order) return null;

  const auction = Array.isArray(order.auctions) ? order.auctions[0] : order.auctions;

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'processing': return 'info';
      case 'shipped': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled':
      case 'refunded': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/purchases')}
              variant="outlined"
            >
              Back
            </Button>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Manage Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Order #{order.order_number}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setShowUpdateDialog(true)}
          >
            Update Status
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Column */}
          <Box sx={{ flex: 2 }}>
            {/* Order Status */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Order Status
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Current Status
                  </Typography>
                  <Box
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: 1,
                      bgcolor: `${getStatusColor(order.status)}.light`,
                      color: `${getStatusColor(order.status)}.contrastText`,
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Typography>
                  </Box>
                </Stack>

                {order.status === 'shipped' && order.tracking_number && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Tracking Number
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {order.tracking_number}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Carrier
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {order.carrier}
                      </Typography>
                    </Stack>
                  </>
                )}

                {order.shipped_at && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Shipped Date
                    </Typography>
                    <Typography variant="body2">
                      {new Date(order.shipped_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                )}

                {order.delivered_at && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Delivered Date
                    </Typography>
                    <Typography variant="body2">
                      {new Date(order.delivered_at).toLocaleDateString()}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Customer Details */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Customer Information
              </Typography>
              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Shipping Address
                  </Typography>
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
                </Box>

                {order.shipping_phone && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Phone
                    </Typography>
                    <Typography variant="body2">{order.shipping_phone}</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>

          {/* Right Column */}
          <Box sx={{ flex: 1 }}>
            {/* Item Details */}
            {auction && (
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Item Details
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
                      {order.purchase_type === 'buy_now' ? 'Buy Now Purchase' : 'Auction Win'}
                    </Typography>
                  </CardContent>
                </Card>
              </Paper>
            )}

            {/* Order Summary */}
            <Paper elevation={2} sx={{ p: 3 }}>
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
          </Box>
        </Box>

        {/* Update Status Dialog */}
        <Dialog open={showUpdateDialog} onClose={() => !updating && setShowUpdateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Order Status</InputLabel>
                <Select
                  value={newStatus}
                  label="Order Status"
                  onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                  disabled={updating}
                >
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>

              {newStatus === 'shipped' && (
                <>
                  <TextField
                    fullWidth
                    label="Tracking Number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    required
                    disabled={updating}
                    placeholder="Enter tracking number"
                  />
                  <TextField
                    fullWidth
                    label="Carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    required
                    disabled={updating}
                    placeholder="e.g., USPS, FedEx, UPS"
                  />
                </>
              )}

              <Alert severity="info">
                {newStatus === 'shipped'
                  ? 'The customer will receive an email notification with tracking information.'
                  : `The order status will be updated to "${newStatus}".`}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUpdateDialog(false)} disabled={updating}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              variant="contained"
              disabled={updating}
              startIcon={updating ? <CircularProgress size={20} /> : null}
            >
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
