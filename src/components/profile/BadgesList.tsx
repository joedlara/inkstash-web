import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Verified as VerifiedIcon,
  Star as StarIcon,
  LocalFireDepartment as FireIcon,
  Diamond as DiamondIcon,
  Favorite as HeartIcon,
  ShoppingCart as CartIcon,
  Gavel as GavelIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

export interface Badge {
  id: string;
  badge_id: string;
  awarded_at: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Badge definitions - these would typically come from a database
const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  first_sale: {
    id: 'first_sale',
    name: 'First Sale',
    description: 'Made your first sale on InkStash',
    icon: <CartIcon />,
    color: '#4CAF50',
    rarity: 'common',
  },
  first_purchase: {
    id: 'first_purchase',
    name: 'First Purchase',
    description: 'Made your first purchase on InkStash',
    icon: <GavelIcon />,
    color: '#2196F3',
    rarity: 'common',
  },
  top_seller: {
    id: 'top_seller',
    name: 'Top Seller',
    description: 'Sold over 100 items',
    icon: <TrophyIcon />,
    color: '#FFD700',
    rarity: 'epic',
  },
  verified_seller: {
    id: 'verified_seller',
    name: 'Verified Seller',
    description: 'Verified by InkStash as a trusted seller',
    icon: <VerifiedIcon />,
    color: '#4CAF50',
    rarity: 'rare',
  },
  five_star: {
    id: 'five_star',
    name: '5-Star Seller',
    description: 'Maintained a 5.0 rating with 50+ reviews',
    icon: <StarIcon />,
    color: '#FFD700',
    rarity: 'epic',
  },
  hot_streak: {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: 'Sold 10 items in 7 days',
    icon: <FireIcon />,
    color: '#FF5722',
    rarity: 'rare',
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    description: 'Won 50+ auctions',
    icon: <InventoryIcon />,
    color: '#9C27B0',
    rarity: 'rare',
  },
  vip: {
    id: 'vip',
    name: 'VIP Member',
    description: 'Premium member of InkStash',
    icon: <DiamondIcon />,
    color: '#E91E63',
    rarity: 'legendary',
  },
  community_favorite: {
    id: 'community_favorite',
    name: 'Community Favorite',
    description: 'Received 100+ likes on listings',
    icon: <HeartIcon />,
    color: '#F44336',
    rarity: 'rare',
  },
};

const BadgeCard = styled(Paper)<{ rarity: string }>(({ theme, rarity }) => {
  const rarityColors = {
    common: 'rgba(0, 0, 0, 0.05)',
    rare: 'rgba(33, 150, 243, 0.1)',
    epic: 'rgba(156, 39, 176, 0.1)',
    legendary: 'rgba(255, 215, 0, 0.2)',
  };

  const rarityBorders = {
    common: '2px solid rgba(0, 0, 0, 0.1)',
    rare: '2px solid #2196F3',
    epic: '2px solid #9C27B0',
    legendary: '2px solid #FFD700',
  };

  return {
    padding: theme.spacing(2),
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common,
    border: rarityBorders[rarity as keyof typeof rarityBorders] || rarityBorders.common,
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4],
    },
  };
});

const BadgeIcon = styled(Box)<{ color: string }>(({ color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 60,
  height: 60,
  borderRadius: '50%',
  backgroundColor: color,
  color: '#fff',
  margin: '0 auto 12px',
  '& .MuiSvgIcon-root': {
    fontSize: 32,
  },
}));

interface BadgesListProps {
  badges: Badge[];
  maxDisplay?: number;
}

export const BadgesList: React.FC<BadgesListProps> = ({ badges, maxDisplay }) => {
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;

  if (!badges || badges.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No badges earned yet. Start selling and buying to earn badges!
        </Typography>
      </Box>
    );
  }

  const getRarityLabel = (rarity: string) => {
    const colors = {
      common: 'default',
      rare: 'primary',
      epic: 'secondary',
      legendary: 'warning',
    };
    return (
      <Chip
        label={rarity.toUpperCase()}
        size="small"
        color={colors[rarity as keyof typeof colors] as any}
        sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Badges
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {badges.length} earned
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {displayBadges.map((badge) => {
          const definition = BADGE_DEFINITIONS[badge.badge_id];
          if (!definition) return null;

          return (
            <Grid item xs={6} sm={4} md={3} key={badge.id}>
              <Tooltip
                title={
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {definition.name}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      {definition.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Earned on {new Date(badge.awarded_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
                arrow
              >
                <BadgeCard rarity={definition.rarity} elevation={1}>
                  <BadgeIcon color={definition.color}>
                    {definition.icon}
                  </BadgeIcon>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {definition.name}
                  </Typography>
                  {getRarityLabel(definition.rarity)}
                </BadgeCard>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>

      {maxDisplay && badges.length > maxDisplay && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}>
            View all {badges.length} badges
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Export badge definitions for use elsewhere
export { BADGE_DEFINITIONS };
