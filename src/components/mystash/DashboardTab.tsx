import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  LinearProgress,
  Chip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Favorite,
  Bookmark,
  Gavel,
  LocalOffer,
  AttachMoney,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardStats, type DashboardStats } from '../../api/dashboard';

export default function DashboardTab() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    savedCount: 0,
    likedCount: 0,
    activeBidsCount: 0,
    wonAuctionsCount: 0,
    totalSpent: 0,
    activeWatching: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use the new getDashboardStats API function
      // This handles all the async calls properly with Promise.all
      const dashboardStats = await getDashboardStats(user.id);

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      // Set default stats on error
      setStats({
        savedCount: 0,
        likedCount: 0,
        activeBidsCount: 0,
        wonAuctionsCount: 0,
        totalSpent: 0,
        activeWatching: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }) => (
    <Card elevation={2}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}15`,
              p: 1.5,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Summary
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Summary
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your activity on InkStash
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Saved Collectibles"
            value={stats.savedCount}
            icon={<Bookmark sx={{ fontSize: 32, color: '#1976d2' }} />}
            color="#1976d2"
            subtitle="Items in your watchlist"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Liked Collectibles"
            value={stats.likedCount}
            icon={<Favorite sx={{ fontSize: 32, color: '#e91e63' }} />}
            color="#e91e63"
            subtitle="Items you favorited"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Bids"
            value={stats.activeBidsCount}
            icon={<Gavel sx={{ fontSize: 32, color: '#ff9800' }} />}
            color="#ff9800"
            subtitle="Current auction bids"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Won Auctions"
            value={stats.wonAuctionsCount}
            icon={<TrendingUp sx={{ fontSize: 32, color: '#4caf50' }} />}
            color="#4caf50"
            subtitle="Total auctions won"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Spent"
            value={`$${stats.totalSpent.toFixed(2)}`}
            icon={<AttachMoney sx={{ fontSize: 32, color: '#9c27b0' }} />}
            color="#9c27b0"
            subtitle="Completed purchases"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Items Watching"
            value={stats.activeWatching}
            icon={<LocalOffer sx={{ fontSize: 32, color: '#00bcd4' }} />}
            color="#00bcd4"
            subtitle="Saved + Liked items"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Quick Tips
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Save items</strong> you're interested in to track them easily
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Set up your preferences</strong> to get personalized recommendations
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Like collectibles</strong> to show your taste and discover similar items
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Check your bids</strong> regularly to stay ahead in auctions
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
