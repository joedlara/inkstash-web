import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  Chip,
  Grid,
  Stack,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Star, Verified } from '@mui/icons-material';
import { supabase } from '../api/supabase/supabaseClient';
import { cache } from '../utils/cache';
import DashboardHeader from '../components/home/DashboardHeader';

interface FeaturedItem {
  id: string;
  title: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  end_time: string;
  seller_id: string;
  seller_username?: string;
  seller_avatar?: string;
  seller_verified?: boolean;
  bid_count?: number;
  category: string;
}

export default function BrowseFeatured() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'price' | 'ending' | 'bids'>('price');
  const hasFetched = useRef(false);

  useEffect(() => {
    async function fetchFeaturedItems() {
      // Check cache first
      const cacheKey = `browse-featured-${sortBy}`;
      const cachedData = cache.get<FeaturedItem[]>(cacheKey);

      if (cachedData) {
        setItems(cachedData);
        setLoading(false);
        return;
      }

      // Prevent multiple fetches
      if (hasFetched.current) {
        return;
      }

      hasFetched.current = true;

      try {
        // Determine sort column based on sortBy
        let orderColumn = 'current_bid';
        if (sortBy === 'ending') orderColumn = 'end_time';
        if (sortBy === 'bids') orderColumn = 'bid_count';

        // Fetch auctions
        const { data: auctionData, error } = await supabase
          .from('auctions')
          .select('id, title, image_url, current_bid, buy_now_price, end_time, seller_id, bid_count, category')
          .eq('is_featured', true)
          .order(orderColumn, { ascending: sortBy === 'ending' })
          .limit(50);

        if (error) {
          throw error;
        }

        if (!auctionData || auctionData.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Fetch seller info
        const sellerIds = [...new Set(auctionData.map(item => item.seller_id))];
        const { data: sellersData, error: sellersError } = await supabase
          .from('users')
          .select('*')
          .in('id', sellerIds);

        if (sellersError) {
          console.error('Error fetching sellers:', sellersError);
          // Continue with auction data even if sellers fail to load
        }

        // Create seller map
        const sellersMap: Record<string, { username: string; avatar_url: string | null; verified: boolean }> = {};
        if (sellersData) {
          sellersData.forEach((seller: any) => {
            sellersMap[seller.id] = {
              username: seller.username || seller.email?.split('@')[0] || 'Unknown',
              avatar_url: seller.avatar_url || null,
              verified: seller.is_verified || seller.verified || false,
            };
          });
        }

        // Map items with seller info
        const itemsWithDetails: FeaturedItem[] = auctionData.map((item) => ({
          ...item,
          seller_username: sellersMap[item.seller_id]?.username || 'Unknown',
          seller_avatar: sellersMap[item.seller_id]?.avatar_url || null,
          seller_verified: sellersMap[item.seller_id]?.verified || false,
          bid_count: item.bid_count || 0,
        }));

        // Cache the data for 5 minutes
        cache.set(cacheKey, itemsWithDetails, 5 * 60 * 1000);

        setItems(itemsWithDetails);
        setLoading(false);
      } catch (error) {
        setItems([]);
        setLoading(false);
        hasFetched.current = false;
      }
    }

    // Reset hasFetched when sortBy changes
    hasFetched.current = false;
    fetchFeaturedItems();
  }, [sortBy]);

  const calculateTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

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
            Featured Collectibles
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Discover handpicked items from verified sellers
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <ToggleButtonGroup
            value={sortBy}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) setSortBy(newValue);
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                px: 2.5,
                py: 1,
              },
            }}
          >
            <ToggleButton value="price">Highest Price</ToggleButton>
            <ToggleButton value="ending">Ending Soon</ToggleButton>
            <ToggleButton value="bids">Most Bids</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {loading ? 'Loading...' : `${items.length} items`}
          </Typography>
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Card>
                  <Skeleton variant="rectangular" height={370} />
                  <CardContent>
                    <Skeleton width="80%" height={24} sx={{ mb: 1 }} />
                    <Skeleton width="60%" height={20} sx={{ mb: 2 }} />
                    <Skeleton width="40%" height={28} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12 }}>
            <Star
              sx={{
                fontSize: 120,
                color: 'text.disabled',
                mb: 3,
              }}
            />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              No Featured Items
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Check back later for featured collectibles
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
              Back to Home
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {items.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
                <Card
                  onClick={() => navigate(`/item/${item.id}`)}
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
                        item.image_url ||
                        'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png'
                      }
                      alt={item.title}
                      sx={{ objectFit: 'cover', bgcolor: 'grey.100', width: '100%' }}
                    />
                    <Chip
                      icon={<Star sx={{ fontSize: 14 }} />}
                      label="Featured"
                      size="small"
                      color="warning"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        fontWeight: 600,
                      }}
                    />
                    <Chip
                      label={calculateTimeRemaining(item.end_time)}
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
                  </Box>

                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                      {item.title}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        By
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {item.seller_username}
                      </Typography>
                      {item.seller_verified && (
                        <Verified sx={{ fontSize: 14, color: 'success.main' }} />
                      )}
                    </Stack>

                    <Box>
                      <Typography variant="h6" color="primary" fontWeight={700}>
                        ${item.current_bid.toFixed(0)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
