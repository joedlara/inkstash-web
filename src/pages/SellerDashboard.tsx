import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Chip,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  VideoCall,
  Inventory,
  TrendingUp,
  People,
  Dashboard,
  Settings,
  AttachMoney,
  Menu as MenuIcon,
  Delete,
  Add,
  Remove,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import AppShell from '../components/layout/AppShell';
import { supabase } from '../api/supabase/supabaseClient';
import PhotoUploadSection from '../components/listing/PhotoUploadSection';
import type { UploadedPhoto } from '../utils/photoUpload';
import { uploadListingPhoto, deleteListingPhoto } from '../utils/photoUpload';

type TabType = 'home' | 'stream' | 'analytics' | 'mystore' | 'community' | 'monetization' | 'settings';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'home', label: 'Home', icon: <Dashboard /> },
  { id: 'stream', label: 'Stream Manager', icon: <VideoCall /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp /> },
  { id: 'mystore', label: 'My Store', icon: <Inventory /> },
  { id: 'community', label: 'Community', icon: <People /> },
  { id: 'monetization', label: 'Monetization', icon: <AttachMoney />, badge: 'NEW' },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
];

// Condition options
const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'manufacturer-refurbished', label: 'Manufacturer Refurbished' },
  { value: 'used-very-good', label: 'Used - Very good' },
  { value: 'used-acceptable', label: 'Used - Acceptable' },
  { value: 'used-poor', label: 'Used - Poor' },
];

// Category options
const CATEGORY_OPTIONS = [
  { value: 'tcg-trading-cards', label: 'TCG - Trading Cards' },
  { value: 'pokemon-cards', label: 'Pokemon Cards' },
  { value: 'sports-cards', label: 'Sports cards' },
  { value: 'funko-pop', label: 'Funko pop' },
  { value: 'action-figures', label: 'Action figures' },
  { value: 'comics', label: 'Comics & graphic novels' },
  { value: 'art-prints', label: 'Art Prints' },
  { value: 'video-games', label: 'Video Games' },
  { value: 'other', label: 'Other' },
];

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  condition: string | null;
  category: string | null;
  photos: Array<{ url: string; path: string; type: string }>;
  is_auction: boolean;
  is_buy_now: boolean;
  buy_now_price: number | null;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'home'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // My Store state
  const [listings, setListings] = useState<Listing[]>([]);
  const [drafts, setDrafts] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [storeView, setStoreView] = useState<'active' | 'drafts'>('active'); // Toggle between active listings and drafts
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    condition: '',
    category: '',
    buy_now_price: '',
    starting_bid: '',
    auction_duration_days: 7,
    quantity: 1,
    is_buy_now: false,
    is_auction: false,
  });
  const [editPhotos, setEditPhotos] = useState<UploadedPhoto[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkSellerStatus = async () => {
      try {
        // User is authenticated and can access dashboard
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking seller status:', error);
        setIsLoading(false);
      }
    };

    if (user) {
      checkSellerStatus();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && sidebarItems.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleStartStream = () => {
    // Navigate to stream setup page
    navigate('/stream-setup');
  };

  const handleManageInventory = () => {
    // Navigate to list item page
    navigate('/list-item');
  };

  const handleViewAnalytics = () => {
    // Navigate to analytics tab in seller dashboard
    navigate('/seller-dashboard?tab=analytics');
  };

  // Fetch listings when on My Store tab
  useEffect(() => {
    if (activeTab === 'mystore' && user) {
      fetchListings();
      // Check if user navigated to drafts view
      const view = searchParams.get('view');
      if (view === 'drafts') {
        setStoreView('drafts');
      }
    }
  }, [activeTab, user, searchParams]);

  const fetchListings = async () => {
    if (!user) return;

    setLoadingListings(true);
    try {
      // Fetch active listings
      const { data: activeData, error: activeError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      // Fetch drafts
      const { data: draftData, error: draftError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (draftError) throw draftError;

      setListings(activeData || []);
      setDrafts(draftData || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoadingListings(false);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      // Refresh listings
      fetchListings();
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      alert(`Failed to delete listing: ${error.message}`);
    }
  };

  const handleUpdateQuantity = async (listingId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    try {
      const { error } = await supabase
        .from('listings')
        .update({ quantity: newQuantity })
        .eq('id', listingId);

      if (error) throw error;

      // Update local state
      setListings(listings.map(listing =>
        listing.id === listingId
          ? { ...listing, quantity: newQuantity }
          : listing
      ));
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      alert(`Failed to update quantity: ${error.message}`);
    }
  };

  const handleEditListing = (listing: Listing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description || '',
      condition: listing.condition || '',
      category: listing.category || '',
      buy_now_price: listing.buy_now_price?.toString() || '',
      starting_bid: (listing as any).starting_bid?.toString() || '',
      auction_duration_days: (listing as any).auction_duration_days || 7,
      quantity: listing.quantity,
      is_buy_now: listing.is_buy_now,
      is_auction: listing.is_auction,
    });

    // Convert existing photos to UploadedPhoto format
    const existingPhotos: UploadedPhoto[] = (listing.photos || []).map(photo => ({
      url: photo.url,
      path: photo.path,
      type: photo.type as any,
    }));
    setEditPhotos(existingPhotos);

    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingListing(null);
  };

  const handleSaveEdit = async () => {
    if (!editingListing || !user) return;

    setIsSavingEdit(true);
    try {
      // Step 1: Handle photo changes
      const originalPhotos = editingListing.photos || [];
      const finalPhotos: Array<{ url: string; path: string; type: string }> = [];

      // Track which old photos to delete
      const photosToDelete: string[] = [];

      // Find photos that were removed
      for (const oldPhoto of originalPhotos) {
        const stillExists = editPhotos.some(p => p.path === oldPhoto.path);
        if (!stillExists && oldPhoto.path) {
          photosToDelete.push(oldPhoto.path);
        }
      }

      // Delete removed photos from storage
      for (const photoPath of photosToDelete) {
        try {
          await deleteListingPhoto(photoPath);
        } catch (err) {
          console.error('Error deleting photo:', err);
          // Continue even if delete fails
        }
      }

      // Process photos: upload new ones, keep existing ones
      for (const photo of editPhotos) {
        if (photo.file) {
          // New photo that needs to be uploaded
          const uploadedPhoto = await uploadListingPhoto(
            photo.file,
            user.id,
            editingListing.id,
            photo.type
          );
          finalPhotos.push({
            url: uploadedPhoto.url,
            path: uploadedPhoto.path || '',
            type: uploadedPhoto.type || '',
          });
        } else if (photo.path) {
          // Existing photo that was kept
          finalPhotos.push({
            url: photo.url,
            path: photo.path,
            type: photo.type || '',
          });
        }
      }

      // Step 2: Calculate new auction times if auction settings changed
      const auctionStartTime = editForm.is_auction ? new Date() : null;
      const auctionEndTime = editForm.is_auction
        ? new Date(Date.now() + editForm.auction_duration_days * 24 * 60 * 60 * 1000)
        : null;

      // Step 3: Update the listing with all changes
      const { error } = await supabase
        .from('listings')
        .update({
          title: editForm.title,
          description: editForm.description,
          condition: editForm.condition,
          category: editForm.category,
          buy_now_price: editForm.buy_now_price ? parseFloat(editForm.buy_now_price) : null,
          starting_bid: editForm.is_auction && editForm.starting_bid ? parseFloat(editForm.starting_bid) : null,
          auction_start_time: auctionStartTime?.toISOString(),
          auction_end_time: auctionEndTime?.toISOString(),
          auction_duration_days: editForm.is_auction ? editForm.auction_duration_days : null,
          quantity: editForm.quantity,
          is_buy_now: editForm.is_buy_now,
          is_auction: editForm.is_auction,
          photos: finalPhotos,
        })
        .eq('id', editingListing.id);

      if (error) throw error;

      // Refresh listings
      await fetchListings();
      handleCloseEditDialog();
    } catch (error: any) {
      console.error('Error updating listing:', error);
      alert(`Failed to update listing: ${error.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHomeTab();
      case 'stream':
        return renderStreamTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'mystore':
        return renderMyStoreTab();
      case 'community':
        return renderCommunityTab();
      case 'monetization':
        return renderMonetizationTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderHomeTab();
    }
  };

  const renderHomeTab = () => (
    <>
      {/* Welcome Banner */}
      <Alert
        severity="success"
        sx={{
          mb: 3,
          bgcolor: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          Congratulations! Your creator account is verified
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          You can now start livestreaming and selling your items on InkStash.
        </Typography>
      </Alert>

      {/* Quick Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Revenue
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              $0
            </Typography>
            <LinearProgress
              variant="determinate"
              value={0}
              sx={{ mt: 1, height: 4, borderRadius: 2 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Followers
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              0
            </Typography>
            <LinearProgress
              variant="determinate"
              value={0}
              sx={{ mt: 1, height: 4, borderRadius: 2 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Sales
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              0
            </Typography>
            <LinearProgress
              variant="determinate"
              value={0}
              sx={{ mt: 1, height: 4, borderRadius: 2 }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active Listings
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              0
            </Typography>
            <LinearProgress
              variant="determinate"
              value={0}
              sx={{ mt: 1, height: 4, borderRadius: 2 }}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Main Action Card */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Ready to go live?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your community would love to see you stream. Start broadcasting to your audience.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<VideoCall />}
          onClick={handleStartStream}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            fontWeight: 700,
            py: 1.5,
            px: 4,
            borderRadius: 1,
            textTransform: 'none',
            fontSize: '1rem',
          }}
        >
          Start Livestream
        </Button>
      </Paper>

      {/* Quick Actions Grid */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={handleManageInventory}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Inventory sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  List Item
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add and organize collectibles
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={handleViewAnalytics}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  View Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track your performance
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </>
  );

  const renderStreamTab = () => (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Stream Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure and manage your livestreams
      </Typography>
      <Button variant="contained" startIcon={<VideoCall />} onClick={handleStartStream}>
        Go Live
      </Button>
    </Paper>
  );

  const renderAnalyticsTab = () => (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Detailed analytics and performance metrics will appear here
      </Typography>
    </Paper>
  );

  const renderMyStoreTab = () => {
    const currentListings = storeView === 'active' ? listings : drafts;
    const emptyMessage = storeView === 'active'
      ? { title: 'No listings yet', description: 'Start selling by listing your first item' }
      : { title: 'No drafts yet', description: 'Save incomplete listings as drafts to finish later' };

    return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            My Store
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your collectibles and listings
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleManageInventory}>
          List New Item
        </Button>
      </Stack>

      {/* Toggle between Active and Drafts */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant={storeView === 'active' ? 'contained' : 'outlined'}
          onClick={() => {
            setStoreView('active');
            setSearchParams({ tab: 'mystore', view: 'active' });
          }}
        >
          Active ({listings.length})
        </Button>
        <Button
          variant={storeView === 'drafts' ? 'contained' : 'outlined'}
          onClick={() => {
            setStoreView('drafts');
            setSearchParams({ tab: 'mystore', view: 'drafts' });
          }}
        >
          Drafts ({drafts.length})
        </Button>
      </Stack>

      {loadingListings ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : currentListings.length === 0 ? (
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {emptyMessage.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {emptyMessage.description}
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleManageInventory}>
            {storeView === 'active' ? 'List Your First Item' : 'Create a Listing'}
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {currentListings.map((listing) => (
              <Card key={listing.id}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    {/* Product Image */}
                    <Box
                      onClick={() => navigate(`/item/${listing.id}`)}
                      sx={{
                        width: { xs: '100%', sm: 150 },
                        height: 150,
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        flexShrink: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          boxShadow: 2,
                        },
                      }}
                    >
                      {listing.photos && listing.photos.length > 0 ? (
                        <Box
                          component="img"
                          src={listing.photos[0].url}
                          alt={listing.title}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Inventory sx={{ fontSize: 48, color: 'text.secondary' }} />
                      )}
                    </Box>

                    {/* Listing Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        gutterBottom
                        noWrap
                        onClick={() => navigate(`/item/${listing.id}`)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            color: 'primary.main',
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {listing.title}
                      </Typography>
                      {listing.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {listing.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                        {listing.category && (
                          <Chip
                            label={CATEGORY_OPTIONS.find(opt => opt.value === listing.category)?.label || listing.category}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {listing.condition && (
                          <Chip label={CONDITION_OPTIONS.find(opt => opt.value === listing.condition)?.label || listing.condition} size="small" />
                        )}
                        {listing.is_buy_now && listing.buy_now_price && (
                          <Chip
                            label={`$${listing.buy_now_price.toFixed(2)}`}
                            size="small"
                            color="primary"
                          />
                        )}
                        {listing.is_auction && (
                          <Chip label="Auction" size="small" color="secondary" />
                        )}
                        <Chip
                          label={listing.status}
                          size="small"
                          color={listing.status === 'active' ? 'success' : 'default'}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Listed {new Date(listing.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {/* Quantity and Actions */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'row', sm: 'column' },
                        alignItems: { xs: 'center', sm: 'flex-end' },
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      {/* Quantity Controls */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Quantity
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(listing.id, listing.quantity - 1)}
                            disabled={listing.quantity <= 0}
                            sx={{
                              bgcolor: 'grey.100',
                              '&:hover': { bgcolor: 'grey.200' },
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="h6" fontWeight={600} sx={{ minWidth: 30, textAlign: 'center' }}>
                            {listing.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(listing.id, listing.quantity + 1)}
                            sx={{
                              bgcolor: 'grey.100',
                              '&:hover': { bgcolor: 'grey.200' },
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Box>

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          color="primary"
                          onClick={() => handleEditListing(listing)}
                          sx={{
                            '&:hover': { bgcolor: 'primary.light', color: 'white' },
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteListing(listing.id)}
                          sx={{
                            '&:hover': { bgcolor: 'error.light', color: 'white' },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
          ))}
        </Stack>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Edit Listing</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Photos Section */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Photos
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Add, remove, or reorder photos. The first photo will be the main image shown in the listing.
              </Typography>
              <PhotoUploadSection
                photos={editPhotos}
                onPhotosChange={setEditPhotos}
                maxPhotos={25}
              />
            </Box>

            <TextField
              label="Title"
              fullWidth
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                label="Category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="condition-label">Condition</InputLabel>
              <Select
                labelId="condition-label"
                label="Condition"
                value={editForm.condition}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
              >
                <MenuItem value="">
                  <em>Select a condition</em>
                </MenuItem>
                {CONDITION_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_buy_now}
                  onChange={(e) => setEditForm({ ...editForm, is_buy_now: e.target.checked })}
                />
              }
              label="Buy It Now"
            />

            {editForm.is_buy_now && (
              <TextField
                label="Buy Now Price"
                type="number"
                fullWidth
                value={editForm.buy_now_price}
                onChange={(e) => setEditForm({ ...editForm, buy_now_price: e.target.value })}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_auction}
                  onChange={(e) => setEditForm({ ...editForm, is_auction: e.target.checked })}
                />
              }
              label="Auction"
            />

            {editForm.is_auction && (
              <>
                <TextField
                  label="Starting Bid"
                  type="number"
                  fullWidth
                  value={editForm.starting_bid}
                  onChange={(e) => setEditForm({ ...editForm, starting_bid: e.target.value })}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    },
                  }}
                />

                <FormControl fullWidth>
                  <InputLabel id="auction-duration-label">Auction Duration</InputLabel>
                  <Select
                    labelId="auction-duration-label"
                    label="Auction Duration"
                    value={editForm.auction_duration_days}
                    onChange={(e) => setEditForm({ ...editForm, auction_duration_days: Number(e.target.value) })}
                  >
                    <MenuItem value={1}>1 day</MenuItem>
                    <MenuItem value={3}>3 days</MenuItem>
                    <MenuItem value={5}>5 days</MenuItem>
                    <MenuItem value={7}>7 days</MenuItem>
                    <MenuItem value={10}>10 days</MenuItem>
                    <MenuItem value={14}>14 days</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="caption" color="text.secondary">
                  Note: Changing auction duration will reset the auction start and end times.
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isSavingEdit}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={isSavingEdit}>
            {isSavingEdit ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    );
  };

  const renderCommunityTab = () => (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Community
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Engage with your followers and manage your community
      </Typography>
    </Paper>
  );

  const renderMonetizationTab = () => (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Monetization
        </Typography>
        <Chip label="NEW" color="secondary" size="small" />
      </Stack>
      <Typography variant="body1" color="text.secondary">
        Set up revenue streams and track your earnings
      </Typography>
    </Paper>
  );

  const renderSettingsTab = () => (
    <Paper elevation={2} sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Configure your creator dashboard preferences
      </Typography>
    </Paper>
  );

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          Creator Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {user?.username || 'Creator'}
        </Typography>
      </Box>
      <List sx={{ flex: 1, py: 2 }}>
        {sidebarItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              selected={activeTab === item.id}
              onClick={() => handleTabChange(item.id)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: activeTab === item.id ? 'white' : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: activeTab === item.id ? 600 : 400,
                }}
              />
              {item.badge && (
                <Chip
                  label={item.badge}
                  size="small"
                  color="secondary"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

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
    <AppShell>

      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            top: 64,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" color="primary" fontWeight={700}>
              Creator Dashboard
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="xl" sx={{ py: 4, mt: isMobile ? 16 : 10 }}>
        <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 150px)' }}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Paper
              elevation={2}
              sx={{
                width: 280,
                height: 'fit-content',
                position: 'sticky',
                top: 100,
              }}
            >
              {sidebarContent}
            </Paper>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer
              variant="temporary"
              anchor="left"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  width: 280,
                  boxSizing: 'border-box',
                },
              }}
            >
              {sidebarContent}
            </Drawer>
          )}

          {/* Main Content Area */}
          <Box sx={{ flex: 1 }}>
            {renderTabContent()}
          </Box>
        </Box>
      </Container>
    </AppShell>
  );
}
