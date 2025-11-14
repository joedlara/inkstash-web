import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  Stack,
  CircularProgress,
  Button,
} from '@mui/material';
import { TrendingUp, LocalFireDepartment } from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { supabase } from '../api/supabase/supabaseClient';

interface Show {
  id: string;
  name: string;
  image_url: string;
  total_items: number;
  total_value: number;
  category: string;
  trending: boolean;
}

export default function PopularShows() {
  const navigate = useNavigate();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['All', 'Action Figures', 'Comics', 'Trading Cards', 'Video Games', 'Anime', 'Movies'];

  useEffect(() => {
    fetchPopularShows();
  }, []);

  const fetchPopularShows = async () => {
    try {
      // Get all auctions and group by category
      const { data: auctions, error } = await supabase
        .from('auctions')
        .select('category, current_bid, image_url')
        .order('current_bid', { ascending: false });

      if (error) throw error;

      // Group by category and create show data
      const categoryMap = new Map<string, { items: typeof auctions; totalValue: number }>();

      auctions?.forEach((auction) => {
        const category = auction.category || 'General';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { items: [], totalValue: 0 });
        }
        const categoryData = categoryMap.get(category)!;
        categoryData.items.push(auction);
        categoryData.totalValue += auction.current_bid || 0;
      });

      // Create show objects from categories
      const showsData: Show[] = Array.from(categoryMap.entries()).map(([category, data], index) => ({
        id: category.toLowerCase().replace(/\s+/g, '-'),
        name: category,
        image_url: data.items[0]?.image_url || 'https://via.placeholder.com/400x600',
        total_items: data.items.length,
        total_value: data.totalValue,
        category: category,
        trending: index < 3, // Mark top 3 as trending
      }));

      // Sort by total value
      showsData.sort((a, b) => b.total_value - a.total_value);

      setShows(showsData);
    } catch (error) {
      console.error('Error fetching popular shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredShows = selectedCategory === 'all'
    ? shows
    : shows.filter(show => show.category.toLowerCase() === selectedCategory.toLowerCase());

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <DashboardHeader />
        <Container maxWidth="xl" sx={{ mt: 12, py: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress size={60} />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ mt: 12, py: 8 }}>
        {/* Header */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <LocalFireDepartment sx={{ fontSize: 40, color: 'error.main' }} />
            <Typography variant="h3" fontWeight={700}>
              Popular Shows
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800 }}>
            Explore the most popular TV shows, movies, and franchises with collectibles available on InkStash. Find rare items from your favorite series.
          </Typography>
        </Box>

        {/* Category Filter */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {categories.map((category) => (
              <Chip
                key={category}
                label={category}
                onClick={() => setSelectedCategory(category.toLowerCase())}
                color={selectedCategory === category.toLowerCase() ? 'primary' : 'default'}
                variant={selectedCategory === category.toLowerCase() ? 'filled' : 'outlined'}
                sx={{
                  px: 2,
                  py: 3,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Shows Grid */}
        {filteredShows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="text.secondary">
              No shows found in this category
            </Typography>
            <Button
              variant="contained"
              onClick={() => setSelectedCategory('all')}
              sx={{ mt: 2 }}
            >
              View All Shows
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filteredShows.map((show, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={show.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => navigate(`/browse-featured?category=${show.category.toLowerCase()}`)}
                >
                  {/* Trending Badge */}
                  {show.trending && (
                    <Chip
                      icon={<TrendingUp />}
                      label="Trending"
                      size="small"
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 1,
                        fontWeight: 600,
                      }}
                    />
                  )}

                  {/* Rank Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}
                  >
                    #{index + 1}
                  </Box>

                  {/* Show Image */}
                  <CardMedia
                    component="img"
                    height="300"
                    image={show.image_url}
                    alt={show.name}
                    sx={{
                      objectFit: 'cover',
                      bgcolor: 'grey.200',
                    }}
                  />

                  <CardContent sx={{ flex: 1 }}>
                    {/* Show Name */}
                    <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                      {show.name}
                    </Typography>

                    {/* Category Chip */}
                    <Chip
                      label={show.category}
                      size="small"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />

                    {/* Stats */}
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Total Items:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {show.total_items}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Total Value:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="primary">
                          ${show.total_value.toFixed(2)}
                        </Typography>
                      </Stack>
                    </Stack>

                    {/* View Button */}
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2, borderRadius: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/browse-featured?category=${show.category.toLowerCase()}`);
                      }}
                    >
                      View Collection
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Call to Action */}
        <Box
          sx={{
            mt: 8,
            p: 6,
            bgcolor: 'primary.50',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Can't Find Your Favorite Show?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Browse all collectibles or set up alerts to be notified when items from your favorite shows become available.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/browse-featured')}
            >
              Browse All Collectibles
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/alerts')}
            >
              Set Up Alerts
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
