import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  alpha,
} from '@mui/material';
import { CheckCircle, Edit } from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';

interface PreviewItem {
  id: string;
  title: string;
  current_bid: number;
  buy_now_price: number | null;
  image_url: string;
  category: string;
  ends_at: string;
}

interface OnboardingFeedPreviewStepProps {
  onComplete: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  selectedInterests: string[];
  username: string;
}

const OnboardingFeedPreviewStep: React.FC<OnboardingFeedPreviewStepProps> = ({
  onComplete,
  onBack,
  onSkip,
  selectedInterests,
  username,
}) => {
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreviewItems();
  }, [selectedInterests]);

  const fetchPreviewItems = async () => {
    setLoading(true);
    try {
      // Fetch featured or recent items from the auctions table
      // In production, you'd filter by selectedInterests categories
      const { data, error } = await supabase
        .from('auctions')
        .select('id, title, current_bid, buy_now_price, image_url, category, ends_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      setPreviewItems(data || []);
    } catch (error) {
      console.error('Error fetching preview items:', error);
      // Show placeholder items on error
      setPreviewItems([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getTimeRemaining = (endsAt: string) => {
    const now = new Date();
    const end = new Date(endsAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px',
        maxWidth: '900px',
        mx: 'auto',
        px: 3,
        py: 2,
      }}
    >
      {/* Success Icon */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha('#22c55e', 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckCircle sx={{ fontSize: 50, color: 'success.main' }} />
        </Box>
      </Box>

      <Typography variant="h4" fontWeight="bold" gutterBottom align="center">
        Your personalized feed is ready, {username}!
      </Typography>

      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Based on your interests, here's what we found for you
      </Typography>

      {/* Selected Interests Summary */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 4 }}>
        {selectedInterests.map((interest) => (
          <Chip
            key={interest}
            label={interest.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            color="primary"
            size="small"
          />
        ))}
      </Box>

      {/* Preview Items Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : previewItems.length > 0 ? (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {previewItems.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={item.image_url || 'https://via.placeholder.com/200'}
                  alt={item.title}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    gutterBottom
                    sx={{ fontWeight: 'medium' }}
                  >
                    {item.title}
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <Typography variant="h6" color="primary" fontWeight="bold">
                      {formatPrice(item.current_bid)}
                    </Typography>
                    {item.buy_now_price && (
                      <Typography variant="caption" color="text.secondary">
                        Buy Now: {formatPrice(item.buy_now_price)}
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Ends in {getTimeRemaining(item.ends_at)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 3,
            bgcolor: 'background.default',
            borderRadius: 2,
            mb: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            No items yet, but don't worry!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We'll notify you as soon as new items matching your interests are listed.
          </Typography>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
        {onBack && (
          <Button
            variant="outlined"
            size="large"
            onClick={onBack}
            sx={{ minWidth: 120 }}
          >
            Back
          </Button>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={onComplete}
          sx={{ minWidth: 150 }}
        >
          Explore My Feed
        </Button>
        {onSkip && (
          <Button
            variant="text"
            size="large"
            onClick={onSkip}
            sx={{ minWidth: 120 }}
          >
            Finish Later
          </Button>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 2 }}>
        Step 4 of 4 • All set! Let's start collecting
      </Typography>
    </Box>
  );
};

export default OnboardingFeedPreviewStep;
