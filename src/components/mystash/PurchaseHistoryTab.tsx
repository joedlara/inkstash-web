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
import { getMyWonBids, type Bid } from '../../api/auctions/bids';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

export default function PurchaseHistoryTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [wonBids, setWonBids] = useState<Bid[]>([]);
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
      const [purchasesData, salesData, wonBidsData] = await Promise.all([
        ordersAPI.getMyPurchases(),
        ordersAPI.getMySales(),
        getMyWonBids(),
      ]);
      setPurchases(purchasesData);
      setSales(salesData);
      setWonBids(wonBidsData);
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
    const listing = Array.isArray(order.listings) ? order.listings[0] : order.listings;

    const itemTitle = auction?.title ?? listing?.title ?? 'Order item';
    const itemImage =
      auction?.image_url ??
      listing?.photos?.[0]?.url ??
      PLACEHOLDER_IMAGE_URL;
    const itemHref = auction
      ? `/item/${auction.id}`
      : listing
        ? `/item/${listing.id}`
        : `/order/${order.id}`;

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
          <CardMedia
            component="img"
            sx={{
              width: { xs: '100%', sm: 200 },
              height: { xs: 200, sm: 150 },
              objectFit: 'cover',
            }}
            image={itemImage}
            alt={itemTitle}
            onClick={() => navigate(itemHref)}
          />

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
              <Typography variant="h6" fontWeight={600} onClick={() => navigate(itemHref)}>
                {itemTitle}
              </Typography>

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

  const WonBidCard = ({ bid }: { bid: Bid }) => {
    if (!bid.auctions) return null;

    const auction = bid.auctions;

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
          <CardMedia
            component="img"
            sx={{
              width: { xs: '100%', sm: 200 },
              height: { xs: 200, sm: 150 },
              objectFit: 'cover',
            }}
            image={auction.image_url || PLACEHOLDER_IMAGE_URL}
            alt={auction.title}
          />

          <Box sx={{ flex: 1, p: 2 }}>
            <Stack spacing={1}>
              {/* Bid Type and Status */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary">
                  Won Bid
                </Typography>
                <Chip
                  label="Auction Won"
                  color="success"
                  size="small"
                  icon={<CheckCircle fontSize="small" />}
                />
              </Stack>

              {/* Item Title */}
              <Typography variant="h6" fontWeight={600}>
                {auction.title}
              </Typography>

              {/* Won Date */}
              <Typography variant="body2" color="text.secondary">
                Won on {new Date(auction.end_time).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>

              <Divider />

              {/* Winning Bid Amount and Actions */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  ${bid.amount.toFixed(2)}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => navigate(`/item/${auction.id}`)}
                >
                  View Item
                </Button>
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
            label={`Purchases (${purchases.length + wonBids.length})`}
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
          {purchases.length === 0 && wonBids.length === 0 ? (
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
              {/* Won Bids Section */}
              {wonBids.length > 0 && (
                <>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Won Auctions ({wonBids.length})
                  </Typography>
                  {wonBids.map((bid) => (
                    <WonBidCard key={bid.id} bid={bid} />
                  ))}
                  {purchases.length > 0 && <Divider sx={{ my: 3 }} />}
                </>
              )}

              {/* Regular Orders Section */}
              {purchases.length > 0 && (
                <>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                    Direct Purchases ({purchases.length})
                  </Typography>
                  {purchases.map((order) => (
                    <OrderCard key={order.id} order={order} isSeller={false} />
                  ))}
                </>
              )}
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
