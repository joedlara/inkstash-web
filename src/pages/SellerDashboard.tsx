import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  VideoCall,
  Inventory,
  TrendingUp,
  Settings,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import DashboardHeader from '../components/home/DashboardHeader';

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sellerVerified, setSellerVerified] = useState(false);

  useEffect(() => {
    // Check if user is verified seller
    const checkSellerStatus = async () => {
      try {
        // Add your seller verification check here
        // For now, we'll assume they're verified since they completed onboarding
        setSellerVerified(true);
      } catch (error) {
        console.error('Error checking seller status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkSellerStatus();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleStartStream = () => {
    // Navigate to stream setup page
    navigate('/stream-setup');
  };

  const handleManageInventory = () => {
    // Navigate to inventory management
    navigate('/seller/inventory');
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics
    navigate('/seller/analytics');
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <DashboardHeader />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pt: { xs: 10, sm: 12 }, pb: 4 }}>
        <Container maxWidth="lg">
        {/* Welcome Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Typography variant="h4" fontWeight={700}>
              Seller Dashboard
            </Typography>
            {sellerVerified && (
              <Chip
                icon={<CheckCircle />}
                label="Verified"
                color="success"
                size="small"
              />
            )}
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Welcome back! Ready to start selling?
          </Typography>
        </Box>

        {/* Verification Success Alert */}
        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            🎉 Congratulations! Your seller account is verified
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            You can now start livestreaming and selling your items on InkStash.
          </Typography>
        </Alert>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={handleStartStream}>
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <VideoCall sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Start Livestream
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Go live and start selling to your audience
                  </Typography>
                  <Button variant="contained" fullWidth sx={{ mt: 1 }}>
                    Go Live
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={handleManageInventory}>
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Inventory sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Manage Inventory
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add and organize items for sale
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
                    View Inventory
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={handleViewAnalytics}>
              <CardContent>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <TrendingUp sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    View Analytics
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Track your sales and performance
                  </Typography>
                  <Button variant="outlined" fullWidth sx={{ mt: 1 }}>
                    See Analytics
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Getting Started Guide */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Follow these steps to make your first sale
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <CheckCircle color="success" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Complete Account Verification
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your bank account and identity have been verified ✓
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Schedule color="action" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Add Your First Item
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload items to your inventory to sell during streams
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }} onClick={handleManageInventory}>
                        Add Item
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Schedule color="action" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Schedule Your First Stream
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Let your audience know when you'll be going live
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }} onClick={handleStartStream}>
                        Schedule Stream
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Settings color="action" />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        Customize Your Profile
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add a bio, profile picture, and banner to stand out
                      </Typography>
                      <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/settings')}>
                        Edit Profile
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Seller Resources */}
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Seller Resources
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Tips and guides to help you succeed
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    📚 Seller Handbook
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Learn best practices for streaming and selling
                  </Typography>
                  <Button size="small" variant="text">
                    Read Guide
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    💬 Seller Community
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect with other sellers and share tips
                  </Typography>
                  <Button size="small" variant="text">
                    Join Community
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    🎥 Streaming Tips
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Master the art of live selling
                  </Typography>
                  <Button size="small" variant="text">
                    Watch Videos
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
    </>
  );
}
