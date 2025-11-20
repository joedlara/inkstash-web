import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Tabs,
  Tab,
  Paper,
  Button,
  Divider,
} from '@mui/material';
import {
  ShoppingBag,
  LocalShipping,
  CheckCircle,
  Cancel,
  Visibility,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { ordersAPI, type Order } from '../../api/orders';

export default function PurchaseHistoryTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [purchasesData, salesData] = await Promise.all([
        ordersAPI.getMyPurchases(),
        ordersAPI.getMySales(),
      ]);
      setPurchases(purchasesData);
      setSales(salesData);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'refunded':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'processing':
        return <ShoppingBag fontSize="small" />;
      case 'shipped':
        return <LocalShipping fontSize="small" />;
      case 'delivered':
        return <CheckCircle fontSize="small" />;
      case 'cancelled':
      case 'refunded':
        return <Cancel fontSize="small" />;
      default:
        return null;
    }
  };

  const OrderCard = ({ order, isSeller = false }: { order: Order; isSeller?: boolean }) => {
    const auction = Array.isArray(order.auctions) ? order.auctions[0] : order.auctions;

    return (
      <Card
        variant="outlined"
        sx={{
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: 3,
            borderColor: 'primary.main',
          },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* Image */}
          {auction && (
            <CardMedia
              component="img"
              sx={{
                width: { xs: '100%', sm: 200 },
                height: { xs: 200, sm: 150 },
                objectFit: 'cover',
              }}
              image={auction.image_url || 'https://via.placeholder.com/200x150'}
              alt={auction.title}
            />
          )}

          {/* Content */}
          <Box sx={{ flex: 1, p: 2 }}>
            <Stack spacing={1}>
              {/* Order Number and Status */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Order #{order.order_number}
                </Typography>
                <Chip
                  label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  color={getStatusColor(order.status)}
                  size="small"
                  icon={getStatusIcon(order.status)}
                />
              </Stack>

              {/* Item Title */}
              {auction && (
                <Typography variant="h6" fontWeight={600}>
                  {auction.title}
                </Typography>
              )}

              {/* Order Date */}
              <Typography variant="body2" color="text.secondary">
                Ordered on {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>

              {/* Tracking Info */}
              {order.tracking_number && (
                <Typography variant="body2" color="primary">
                  Tracking: {order.tracking_number} ({order.carrier})
                </Typography>
              )}

              <Divider />

              {/* Total and Actions */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  ${order.total.toFixed(2)}
                </Typography>
                {isSeller ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Settings />}
                    onClick={() => navigate(`/order/${order.id}`)}
                  >
                    Manage Order
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => navigate(`/order/${order.id}`)}
                  >
                    View Details
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          My Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your purchases and sales
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={2} sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label={`Purchases (${purchases.length})`}
            icon={<ShoppingBag />}
            iconPosition="start"
          />
          <Tab
            label={`Sales (${sales.length})`}
            icon={<LocalShipping />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Purchases Tab */}
      {activeTab === 0 && (
        <Box>
          {purchases.length === 0 ? (
            <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
              <ShoppingBag sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No purchases yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start shopping to see your purchases here
              </Typography>
              <Button variant="contained" onClick={() => navigate('/')}>
                Browse Items
              </Button>
            </Paper>
          ) : (
            <Box>
              {purchases.map((order) => (
                <OrderCard key={order.id} order={order} isSeller={false} />
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Sales Tab */}
      {activeTab === 1 && (
        <Box>
          {sales.length === 0 ? (
            <Paper elevation={1} sx={{ p: 6, textAlign: 'center' }}>
              <LocalShipping sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No sales yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                When someone purchases your items, they'll appear here
              </Typography>
              <Button variant="contained" onClick={() => navigate('/sell')}>
                Create Listing
              </Button>
            </Paper>
          ) : (
            <Box>
              {sales.map((order) => (
                <OrderCard key={order.id} order={order} isSeller={true} />
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
