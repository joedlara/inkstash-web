import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from '@mui/material';
import {
  Gavel,
  CheckCircle,
  Cancel,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { getMyBids, type Bid } from '../api/auctions/bids';
import { useAuth } from '../hooks/useAuth';

export default function MyBids() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadBids();
  }, [user, navigate]);

  const loadBids = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyBids();
      setBids(data);
    } catch (err) {
      console.error('Error loading bids:', err);
      setError('Failed to load your bids');
    } finally {
      setLoading(false);
    }
  };

  const getBidStatus = (bid: Bid): {
    label: string;
    color: 'success' | 'error' | 'warning' | 'info';
    icon: React.ReactNode;
  } => {
    if (!bid.auctions) {
      return {
        label: 'Unknown',
        color: 'info',
        icon: <Schedule fontSize="small" />,
      };
    }

    const auction = bid.auctions;
    const isEnded = new Date(auction.end_time) < new Date();
    const isWinning = bid.amount === auction.current_bid;
    const isSold = auction.status === 'sold';

    if (isSold) {
      if (isWinning) {
        return {
          label: 'Won',
          color: 'success',
          icon: <CheckCircle fontSize="small" />,
        };
      } else {
        return {
          label: 'Lost',
          color: 'error',
          icon: <Cancel fontSize="small" />,
        };
      }
    }

    if (isEnded) {
      if (isWinning) {
        return {
          label: 'Won',
          color: 'success',
          icon: <CheckCircle fontSize="small" />,
        };
      } else {
        return {
          label: 'Outbid',
          color: 'error',
          icon: <Cancel fontSize="small" />,
        };
      }
    }

    if (isWinning) {
      return {
        label: 'Winning',
        color: 'success',
        icon: <TrendingUp fontSize="small" />,
      };
    } else {
      return {
        label: 'Outbid',
        color: 'warning',
        icon: <Cancel fontSize="small" />,
      };
    }
  };

  const formatTimeRemaining = (endTime: string): string => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="lg" sx={{ py: 4, mt: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Gavel sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" component="h1" fontWeight="bold">
              My Bids
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Track all your bids and see which auctions you're winning
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {bids.length === 0 ? (
          <Paper
            elevation={2}
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'background.paper',
            }}
          >
            <Gavel sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              No Bids Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You haven't placed any bids yet. Browse our auctions to start bidding!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {bids.map((bid) => {
              if (!bid.auctions) return null;

              const auction = bid.auctions;
              const status = getBidStatus(bid);
              const timeRemaining = formatTimeRemaining(auction.end_time);

              return (
                <Grid item xs={12} sm={6} md={4} key={bid.id}>
                  <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardActionArea onClick={() => navigate(`/item/${auction.id}`)}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={auction.image_url || 'https://via.placeholder.com/300'}
                        alt={auction.title}
                        sx={{ objectFit: 'cover' }}
                      />
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom fontWeight={600} noWrap>
                          {auction.title}
                        </Typography>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Bid Status */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Status
                          </Typography>
                          <Chip
                            icon={status.icon}
                            label={status.label}
                            color={status.color}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Stack>

                        {/* Your Bid */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Your Bid
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            ${bid.amount.toFixed(2)}
                          </Typography>
                        </Stack>

                        {/* Current Bid */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Current Bid
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            ${auction.current_bid.toFixed(2)}
                          </Typography>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Time Remaining */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="caption" color="text.secondary">
                            {timeRemaining === 'Ended' ? 'Auction ended' : 'Time remaining'}
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color={timeRemaining === 'Ended' ? 'text.disabled' : 'primary'}
                          >
                            {timeRemaining}
                          </Typography>
                        </Stack>

                        {/* Bid Placed Time */}
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                          Bid placed {new Date(bid.created_at).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
