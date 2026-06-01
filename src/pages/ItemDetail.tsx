import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  Paper,
  Stack,
  Divider,
  Grid,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Share,
  BookmarkBorder,
  Bookmark,
  Visibility,
  CheckBox,
  CalendarMonth,
  Gavel,
  ShoppingCart,
} from '@mui/icons-material';
import { Vault } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';
import CheckoutListingModal from '../components/checkout/CheckoutListingModal';
import { supabase } from '../api/supabase/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';
import {
  checkUserLiked,
  checkUserSaved,
  toggleLike,
  toggleSave,
  recordAuctionView,
  getAuctionInteractionCounts
} from '../api/auctions/auctionInteractions';
import { getHighestBid, placeBid } from '../api/auctions/bids';
import AppShell from '../components/layout/AppShell';
import BidModal from '../components/auctions/BidModal';
import PaymentShippingSetupModal from '../components/payments/PaymentShippingSetupModal';
import { checkPaymentAndShipping, getRequiredSetup, type PaymentShippingStatus } from '../utils/paymentValidation';

interface ItemDetails {
  id: string;
  title: string;
  description: string;
  image_url: string;
  current_bid: number;
  buy_now_price?: number;
  seller_id: string;
  seller_name: string;
  seller_avatar?: string;
  seller_verified: boolean;
  category: string;
  end_date: string;
  total_views: number;
  total_bids: number;
  watchers: number;
  artist?: string;
  seller_location: string;
  us_shipping: number;
  international_shipping: number;
  status?: 'active' | 'sold' | 'ended' | 'cancelled';
  // Comic metadata (listings only)
  comic_publisher?: string | null;
  comic_writer?: string | null;
  comic_artist?: string | null;
  source_inventory_id?: string | null;
}

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, isInCart } = useCart();
  const [item, setItem] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [interactionCounts, setInteractionCounts] = useState({ likes: 0, saves: 0, views: 0 });
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [highestBidUserId, setHighestBidUserId] = useState<string | null>(null);
  const [isAuctionEnded, setIsAuctionEnded] = useState(false);
  const [paymentShippingStatus, setPaymentShippingStatus] = useState<PaymentShippingStatus | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupModalType, setSetupModalType] = useState<'both' | 'payment' | 'shipping'>('both');
  const [pendingAction, setPendingAction] = useState<'bid' | 'buy' | null>(null);
  // M3-Task6: open CheckoutListingModal on Buy Now (modal built in Task 7)
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    async function fetchItemDetails() {
      if (!id) {
        setError('No item ID provided');
        setLoading(false);
        return;
      }

      try {
        // Try to fetch from auctions table first
        let { data: auctionData, error: auctionError } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        // If not found in auctions, try listings table
        if (!auctionData) {
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (listingError || !listingData) {
            setError('Item not found');
            setLoading(false);
            return;
          }

          // Convert listing data to auction format for compatibility
          auctionData = {
            id: listingData.id,
            title: listingData.title,
            description: listingData.description,
            image_url: listingData.photos?.[0]?.url || null,
            current_bid: listingData.starting_bid || 0,
            buy_now_price: listingData.buy_now_price,
            seller_id: listingData.user_id,
            category: listingData.category,
            end_time: listingData.auction_end_time || null, // Use auction_end_time for auctions
            bid_count: 0,
            artist: null,
            us_shipping: 0,
            international_shipping: 0,
            status: listingData.status,
            // Comic metadata fields (listings only)
            comic_publisher: listingData.comic_publisher || null,
            comic_writer: listingData.comic_writer || null,
            comic_artist: listingData.comic_artist || null,
            source_inventory_id: listingData.source_inventory_id || null,
          };
        }

        if (!auctionData) {
          setError('Item not found');
          setLoading(false);
          return;
        }

        // Fetch seller data separately
        let sellerData = null;
        if (auctionData.seller_id) {
          const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('id, username, avatar_url, verified')
            .eq('id', auctionData.seller_id)
            .maybeSingle();

          if (!sellerError) {
            sellerData = seller;
          }
        }

        // Map the data to ItemDetails interface
        const itemDetails: ItemDetails = {
          id: auctionData.id,
          title: auctionData.title || 'Untitled Item',
          description: auctionData.description || 'No description available',
          image_url: auctionData.image_url || 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png',
          current_bid: auctionData.current_bid || 0,
          buy_now_price: auctionData.buy_now_price,
          seller_id: auctionData.seller_id,
          seller_name: sellerData?.username || 'Unknown Seller',
          seller_avatar: sellerData?.avatar_url,
          seller_verified: sellerData?.verified || false,
          category: auctionData.category || 'General',
          end_date: auctionData.end_time || '', // Empty string for non-auction items
          total_views: 0, // Will be updated from auction_views table
          total_bids: auctionData.bid_count || 0,
          watchers: 0, // Not implemented yet
          artist: auctionData.artist,
          seller_location: 'United States',
          us_shipping: auctionData.us_shipping || 0,
          international_shipping: auctionData.international_shipping || 0,
          status: auctionData.status || 'active',
          // Comic metadata (present for listings, null/undefined for auctions)
          comic_publisher: auctionData.comic_publisher ?? null,
          comic_writer: auctionData.comic_writer ?? null,
          comic_artist: auctionData.comic_artist ?? null,
          source_inventory_id: auctionData.source_inventory_id ?? null,
        };

        setItem(itemDetails);
      } catch {
        setError('Failed to load item details');
      } finally {
        setLoading(false);
      }
    }

    fetchItemDetails();
  }, [id]);

  useEffect(() => {
    if (!item) return;

    // If item is sold or ended, set timer to 0 and don't calculate
    if (item.status === 'sold' || item.status === 'ended') {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsAuctionEnded(true);
      return;
    }

    // If there's no end_date (e.g., for non-auction listings), don't show countdown and don't mark as ended
    if (!item.end_date) {
      setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setIsAuctionEnded(false); // Important: non-auction items should NOT be marked as ended
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const end = new Date(item.end_date).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsAuctionEnded(true);
        return;
      }

      setIsAuctionEnded(false);
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [item]);

  useEffect(() => {
    async function loadInteractionStatus() {
      if (!id) return;

      try {
        await recordAuctionView(id, user?.id);
        const counts = await getAuctionInteractionCounts(id);
        setInteractionCounts(counts);

        if (user) {
          const [liked, saved] = await Promise.all([
            checkUserLiked(user.id, id),
            checkUserSaved(user.id, id)
          ]);

          setIsLiked(liked);
          setIsSaved(saved);
        }

        // Get the highest bidder information
        const highestBid = await getHighestBid(id);
        if (highestBid) {
          setHighestBidUserId(highestBid.user_id);
        }
      } catch {
        // Error loading interaction status
      }
    }

    loadInteractionStatus();
  }, [user, id]);

  // Check payment and shipping status when user logs in
  useEffect(() => {
    async function loadPaymentShippingStatus() {
      if (!user) {
        setPaymentShippingStatus(null);
        return;
      }

      try {
        const status = await checkPaymentAndShipping();
        setPaymentShippingStatus(status);
      } catch {
        // Error loading payment/shipping status
      }
    }

    loadPaymentShippingStatus();
  }, [user]);

  const handleLikeClick = async () => {
    if (!user || !id || isLoadingInteractions) return;

    setIsLoadingInteractions(true);
    try {
      const newLikeState = await toggleLike(user.id, id);
      setIsLiked(newLikeState);

      const counts = await getAuctionInteractionCounts(id);
      setInteractionCounts(counts);
    } catch {
      // Error toggling like
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const handleSaveClick = async () => {
    if (!user || !id || isLoadingInteractions) return;

    setIsLoadingInteractions(true);
    try {
      const newSaveState = await toggleSave(user.id, id);
      setIsSaved(newSaveState);

      const counts = await getAuctionInteractionCounts(id);
      setInteractionCounts(counts);
    } catch {
      // Error toggling save
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const handleShareClick = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item?.title || 'Check out this auction',
          text: `Check out ${item?.title || 'this auction'} on InkStash!`,
          url: url,
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch {
        alert('Could not copy link. Please copy manually: ' + url);
      }
    }
  };

  const handlePlaceBid = async (amount: number) => {
    if (!user || !id) {
      return { success: false, error: 'You must be logged in to bid' };
    }

    const result = await placeBid(id, user.id, amount);

    if (result.success && item) {
      // Update the current bid in the UI
      setItem({
        ...item,
        current_bid: amount,
        total_bids: item.total_bids + 1,
      });

      // Update highest bidder
      setHighestBidUserId(user.id);
    }

    return result;
  };

  const handleBuyNow = () => {
    // M3-Task6: open CheckoutListingModal instead of adding to cart.
    // The modal is built in Task 7; for now this is wired but the render
    // is commented out below (TODO M3-Task7).
    setCheckoutOpen(true);
  };

  const getBidButtonState = () => {
    if (item?.status === 'sold') {
      return { disabled: true, text: 'Item Sold' };
    }

    if (!user) {
      return { disabled: false, text: 'Place Bid (Login Required)' };
    }

    if (isAuctionEnded) {
      return { disabled: true, text: 'Auction Ended' };
    }

    if (item?.seller_id === user.id) {
      return { disabled: true, text: 'You Cannot Bid on Your Own Item' };
    }

    if (highestBidUserId === user.id) {
      return { disabled: true, text: 'You Are the Highest Bidder' };
    }

    return { disabled: false, text: 'Place Bid' };
  };

  const handleSetupComplete = async () => {
    setSetupModalOpen(false);

    // Refresh payment and shipping status
    try {
      const status = await checkPaymentAndShipping();
      setPaymentShippingStatus(status);

      // If setup is complete, proceed with the pending action
      if (status.hasBoth && pendingAction === 'bid') {
        setBidModalOpen(true);
      }
    } catch {
      // Error refreshing status
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetupCancel = () => {
    setSetupModalOpen(false);
    setPendingAction(null);
  };

  const bidButtonState = getBidButtonState();

  if (loading) {
    return (
      <AppShell>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h4">Loading...</Typography>
        </Container>
      </AppShell>
    );
  }

  if (error || !item) {
    return (
      <AppShell>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>{error || 'Item not found'}</Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              The auction item you're looking for doesn't exist or has been removed.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
              Back to Home
            </Button>
          </Paper>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Left Side - Image and Stats */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card elevation={2}>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  image={item.image_url}
                  alt={item.title}
                  sx={{
                    width: '100%',
                    height: { xs: 400, sm: 500, md: 600, lg: 700 },
                    objectFit: 'cover',
                    bgcolor: '#f5f5f5'
                  }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: 2,
                    p: 1
                  }}
                >
                  <IconButton
                    onClick={handleLikeClick}
                    disabled={isLoadingInteractions || !user}
                    color={isLiked ? 'error' : 'default'}
                    size="small"
                  >
                    {isLiked ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                  <IconButton onClick={handleShareClick} size="small">
                    <Share />
                  </IconButton>
                  <IconButton
                    onClick={handleSaveClick}
                    disabled={isLoadingInteractions || !user}
                    color={isSaved ? 'primary' : 'default'}
                    size="small"
                  >
                    {isSaved ? <Bookmark /> : <BookmarkBorder />}
                  </IconButton>
                </Stack>
              </Box>
            </Card>

            {/* Stats and Calendar Section */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 4, sm: 3 }}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', minHeight: { xs: 80, sm: 100 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <Visibility color="action" />
                    <Typography variant="h6">{interactionCounts.views}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Total Views</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 4, sm: 3 }}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', minHeight: { xs: 80, sm: 100 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <CheckBox color="action" />
                    <Typography variant="h6">{item.total_bids}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Bids</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 4, sm: 3 }}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center', minHeight: { xs: 80, sm: 100 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <Bookmark color="action" />
                    <Typography variant="h6">{interactionCounts.saves}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Saves</Typography>
                </Paper>
              </Grid>
              {/* Only show calendar for auction items with end dates */}
              {item.end_date && (
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center', minHeight: { xs: 80, sm: 100 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Add to Calendar</Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                      <Box
                        component="a"
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(item.title)}&dates=${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(item.description)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-03-512.png"
                          alt="Google Calendar"
                          sx={{ width: 32, height: 32 }}
                        />
                      </Box>
                      <Box
                        component="a"
                        href={`data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z%0ADTEND:${new Date(item.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z%0ASUMMARY:${encodeURIComponent(item.title)}%0ADESCRIPTION:${encodeURIComponent(item.description)}%0AEND:VEVENT%0AEND:VCALENDAR`}
                        download={`${item.title.replace(/\s+/g, '_')}.ics`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src="https://upload.wikimedia.org/wikipedia/commons/1/1c/MacOSCalendar.png"
                          alt="Apple Calendar"
                          sx={{ width: 32, height: 32 }}
                        />
                      </Box>
                      <Box
                        component="a"
                        href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(item.title)}&startdt=${new Date(item.end_date).toISOString()}&enddt=${new Date(item.end_date).toISOString()}&body=${encodeURIComponent(item.description)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src="https://img.icons8.com/color/1200/outlook-calendar.jpg"
                          alt="Outlook Calendar"
                          sx={{ width: 32, height: 32 }}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Grid>

          {/* Right Side - Details */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card elevation={2}>
              <CardContent>
                {item.status === 'sold' && (
                  <Chip
                    label="SOLD"
                    color="error"
                    sx={{
                      mb: 2,
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      px: 2,
                      py: 2.5,
                    }}
                  />
                )}
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  {item.title}
                </Typography>

                {/* Comic metadata rows + vault badge (listings only) */}
                {(item.comic_publisher || item.comic_writer || item.comic_artist || item.source_inventory_id) && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                    {item.comic_publisher && (
                      <Chip
                        label={item.comic_publisher}
                        size="small"
                        sx={{
                          bgcolor: inkstashColors.gold,
                          color: '#fff',
                          fontFamily: inkstashFonts.mono,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      />
                    )}
                    {item.comic_writer && (
                      <Typography sx={{ fontSize: 12, color: inkstashColors.muted }}>
                        Writer: {item.comic_writer}
                      </Typography>
                    )}
                    {item.comic_artist && (
                      <Typography sx={{ fontSize: 12, color: inkstashColors.muted }}>
                        Art: {item.comic_artist}
                      </Typography>
                    )}
                    {item.source_inventory_id && (
                      <Chip
                        icon={<Vault size={11} style={{ marginLeft: 6 }} />}
                        label="Vault item — ships fast"
                        size="small"
                        sx={{
                          bgcolor: inkstashColors.brand,
                          color: '#fff',
                          fontFamily: inkstashFonts.mono,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          '& .MuiChip-icon': { color: '#fff' },
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Seller Info */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 2,
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/@${item.seller_name}`)}
                >
                  <Avatar
                    src={item.seller_avatar || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
                    alt={item.seller_name}
                    sx={{ width: 48, height: 48 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body1" fontWeight={600}>
                        {item.seller_name}
                      </Typography>
                      {item.seller_verified && (
                        <Chip
                          label="Verified"
                          size="small"
                          color="primary"
                          sx={{ height: 20 }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>

                {/* Bid/Price Section */}
                <Paper elevation={0} sx={{ bgcolor: 'primary.50', p: 3, mb: 3, borderRadius: 3 }}>
                  {item.current_bid > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Current Bid
                      </Typography>
                      <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                        ${item.current_bid}
                      </Typography>
                    </>
                  ) : item.buy_now_price ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Price
                      </Typography>
                      <Typography variant="h3" color="primary" fontWeight="bold" gutterBottom>
                        ${item.buy_now_price}
                      </Typography>
                    </>
                  ) : null}

                  {/* Countdown Timer - Only show for auctions with end dates */}
                  {item.end_date ? (
                    (item.status === 'sold' || item.status === 'ended' || isAuctionEnded) ? (
                      <Paper elevation={1} sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'grey.100' }}>
                        <Typography variant="h6" color="text.secondary" fontWeight="bold">
                          {item.status === 'sold' ? 'Auction Ended - Item Sold' : 'Auction Ended'}
                        </Typography>
                      </Paper>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Auction ends in
                        </Typography>
                        <Grid container spacing={1} sx={{ mb: 3 }}>
                          <Grid size={{ xs: 3 }}>
                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center' }}>
                              <Typography variant="h5" fontWeight="bold">{timeRemaining.days}</Typography>
                              <Typography variant="caption" color="text.secondary">Days</Typography>
                            </Paper>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center' }}>
                              <Typography variant="h5" fontWeight="bold">{timeRemaining.hours}</Typography>
                              <Typography variant="caption" color="text.secondary">Hours</Typography>
                            </Paper>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center' }}>
                              <Typography variant="h5" fontWeight="bold">{timeRemaining.minutes}</Typography>
                              <Typography variant="caption" color="text.secondary">Mins</Typography>
                            </Paper>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center' }}>
                              <Typography variant="h5" fontWeight="bold">{timeRemaining.seconds}</Typography>
                              <Typography variant="caption" color="text.secondary">Secs</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </>
                    )
                  ) : null}

                  {/* Action Buttons */}
                  <Stack spacing={2}>
                    {/* Only show Place Bid button for auctions (items with end_date) */}
                    {item.end_date && item.current_bid > 0 && (
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={<Gavel />}
                        disabled={bidButtonState.disabled}
                        onClick={() => {
                          if (!user) {
                            navigate('/login');
                          } else {
                            // Check if user has payment and shipping setup before allowing bid
                            if (paymentShippingStatus && !paymentShippingStatus.hasBoth) {
                              setPendingAction('bid');
                              const required = getRequiredSetup(paymentShippingStatus);
                              setSetupModalType(required);
                              setSetupModalOpen(true);
                            } else {
                              setBidModalOpen(true);
                            }
                          }
                        }}
                      >
                        {bidButtonState.text}
                      </Button>
                    )}
                    {item.buy_now_price && (
                      <Button
                        variant={!item.end_date || item.current_bid === 0 ? "contained" : "outlined"}
                        size="large"
                        fullWidth
                        startIcon={<ShoppingCart />}
                        onClick={handleBuyNow}
                        disabled={
                          item.status === 'sold' ||
                          item.seller_id === user?.id
                          // Buy Now should always be available unless sold or you're the seller
                          // Even if auction ended, buy now should still work
                        }
                      >
                        {item.status === 'sold' ? 'Sold' : `Buy Now - $${item.buy_now_price}`}
                      </Button>
                    )}
                  </Stack>
                </Paper>

                <Divider sx={{ my: 3 }} />

                {/* Description */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Description
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {item.description}
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Item Details */}
                <Box>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Item Details
                  </Typography>
                  <Stack spacing={2}>
                    {/* Only show End Date for auction items */}
                    {item.end_date && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">End Date:</Typography>
                        <Typography variant="body2">{new Date(item.end_date).toLocaleString()}</Typography>
                      </Stack>
                    )}
                    {item.artist && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Artist:</Typography>
                        <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>{item.artist}</Typography>
                      </Stack>
                    )}
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Category:</Typography>
                      <Chip label={item.category} size="small" />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Seller Location:</Typography>
                      <Typography variant="body2">{item.seller_location}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">US Shipping:</Typography>
                      <Typography variant="body2">${item.us_shipping.toFixed(2)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">International Shipping:</Typography>
                      <Typography variant="body2">${item.international_shipping.toFixed(2)}</Typography>
                    </Stack>
                  </Stack>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Payment Methods */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Accepted Payment Methods
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" sx={{ height: 24 }} />
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" sx={{ height: 24 }} />
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" sx={{ height: 24 }} />
                    <Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="American Express" sx={{ height: 24 }} />
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Bid Modal */}
      {item && (
        <BidModal
          open={bidModalOpen}
          onClose={() => setBidModalOpen(false)}
          currentBid={item.current_bid}
          itemTitle={item.title}
          onPlaceBid={handlePlaceBid}
        />
      )}

      {/* Payment/Shipping Setup Modal */}
      <PaymentShippingSetupModal
        open={setupModalOpen}
        onClose={handleSetupCancel}
        onComplete={handleSetupComplete}
        requiredSetup={setupModalType}
      />

      {item && item.buy_now_price != null && (
        <CheckoutListingModal
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          listing={{
            id: item.id,
            title: item.title,
            buy_now_price: item.buy_now_price,
            source_inventory_id: item.source_inventory_id ?? null,
            comic_publisher: item.comic_publisher ?? null,
            photos: item.image_url ? [{ url: item.image_url }] : null,
            user_id: item.seller_id,
          }}
        />
      )}
    </AppShell>
  );
}