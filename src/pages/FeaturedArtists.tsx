import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Avatar,
  Button,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Verified, TrendingUp } from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { supabase } from '../api/supabase/supabaseClient';

interface Artist {
  id: string;
  username: string;
  avatar_url?: string;
  verified: boolean;
  bio?: string;
  total_sales: number;
  active_auctions: number;
  followers: number;
}

export default function FeaturedArtists() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedArtists();
  }, []);

  const fetchFeaturedArtists = async () => {
    try {
      // Get users who have active auctions
      const { data: auctionSellers, error } = await supabase
        .from('auctions')
        .select('seller_id')
        .not('seller_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique seller IDs
      const sellerIds = [...new Set(auctionSellers?.map(a => a.seller_id) || [])];

      // Fetch user details for sellers
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url, verified')
        .in('id', sellerIds.slice(0, 12)); // Limit to 12 artists

      if (usersError) throw usersError;

      // Get auction counts for each seller
      const artistsWithStats = await Promise.all(
        (users || []).map(async (user) => {
          const { count } = await supabase
            .from('auctions')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', user.id);

          return {
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url || undefined,
            verified: user.verified || false,
            bio: 'Featured artist on InkStash',
            total_sales: Math.floor(Math.random() * 100) + 10, // Mock data
            active_auctions: count || 0,
            followers: Math.floor(Math.random() * 1000) + 100, // Mock data
          };
        })
      );

      setArtists(artistsWithStats);
    } catch (error) {
      console.error('Error fetching featured artists:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" fontWeight={700}>
              Featured Artists
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800 }}>
            Discover talented artists and creators selling unique collectibles on InkStash. Follow your favorites to stay updated on their latest drops.
          </Typography>
        </Box>

        {/* Artists Grid */}
        {artists.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" color="text.secondary">
              No featured artists found
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {artists.map((artist) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={artist.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    },
                  }}
                  onClick={() => navigate(`/seller/${artist.id}`)}
                >
                  {/* Cover Image */}
                  <CardMedia
                    component="div"
                    sx={{
                      height: 120,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      position: 'relative',
                    }}
                  >
                    {/* Avatar positioned on top of cover */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -40,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <Avatar
                        src={artist.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                        alt={artist.username}
                        sx={{
                          width: 80,
                          height: 80,
                          border: '4px solid',
                          borderColor: 'background.paper',
                          bgcolor: 'grey.300',
                        }}
                      />
                    </Box>
                  </CardMedia>

                  <CardContent sx={{ pt: 6, textAlign: 'center', flex: 1 }}>
                    {/* Name with verified badge */}
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mb: 1 }}>
                      <Typography variant="h6" fontWeight={600} noWrap>
                        {artist.username}
                      </Typography>
                      {artist.verified && (
                        <Verified sx={{ fontSize: 20, color: 'primary.main' }} />
                      )}
                    </Stack>

                    {/* Bio */}
                    {artist.bio && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          minHeight: 40,
                        }}
                      >
                        {artist.bio}
                      </Typography>
                    )}

                    {/* Stats */}
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {artist.active_auctions}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {artist.total_sales}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sales
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {artist.followers}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Followers
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Follow Button */}
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement follow functionality
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      Follow
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Categories */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
            Browse by Category
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {['Action Figures', 'Comics', 'Trading Cards', 'Video Games', 'Anime', 'Movies'].map((category) => (
              <Chip
                key={category}
                label={category}
                onClick={() => navigate(`/browse-featured?category=${category.toLowerCase()}`)}
                sx={{
                  px: 2,
                  py: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
