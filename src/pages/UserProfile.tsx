import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import AppShell from '../components/layout/AppShell';
import {
  getUserProfile,
  getUserProfileByUsername,
  getStreamerProfile,
  getUserProfileStats,
  followUser,
  unfollowUser,
  isFollowing,
  type PublicUserProfile,
  type StreamerProfile,
  type UserProfileStats,
} from '../api/users/profile';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { FollowersFollowingModal } from '../components/profile/FollowersFollowingModal';
import { supabase } from '../api/supabase/supabaseClient';

export default function UserProfile() {
  const { userId, username } = useParams<{ userId?: string; username?: string; '*'?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [streamerProfile, setStreamerProfile] = useState<StreamerProfile | null>(null);
  const [stats, setStats] = useState<UserProfileStats>({
    total_auctions: 0,
    total_sales: 0,
    total_purchases: 0,
    items_sold: 0,
    saved_count: 0,
    liked_count: 0,
    following_count: 0,
    followers_count: 0,
  });
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [listings, setListings] = useState<any[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('following');

  const isOwnProfile = currentUser?.id === profile?.id;

  const loadUserListings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error loading user listings:', err);
      return [];
    }
  };

  useEffect(() => {
    if (userId) {
      loadProfileDataById(userId);
    } else if (username) {
      // Remove @ symbol if present
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
      loadProfileDataByUsername(cleanUsername);
    } else if (location.pathname.startsWith('/@')) {
      // Handle /@username format
      const usernameFromPath = location.pathname.slice(2); // Remove /@
      loadProfileDataByUsername(usernameFromPath);
    }
  }, [userId, username, location.pathname]);

  const loadProfileDataById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load profile data - critical
      const profileData = await getUserProfile(id);

      if (!profileData) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load additional data in parallel - non-critical
      try {
        const [statsData, streamerData, listingsData] = await Promise.all([
          getUserProfileStats(id),
          getStreamerProfile(id),
          loadUserListings(id),
        ]);
        setStats(statsData);
        setStreamerProfile(streamerData);
        setListings(listingsData);
      } catch (err) {
        console.error('Error loading profile stats/streamer data:', err);
        // Continue loading profile even if stats fail
      }

      // Check if current user is following this profile
      if (currentUser && currentUser.id !== id) {
        try {
          const following = await isFollowing(currentUser.id, id);
          setIsFollowingUser(following);
        } catch (err) {
          console.error('Error checking follow status:', err);
          // Continue loading profile even if follow check fails
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileDataByUsername = async (uname: string) => {
    try {
      setLoading(true);
      setError(null);

      // First get the user profile by username - critical
      const profileData = await getUserProfileByUsername(uname);

      if (!profileData) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Then load additional data using the user ID - non-critical
      try {
        const [statsData, streamerData, listingsData] = await Promise.all([
          getUserProfileStats(profileData.id),
          getStreamerProfile(profileData.id),
          loadUserListings(profileData.id),
        ]);
        setStats(statsData);
        setStreamerProfile(streamerData);
        setListings(listingsData);
      } catch (err) {
        console.error('Error loading profile stats/streamer data:', err);
        // Continue loading profile even if stats fail
      }

      // Check if current user is following this profile
      if (currentUser && currentUser.id !== profileData.id) {
        try {
          const following = await isFollowing(currentUser.id, profileData.id);
          setIsFollowingUser(following);
        } catch (err) {
          console.error('Error checking follow status:', err);
          // Continue loading profile even if follow check fails
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    try {
      await followUser(currentUser.id, profile.id);
      setIsFollowingUser(true);
      setStats((prev) => ({
        ...prev,
        followers_count: (prev.followers_count || 0) + 1,
      }));
      setSnackbar({
        open: true,
        message: `You are now following ${profile?.username}`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error following user:', err);
      setSnackbar({
        open: true,
        message: 'Failed to follow user',
        severity: 'error',
      });
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !profile) return;

    try {
      await unfollowUser(currentUser.id, profile.id);
      setIsFollowingUser(false);
      setStats((prev) => ({
        ...prev,
        followers_count: Math.max((prev.followers_count || 0) - 1, 0),
      }));
      setSnackbar({
        open: true,
        message: `You unfollowed ${profile?.username}`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setSnackbar({
        open: true,
        message: 'Failed to unfollow user',
        severity: 'error',
      });
    }
  };

  const handleEdit = () => {
    navigate('/settings');
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.username}'s profile`,
          text: `Check out ${profile?.username} on InkStash!`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setSnackbar({
          open: true,
          message: 'Profile link copied to clipboard',
          severity: 'success',
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleOpenFollowersModal = (tab: 'followers' | 'following') => {
    setFollowersModalTab(tab);
    setFollowersModalOpen(true);
  };

  if (loading) {
    return (
      <AppShell>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </AppShell>
    );
  }

  if (error || !profile) {
    return (
      <AppShell>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">{error || 'User not found'}</Alert>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 0, sm: 3 } }}>
        {/* Profile Header */}
        <ProfileHeader
        userId={profile.id}
        username={profile.username}
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        websiteUrl={profile.website_url}
        socialLinks={profile.social_links}
        level={profile.level}
        xp={profile.xp}
        xpToNext={profile.xp_to_next}
        verified={profile.verified}
        sellerRating={profile.seller_rating}
        isStreamer={!!streamerProfile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowingUser}
        followersCount={stats.followers_count}
        followingCount={stats.following_count}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onEdit={handleEdit}
        onShare={handleShare}
        onOpenFollowersModal={handleOpenFollowersModal}
      />

      {/* Tabs Section */}
      <Box sx={{ mt: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          indicatorColor="primary"
          textColor="primary"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              minWidth: { xs: 80, sm: 120 },
              color: 'text.secondary',
              '&.Mui-selected': {
                color: '#0078FF',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#0078FF',
              height: 3,
            },
          }}
        >
          {profile.seller_verified ? [
            <Tab key="shop" label="Shop" />,
            <Tab key="shows" label="Shows" />,
            <Tab key="reviews" label="Reviews" />,
            <Tab key="clips" label="Clips" />,
          ] : [
            <Tab key="sell" label="Sell" />,
            <Tab key="clips" label="Clips" />,
          ]}
        </Tabs>
      </Box>

      {/* Content Section - Listings/Activity Grid */}
      <Box sx={{ mt: 3, px: { xs: 2, sm: 0 } }}>
        {profile.seller_verified ? (
          <>
            {/* Shop Tab */}
            {currentTab === 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Products ({listings.length})
                </Typography>
                {listings.length > 0 ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        sm: 'repeat(3, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    {listings.map((listing) => {
                      const firstPhoto = listing.photos?.[0];
                      const photoUrl = firstPhoto?.url || 'https://via.placeholder.com/300';

                      return (
                        <Card
                          key={listing.id}
                          onClick={() => navigate(`/item/${listing.id}`)}
                          sx={{ cursor: 'pointer', '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' } }}
                        >
                          <CardMedia
                            component="div"
                            sx={{
                              paddingTop: '100%',
                              bgcolor: 'grey.200',
                              backgroundImage: `url(${photoUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {listing.title}
                            </Typography>
                            {listing.buy_now_price && (
                              <Typography variant="caption" color="text.secondary">
                                ${listing.buy_now_price}
                              </Typography>
                            )}
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={listing.status === 'active' ? 'Active' : listing.status}
                                size="small"
                                color="success"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 8,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Nothing for sale here
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isOwnProfile ? "You haven't listed any items yet" : `${profile.username} hasn't listed any items yet`}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Shows Tab */}
            {currentTab === 1 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No shows yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOwnProfile ? "You haven't hosted any shows yet" : `${profile.username} hasn't hosted any shows yet`}
                </Typography>
              </Box>
            )}

            {/* Reviews Tab */}
            {currentTab === 2 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No reviews yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOwnProfile ? "You don't have any reviews yet" : `${profile.username} doesn't have any reviews yet`}
                </Typography>
              </Box>
            )}

            {/* Clips Tab */}
            {currentTab === 3 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No clips yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOwnProfile ? "You don't have any clips yet" : `${profile.username} doesn't have any clips yet`}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <>
            {/* Sell Tab - Non-verified seller */}
            {currentTab === 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 3,
                  py: 4,
                }}
              >
                {/* Left side - Product grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                    alignContent: 'start',
                  }}
                >
                  {/* Placeholder product images */}
                  <Box sx={{ aspectRatio: '1', bgcolor: 'grey.200', borderRadius: 2 }}>
                    <img src="https://via.placeholder.com/200" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  </Box>
                  <Box sx={{ aspectRatio: '1', bgcolor: 'grey.200', borderRadius: 2 }}>
                    <img src="https://via.placeholder.com/200" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  </Box>
                  <Box sx={{ aspectRatio: '1', bgcolor: 'grey.200', borderRadius: 2 }}>
                    <img src="https://via.placeholder.com/200" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  </Box>
                  <Box sx={{ aspectRatio: '1', bgcolor: 'grey.200', borderRadius: 2 }}>
                    <img src="https://via.placeholder.com/200" alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  </Box>
                </Box>

                {/* Right side - CTA */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 3,
                    px: { xs: 0, md: 4 },
                  }}
                >
                  <Typography variant="h4" fontWeight={700}>
                    Interested in selling?
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="h2">⏱</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Sell in seconds, not days or weeks
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Selling live means selling fast. Earn more per hour than on any other marketplace.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="h2">💰</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Keep more of what you earn
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        InkStash's 8% commission is one of the lowest in the industry.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="h2">👥</Typography>
                    <Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Sell to the best buyers in the business
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Live shoppers are more engaged, more loyal, and more ready to spend.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/sell')}
                      sx={{ flex: 1, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                      Learn More
                    </Button>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/seller-onboarding')}
                      sx={{
                        flex: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: '#0078FF',
                        color: 'white',
                        '&:hover': { bgcolor: '#0056CC' },
                      }}
                    >
                      Get Started
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Clips Tab */}
            {currentTab === 1 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 8,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No clips yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOwnProfile ? "You don't have any clips yet" : `${profile.username} doesn't have any clips yet`}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Followers/Following Modal */}
        {profile && (
          <FollowersFollowingModal
            open={followersModalOpen}
            onClose={() => setFollowersModalOpen(false)}
            userId={profile.id}
            initialTab={followersModalTab}
            followersCount={stats.followers_count}
            followingCount={stats.following_count}
          />
        )}
      </Container>
    </AppShell>
  );
}
