import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  Avatar,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Close as CloseIcon, Verified } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getFollowers, getFollowing, type FollowUser } from '../../api/users/profile';

interface FollowersFollowingModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: 'followers' | 'following';
  followersCount: number;
  followingCount: number;
}

export const FollowersFollowingModal: React.FC<FollowersFollowingModalProps> = ({
  open,
  onClose,
  userId,
  initialTab = 'following',
  followersCount,
  followingCount,
}) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<'following' | 'followers'>(initialTab);
  const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);
  const [followersUsers, setFollowersUsers] = useState<FollowUser[]>([]);
  const [followingOffset, setFollowingOffset] = useState(0);
  const [followersOffset, setFollowersOffset] = useState(0);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [hasMoreFollowing, setHasMoreFollowing] = useState(true);
  const [hasMoreFollowers, setHasMoreFollowers] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const LIMIT = 25;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentTab(initialTab);
      setFollowingUsers([]);
      setFollowersUsers([]);
      setFollowingOffset(0);
      setFollowersOffset(0);
      setHasMoreFollowing(true);
      setHasMoreFollowers(true);
    }
  }, [open, initialTab]);

  // Load initial data when tab changes
  useEffect(() => {
    if (open) {
      if (currentTab === 'following' && followingUsers.length === 0) {
        loadFollowing(0);
      } else if (currentTab === 'followers' && followersUsers.length === 0) {
        loadFollowers(0);
      }
    }
  }, [open, currentTab]);

  const loadFollowing = async (offset: number) => {
    if (loadingFollowing) return;

    try {
      setLoadingFollowing(true);
      const data = await getFollowing(userId, LIMIT, offset);

      if (offset === 0) {
        setFollowingUsers(data);
      } else {
        setFollowingUsers((prev) => [...prev, ...data]);
      }

      setFollowingOffset(offset + data.length);
      setHasMoreFollowing(data.length === LIMIT);
    } catch (err) {
      console.error('Error loading following:', err);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const loadFollowers = async (offset: number) => {
    if (loadingFollowers) return;

    try {
      setLoadingFollowers(true);
      const data = await getFollowers(userId, LIMIT, offset);

      if (offset === 0) {
        setFollowersUsers(data);
      } else {
        setFollowersUsers((prev) => [...prev, ...data]);
      }

      setFollowersOffset(offset + data.length);
      setHasMoreFollowers(data.length === LIMIT);
    } catch (err) {
      console.error('Error loading followers:', err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (scrolledToBottom) {
      if (currentTab === 'following' && hasMoreFollowing && !loadingFollowing) {
        loadFollowing(followingOffset);
      } else if (currentTab === 'followers' && hasMoreFollowers && !loadingFollowers) {
        loadFollowers(followersOffset);
      }
    }
  }, [currentTab, hasMoreFollowing, hasMoreFollowers, loadingFollowing, loadingFollowers, followingOffset, followersOffset]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleUserClick = (username: string) => {
    navigate(`/@${username}`);
    onClose();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'following' | 'followers') => {
    setCurrentTab(newValue);
  };

  const currentUsers = currentTab === 'following' ? followingUsers : followersUsers;
  const isLoading = currentTab === 'following' ? loadingFollowing : loadingFollowers;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
        <Box sx={{ flex: 1 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                minWidth: 120,
              },
            }}
          >
            <Tab label={`Following ${followingCount.toLocaleString()}`} value="following" />
            <Tab label={`Followers ${followersCount.toLocaleString()}`} value="followers" />
          </Tabs>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        ref={scrollContainerRef}
        sx={{
          px: 0,
          pt: 2,
          overflowY: 'auto',
          minHeight: 300,
        }}
      >
        <List sx={{ pt: 0 }}>
          {currentUsers.map((user) => (
            <ListItem
              key={user.id}
              sx={{
                px: 3,
                py: 1.5,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => handleUserClick(user.username)}
            >
              <ListItemAvatar>
                <Avatar src={user.avatar_url} alt={user.username}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {user.username}
                    </Typography>
                    {user.verified && (
                      <Verified sx={{ fontSize: 18, color: '#0078FF' }} />
                    )}
                  </Box>
                }
                secondary={
                  user.full_name || user.bio ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.full_name || user.bio}
                    </Typography>
                  ) : null
                }
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    minWidth: 80,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserClick(user.username);
                  }}
                >
                  View
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {/* Loading indicator */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {/* Empty state */}
        {!isLoading && currentUsers.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              px: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No {currentTab} yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentTab === 'following'
                ? 'Not following anyone yet'
                : 'No followers yet'}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
