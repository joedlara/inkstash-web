import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Grid,
} from '@mui/material';
import {
  History,
  CheckCircle,
  LocalShipping,
  Schedule,
  Receipt,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient'

interface Order {
  id: string;
  auction_id: string;
  total_price: number;
  status: string;
  created_at: string;
  auctions: {
    id: string;
    title: string;
    image_url: string;
  };
}

export default function PurchaseHistoryTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          auction_id,
          total_price,
          status,
          created_at,
          auctions (
            id,
            title,
            image_url
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setOrders((data || []) as Order[]);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load purchase history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string): {
    label: string;
    color: 'success' | 'error' | 'warning' | 'info' | 'default';
    icon: React.ReactNode;
  } => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          color: 'success',
          icon: <CheckCircle fontSize="small" />,
        };
      case 'shipped':
        return {
          label: 'Shipped',
          color: 'info',
          icon: <LocalShipping fontSize="small" />,
        };
      case 'pending':
        return {
          label: 'Pending',
          color: 'warning',
          icon: <Schedule fontSize="small" />,
        };
      default:
        return {
          label: status,
          color: 'default',
          icon: <Receipt fontSize="small" />,
        };
    }
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
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Purchase History
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {orders.length} {orders.length === 1 ? 'purchase' : 'purchases'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <History sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            No Purchase History
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't made any purchases yet. Browse our collectibles to find something you love!
          </Typography>
          <Button variant="contained" onClick={() => navigate('/browse-featured')}>
            Browse Collectibles
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {orders.map((order) => {
            if (!order.auctions) return null;

            const auction = order.auctions;
            const statusConfig = getStatusConfig(order.status);

            return (
              <Card key={order.id} elevation={2}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Item Image */}
                    <Grid item xs={12} sm={2}>
                      <Box
                        component="img"
                        src={auction.image_url || 'https://via.placeholder.com/150'}
                        alt={auction.title}
                        sx={{
                          width: '100%',
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => navigate(`/order/${order.id}`)}
                      />
                    </Grid>

                    {/* Order Details */}
                    <Grid item xs={12} sm={7}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        {auction.title}
                      </Typography>
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Order #{order.id.substring(0, 8).toUpperCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(order.created_at).toLocaleDateString()}
                        </Typography>
                      </Stack>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        ${Number(order.total_price).toFixed(2)}
                      </Typography>
                    </Grid>

                    {/* Status and Actions */}
                    <Grid item xs={12} sm={3}>
                      <Stack spacing={2} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          color={statusConfig.color}
                          sx={{ fontWeight: 600 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => navigate(`/order/${order.id}`)}
                        >
                          View Details
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
