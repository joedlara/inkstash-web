import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Paper,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Share as ShareIcon,
  Verified,
  Videocam as LivestreamIcon,
  Edit as EditIcon,
  Message as MessageIcon,
  MoreHoriz as MoreIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { LevelProgressBar } from './LevelProgressBar';
import { SocialLinks } from './SocialLinks';
import type { SocialLinks as SocialLinksType } from '../../api/users/profile';

interface ProfileHeaderProps {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  websiteUrl?: string;
  socialLinks?: SocialLinksType;
  level?: number;
  xp?: number;
  xpToNext?: number;
  verified?: boolean;
  sellerRating?: number;
  isStreamer?: boolean;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  followingCount?: number;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onOpenFollowersModal?: (tab: 'followers' | 'following') => void;
}

const CoverContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: 200,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: theme.spacing(2, 2, 0, 0),
  [theme.breakpoints.down('sm')]: {
    height: 120,
    borderRadius: 0,
  },
}));

const ProfileContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginTop: -60,
  padding: theme.spacing(0, 3, 3, 3),
  [theme.breakpoints.down('sm')]: {
    marginTop: -40,
    padding: theme.spacing(0, 2, 2, 2),
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[4],
  [theme.breakpoints.down('sm')]: {
    width: 80,
    height: 80,
  },
}));

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  username,
  fullName,
  avatarUrl,
  bio,
  websiteUrl,
  socialLinks,
  level = 1,
  xp = 0,
  xpToNext = 1000,
  verified = false,
  sellerRating,
  isStreamer = false,
  isOwnProfile = false,
  isFollowing = false,
  followersCount = 0,
  followingCount = 0,
  onFollow,
  onUnfollow,
  onEdit,
  onShare,
  onOpenFollowersModal,
}) => {
  const [followMenuAnchor, setFollowMenuAnchor] = useState<null | HTMLElement>(null);
  const followMenuOpen = Boolean(followMenuAnchor);

  const handleFollowClick = () => {
    if (isFollowing) {
      // Open dropdown menu when already following
      setFollowMenuAnchor(document.getElementById('following-button'));
    } else if (onFollow) {
      // Direct follow action
      onFollow();
    }
  };

  const handleFollowMenuClose = () => {
    setFollowMenuAnchor(null);
  };

  const handleUnfollow = () => {
    handleFollowMenuClose();
    if (onUnfollow) {
      onUnfollow();
    }
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: { xs: 0, sm: 2 }, overflow: 'hidden' }}>
      {/* Cover Image */}
      <CoverContainer />

      {/* Profile Content */}
      <ProfileContent>
        {/* Avatar and Actions Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mb: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <StyledAvatar src={avatarUrl} alt={username}>
            {username?.charAt(0).toUpperCase()}
          </StyledAvatar>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isOwnProfile ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={onEdit}
                sx={{ borderRadius: 2 }}
              >
                Edit Profile
              </Button>
            ) : (
              <>
                <IconButton sx={{ bgcolor: 'action.hover' }}>
                  <ShareIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  startIcon={<MessageIcon />}
                  sx={{ borderRadius: 2, minWidth: { xs: 'auto', sm: 110 } }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Message</Box>
                </Button>
                <Button
                  id="following-button"
                  variant={isFollowing ? 'outlined' : 'contained'}
                  onClick={handleFollowClick}
                  endIcon={isFollowing ? <ArrowDownIcon /> : undefined}
                  sx={{ borderRadius: 2, minWidth: 100 }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                {/* Unfollow Menu */}
                <Menu
                  anchorEl={followMenuAnchor}
                  open={followMenuOpen}
                  onClose={handleFollowMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleUnfollow}>Unfollow</MenuItem>
                </Menu>
                <IconButton sx={{ bgcolor: 'action.hover' }}>
                  <MoreIcon />
                </IconButton>
              </>
            )}
            {isOwnProfile && (
              <IconButton onClick={onShare} sx={{ bgcolor: 'action.hover' }}>
                <ShareIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Username and Badges */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h4" fontWeight={700}>
              {username}
            </Typography>
            {verified && (
              <Tooltip title="Verified Partner">
                <Verified sx={{ fontSize: 28, color: '#0078FF' }} />
              </Tooltip>
            )}
            {isStreamer && (
              <Tooltip title="Live Streamer">
                <Chip
                  icon={<LivestreamIcon />}
                  label="Live"
                  size="small"
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    fontWeight: 600,
                    '& .MuiChip-icon': { color: 'white' },
                  }}
                />
              </Tooltip>
            )}
          </Box>
          {fullName && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {fullName}
            </Typography>
          )}
          {/* Rating and Sales Info */}
          {sellerRating !== undefined && sellerRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" fontWeight={700}>
                  ★ {sellerRating.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  (54 Reviews)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                •
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ⏱ 431 Sold
              </Typography>
            </Box>
          )}
        </Box>

        {/* Stats Row */}
        <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
          <Box
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            onClick={() => onOpenFollowersModal?.('following')}
          >
            <Typography variant="body1" fontWeight={700}>
              {followingCount.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Following
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            •
          </Typography>
          <Box
            sx={{ cursor: 'pointer', '&:hover': { opacity: 0.7 } }}
            onClick={() => onOpenFollowersModal?.('followers')}
          >
            <Typography variant="body1" fontWeight={700}>
              {followersCount.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Followers
            </Typography>
          </Box>
        </Stack>

        {/* Bio */}
        {bio && (
          <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
            {bio}
          </Typography>
        )}

        {/* Social Links */}
        {(socialLinks || websiteUrl) && (
          <Box sx={{ mb: 2 }}>
            <SocialLinks
              socialLinks={socialLinks}
              websiteUrl={websiteUrl}
              variant="icon"
            />
          </Box>
        )}

        {/* Level Progress */}
        <Box sx={{ mt: 2 }}>
          <LevelProgressBar
            level={level}
            currentXP={xp}
            xpToNext={xpToNext}
            variant="detailed"
          />
        </Box>
      </ProfileContent>
    </Paper>
  );
};
