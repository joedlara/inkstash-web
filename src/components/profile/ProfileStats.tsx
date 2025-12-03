import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stack,
  Divider,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Favorite as FavoriteIcon,
  Bookmark as BookmarkIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

export interface ProfileStatsData {
  total_auctions?: number;
  total_sales?: number;
  total_purchases?: number;
  items_sold?: number;
  saved_count?: number;
  liked_count?: number;
  following_count?: number;
  followers_count?: number;
}

interface ProfileStatsProps {
  stats: ProfileStatsData;
  variant?: 'grid' | 'inline';
}

const StatBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
  textAlign: 'center',
}));

const StatIconContainer = styled(Box)<{ color: string }>(({ theme, color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: `${color}20`,
  color: color,
  marginBottom: theme.spacing(1),
  '& .MuiSvgIcon-root': {
    fontSize: 24,
  },
}));

const InlineStatBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
}));

export const ProfileStats: React.FC<ProfileStatsProps> = ({ stats, variant = 'grid' }) => {
  const statsConfig = [
    {
      label: 'Listings',
      value: stats.total_auctions || 0,
      icon: <InventoryIcon />,
      color: '#0078FF',
      show: true,
    },
    {
      label: 'Sales',
      value: stats.total_sales || 0,
      icon: <ShoppingCartIcon />,
      color: '#4CAF50',
      show: true,
    },
    {
      label: 'Purchases',
      value: stats.total_purchases || 0,
      icon: <GavelIcon />,
      color: '#9C27B0',
      show: true,
    },
    {
      label: 'Items Sold',
      value: stats.items_sold || 0,
      icon: <TrendingUpIcon />,
      color: '#FF9800',
      show: stats.items_sold !== undefined && stats.items_sold > 0,
    },
    {
      label: 'Saved',
      value: stats.saved_count || 0,
      icon: <BookmarkIcon />,
      color: '#2196F3',
      show: stats.saved_count !== undefined && stats.saved_count > 0,
    },
    {
      label: 'Liked',
      value: stats.liked_count || 0,
      icon: <FavoriteIcon />,
      color: '#F44336',
      show: stats.liked_count !== undefined && stats.liked_count > 0,
    },
    {
      label: 'Followers',
      value: stats.followers_count || 0,
      icon: <PeopleIcon />,
      color: '#00BCD4',
      show: true,
    },
    {
      label: 'Following',
      value: stats.following_count || 0,
      icon: <StarIcon />,
      color: '#E91E63',
      show: true,
    },
  ];

  const visibleStats = statsConfig.filter((stat) => stat.show);

  // Inline variant (horizontal)
  if (variant === 'inline') {
    return (
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        spacing={2}
        sx={{
          overflowX: 'auto',
          '&::-webkit-scrollbar': {
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          },
        }}
      >
        {visibleStats.map((stat) => (
          <InlineStatBox key={stat.label}>
            <StatIconContainer color={stat.color}>
              {stat.icon}
            </StatIconContainer>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {stat.value.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          </InlineStatBox>
        ))}
      </Stack>
    );
  }

  // Grid variant (default)
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
        Statistics
      </Typography>
      <Grid container spacing={2}>
        {visibleStats.map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <StatBox>
              <StatIconContainer color={stat.color}>
                {stat.icon}
              </StatIconContainer>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                {stat.value.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </StatBox>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};
