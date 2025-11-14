import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Stack,
} from '@mui/material';
import { Bookmark } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { getUserSavedAuctions } from '../api/auctions/auctionInteractions';
import DashboardHeader from '../components/home/DashboardHeader';
import { cache } from '../utils/cache';

interface Auction {
  id: string;
  title: string;
  description: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  end_time: string;
  category: string;
  artist?: string;
  seller_id: string;
  us_shipping: number;
  international_shipping: number;
  status?: 'active' | 'sold' | 'ended' | 'cancelled';
}

interface SavedAuction {
  auction_id: string;
  created_at: string;
  auctions: Auction | Auction[];
}

export default function SavedItems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchSavedItems() {
      if (!user) {
        setError('Please log in to view your saved items');
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = `saved-items-${user.id}`;
      const cachedData = cache.get<SavedAuction[]>(cacheKey);

      if (cachedData) {
        setSavedItems(cachedData);
        setLoading(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetched.current) {
        return;
      }

      hasFetched.current = true;

      try {
        const data = await getUserSavedAuctions(user.id);

        // Store in cache for 5 minutes
        cache.set(cacheKey, data, 5 * 60 * 1000);
        setSavedItems(data);
      } catch (err) {
        setError('Failed to load saved items. Please try again.');
        hasFetched.current = false; // Allow retry on error
      } finally {
        setLoading(false);
      }
    }

    fetchSavedItems();
  }, [user]);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const distance = end - now;

    if (distance < 0) {
      return 'Ended';
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (!user) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Box
          sx={{
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 2, md: 4 },
            py: 8,
            mt: '70px',
          }}
        >
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Please Log In
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You need to be logged in to view your saved items.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Box
          sx={{
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 2, md: 4 },
            py: 8,
            mt: '70px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 70px)',
          }}
        >
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Box
          sx={{
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 2, md: 4 },
            py: 8,
            mt: '70px',
          }}
        >
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Error
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back to Home
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Box
        sx={{
          maxWidth: 1600,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 8,
          mt: '70px',
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Saved Items
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'}
          </Typography>
        </Box>

        {savedItems.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              px: 4,
            }}
          >
            <Bookmark
              sx={{
                fontSize: 120,
                color: 'text.disabled',
                mb: 3,
              }}
            />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              No Saved Items Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Start saving items you're interested in by clicking the bookmark icon on any auction.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 999,
              }}
            >
              Browse Auctions
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {savedItems.map((item) => {
              const auction = Array.isArray(item.auctions) ? item.auctions[0] : item.auctions;
              if (!auction) return null;

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.auction_id}>
                  <Card
                    onClick={() => navigate(`/item/${item.auction_id}`)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="370"
                        image={
                          auction.image_url ||
                          'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'
                        }
                        alt={auction.title}
                        sx={{ objectFit: 'cover', bgcolor: 'grey.100', width: '100%' }}
                      />
                      {auction.status === 'sold' ? (
                        <Chip
                          label="SOLD"
                          size="small"
                          color="error"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            fontWeight: 700,
                            fontSize: '0.875rem',
                          }}
                        />
                      ) : (
                        <Chip
                          label={calculateTimeRemaining(auction.end_time)}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            bgcolor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>

                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                        {auction.title}
                      </Typography>

                      {auction.artist && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {auction.artist}
                        </Typography>
                      )}

                      <Stack direction="row" spacing={2} sx={{ mt: 2 }} justifyContent="space-between">
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Current Bid
                          </Typography>
                          <Typography variant="h6" color="primary" fontWeight={700}>
                            ${auction.current_bid}
                          </Typography>
                        </Box>

                        {auction.buy_now_price && (
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Buy Now
                            </Typography>
                            <Typography variant="h6" fontWeight={600}>
                              ${auction.buy_now_price}
                            </Typography>
                          </Box>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
                        <Chip label={auction.category} size="small" variant="outlined" />
                        <Typography variant="caption" color="text.secondary">
                          Saved {new Date(item.created_at).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
