import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  BookmarkRemove,
  MoreVert,
  Schedule,
  LocalOffer,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase/supabaseClient'

interface SavedItem {
  id: string;
  created_at: string;
  auctions: {
    id: string;
    title: string;
    image_url: string;
    current_bid: number;
    buy_now_price: number | null;
    end_time: string;
    status: string;
  };
}

export default function SavedCollectiblesTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    loadSavedItems();
  }, [user]);

  const loadSavedItems = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('auction_saves')
        .select(`
          id,
          created_at,
          auctions (
            id,
            title,
            image_url,
            current_bid,
            buy_now_price,
            end_time,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setSavedItems((data || []) as SavedItem[]);
    } catch (err) {
      console.error('Error loading saved items:', err);
      setError('Failed to load saved collectibles');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (saveId: string, auctionId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('auction_saves')
        .delete()
        .eq('id', saveId);

      if (deleteError) throw deleteError;

      setSavedItems(items => items.filter(item => item.id !== saveId));
      handleMenuClose();
    } catch (err) {
      console.error('Error removing saved item:', err);
      setError('Failed to remove saved item');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, itemId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedItem(itemId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
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

    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      return `${hours}h left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m left`;
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
          Saved Collectibles
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} in your watchlist
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {savedItems.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
          }}
        >
          <LocalOffer sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            No Saved Collectibles
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't saved any items yet. Browse collectibles and save your favorites!
          </Typography>
          <Button variant="contained" onClick={() => navigate('/browse-featured')}>
            Browse Collectibles
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {savedItems.map((item) => {
            if (!item.auctions) return null;

            const auction = item.auctions;
            const timeRemaining = formatTimeRemaining(auction.end_time);
            const isEnded = timeRemaining === 'Ended';

            return (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* More Options Button */}
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      zIndex: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 1)',
                      },
                    }}
                    onClick={(e) => handleMenuOpen(e, item.id)}
                  >
                    <MoreVert />
                  </IconButton>

                  <CardActionArea onClick={() => navigate(`/item/${auction.id}`)}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={auction.image_url || 'https://via.placeholder.com/300'}
                      alt={auction.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                      <Typography variant="h6" gutterBottom fontWeight={600} noWrap>
                        {auction.title}
                      </Typography>

                      <Stack spacing={1.5} sx={{ mt: 2 }}>
                        {/* Current Bid */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Current Bid
                          </Typography>
                          <Typography variant="body1" fontWeight={600} color="primary">
                            ${auction.current_bid.toFixed(2)}
                          </Typography>
                        </Stack>

                        {/* Buy Now Price */}
                        {auction.buy_now_price && (
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Buy Now
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              ${auction.buy_now_price.toFixed(2)}
                            </Typography>
                          </Stack>
                        )}

                        {/* Time Remaining */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Schedule fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {isEnded ? 'Auction ended' : 'Time left'}
                            </Typography>
                          </Stack>
                          <Chip
                            label={timeRemaining}
                            size="small"
                            color={isEnded ? 'default' : 'success'}
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>

                        {/* Status */}
                        {auction.status && (
                          <Chip
                            label={auction.status.toUpperCase()}
                            size="small"
                            color={auction.status === 'active' ? 'success' : 'default'}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                        Saved {new Date(item.created_at).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            const item = savedItems.find(i => i.id === selectedItem);
            if (item) {
              handleUnsave(item.id, item.auctions.id);
            }
          }}
        >
          <BookmarkRemove fontSize="small" sx={{ mr: 1 }} />
          Remove from Saved
        </MenuItem>
      </Menu>
    </Box>
  );
}
