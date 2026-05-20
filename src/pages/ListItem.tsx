import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Divider,
  List,
  ListItem as MuiListItem,
  ListItemButton,
  ListItemText,
  ClickAwayListener,
  Switch,
  InputAdornment,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  Clear,
  HelpOutline,
  Add,
  Image as ImageIcon,
  Restore,
} from '@mui/icons-material';

// Condition options
const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'manufacturer-refurbished', label: 'Manufacturer Refurbished' },
  { value: 'used-very-good', label: 'Used - Very good' },
  { value: 'used-acceptable', label: 'Used - Acceptable' },
  { value: 'used-poor', label: 'Used - Poor' },
];

// Category options — comic-niche only
const CATEGORY_OPTIONS = [
  { value: 'floppies', label: 'Floppies (Single Issues)' },
  { value: 'trade-paperbacks', label: 'Trade Paperbacks / OGNs' },
  { value: 'graded-slabs', label: 'Graded Slabs (CGC, CBCS, PGX)' },
  { value: 'variant-covers', label: 'Variant Covers' },
  { value: 'keys-first-appearances', label: 'Keys & First Appearances' },
  { value: 'golden-silver-age', label: 'Golden Age / Silver Age' },
  { value: 'limited-signed', label: 'Limited Edition / Signed' },
];
import DashboardHeader from '../components/home/DashboardHeader';
import PhotoUploadSection from '../components/listing/PhotoUploadSection';
import PackageDimensionsInput from '../components/listing/PackageDimensionsInput';
import ShippingRatesDisplay from '../components/listing/ShippingRatesDisplay';
import ShipFromAddressModal from '../components/listing/ShipFromAddressModal';
import { useListingPersistence } from '../hooks/useListingPersistence';
import { uploadListingPhoto } from '../utils/photoUpload';
import type { UploadedPhoto } from '../utils/photoUpload';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase/supabaseClient';
import { shippingRatesAPI } from '../api/shipping';
import { sellerShipFromAddressesAPI, type SellerShipFromAddress } from '../api/sellerShipFromAddresses';

// Professional grading companies
const GRADER_OPTIONS = [
  { value: 'psa', label: 'PSA (Professional Sports Authenticator)' },
  { value: 'bgs', label: 'BGS (Beckett Grading Services)' },
  { value: 'cgc', label: 'CGC (Certified Guaranty Company)' },
  { value: 'sgc', label: 'SGC (Sportscard Guaranty)' },
  { value: 'other', label: 'Other' },
];

// Grade options (1-10 scale commonly used)
const GRADE_OPTIONS = [
  { value: '10', label: '10 - Gem Mint' },
  { value: '9.5', label: '9.5 - Mint+' },
  { value: '9', label: '9 - Mint' },
  { value: '8.5', label: '8.5 - Near Mint-Mint+' },
  { value: '8', label: '8 - Near Mint-Mint' },
  { value: '7.5', label: '7.5 - Near Mint+' },
  { value: '7', label: '7 - Near Mint' },
  { value: '6.5', label: '6.5 - Excellent-Near Mint+' },
  { value: '6', label: '6 - Excellent-Near Mint' },
  { value: '5.5', label: '5.5 - Excellent+' },
  { value: '5', label: '5 - Excellent' },
  { value: '4.5', label: '4.5 - Very Good-Excellent+' },
  { value: '4', label: '4 - Very Good-Excellent' },
  { value: '3.5', label: '3.5 - Very Good+' },
  { value: '3', label: '3 - Very Good' },
  { value: '2.5', label: '2.5 - Good+' },
  { value: '2', label: '2 - Good' },
  { value: '1.5', label: '1.5 - Fair' },
  { value: '1', label: '1 - Poor' },
];

// Detail filter options for the match step - Generic collectibles filters
const DETAIL_FILTER_OPTIONS = {
  type: ['Trading Card', 'Figure', 'Toy', 'Comic', 'Print', 'Memorabilia', 'Other'],
  brand: ['Various - Type to add'],
  year: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'Pre-2020', 'Other'],
  exclusiveEventRetailer: ['Store Exclusive', 'Convention Exclusive', 'Limited Release', 'Standard Release', 'Other'],
  franchise: ['Pokemon', 'Marvel', 'DC', 'Star Wars', 'Sports', 'Gaming', 'Anime', 'Other'],
  theme: ['Anime', 'Movies', 'TV Shows', 'Video Games', 'Sports', 'Music', 'Other'],
  features: ['Limited Edition', 'Signed', 'First Edition', 'Numbered', 'Holographic', 'Other'],
};

export default function ListItem() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formData, updateFormData, clearDraft, hasDraft } = useListingPersistence();
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showPhotoReminder, setShowPhotoReminder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedShipFromAddress, setSelectedShipFromAddress] = useState<SellerShipFromAddress | null>(null);

  // Check for saved draft on mount
  useEffect(() => {
    if (hasDraft() && formData.step !== 'search') {
      setShowDraftDialog(true);
    }
  }, []);

  // Derived state from formData
  const step = formData.step;
  const searchQuery = formData.searchQuery;
  const selectedCondition = formData.selectedCondition;
  const uploadedPhotos = formData.uploadedPhotos;
  const title = formData.title;
  const description = formData.description;
  const isAuction = formData.isAuction;
  const isBuyNow = formData.isBuyNow;
  const buyNowPrice = formData.buyNowPrice;
  const auctionDurationDays = formData.auctionDurationDays;
  const startingBid = formData.startingBid;
  const deliveryMethod = formData.deliveryMethod;
  const isGraded = formData.isGraded;
  const professionalGrader = formData.professionalGrader;
  const grade = formData.grade;
  const certificationNumber = formData.certificationNumber;
  const detailFilters = formData.detailFilters;
  const packageWeightValue = formData.packageWeightValue;
  const packageWeightUnit = formData.packageWeightUnit;
  const packageLength = formData.packageLength;
  const packageWidth = formData.packageWidth;
  const packageHeight = formData.packageHeight;
  const packageDimensionUnit = formData.packageDimensionUnit;
  const shippingRates = formData.shippingRates;
  const selectedShippingRateId = formData.selectedShippingRateId;
  const loadingRates = formData.loadingRates;

  // Update functions
  const setStep = (newStep: typeof step) => updateFormData({ step: newStep });
  const setSearchQuery = (query: string) => updateFormData({ searchQuery: query });
  const setSelectedCondition = (condition: string) => updateFormData({ selectedCondition: condition });
  const setUploadedPhotos = (photos: UploadedPhoto[]) => updateFormData({ uploadedPhotos: photos });
  const setTitle = (newTitle: string) => updateFormData({ title: newTitle });
  const setDescription = (desc: string) => updateFormData({ description: desc });
  const setIsAuction = (auction: boolean) => updateFormData({ isAuction: auction });
  const setIsBuyNow = (buyNow: boolean) => updateFormData({ isBuyNow: buyNow });
  const setBuyNowPrice = (price: string) => {
    // Only allow numbers and decimal point
    const numericValue = price.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const sanitizedValue = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : numericValue;
    updateFormData({ buyNowPrice: sanitizedValue });
  };
  const setAuctionDurationDays = (days: number) => updateFormData({ auctionDurationDays: days });
  const setStartingBid = (price: string) => {
    // Only allow numbers and decimal point
    const numericValue = price.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const sanitizedValue = parts.length > 2
      ? `${parts[0]}.${parts.slice(1).join('')}`
      : numericValue;
    updateFormData({ startingBid: sanitizedValue });
  };
  const setDeliveryMethod = (method: string) => updateFormData({ deliveryMethod: method });
  const setIsGraded = (graded: boolean) => updateFormData({ isGraded: graded });
  const setProfessionalGrader = (grader: string) => updateFormData({ professionalGrader: grader });
  const setGrade = (gradeValue: string) => updateFormData({ grade: gradeValue });
  const setCertificationNumber = (certNum: string) => updateFormData({ certificationNumber: certNum });
  const setDetailFilters = (filters: typeof detailFilters) => updateFormData({ detailFilters: filters });
  const setPackageWeightValue = (value: string) => updateFormData({ packageWeightValue: value });
  const setPackageWeightUnit = (unit: 'ounce' | 'pound') => updateFormData({ packageWeightUnit: unit });
  const setPackageLength = (value: string) => updateFormData({ packageLength: value });
  const setPackageWidth = (value: string) => updateFormData({ packageWidth: value });
  const setPackageHeight = (value: string) => updateFormData({ packageHeight: value });
  const setPackageDimensionUnit = (unit: 'inch' | 'centimeter') => updateFormData({ packageDimensionUnit: unit });
  const setShippingRates = (rates: any[]) => updateFormData({ shippingRates: rates });
  const setSelectedShippingRateId = (id: string) => updateFormData({ selectedShippingRateId: id });
  const setLoadingRates = (loading: boolean) => updateFormData({ loadingRates: loading });

  // Shipping rate calculation
  const handleGetShippingRates = async () => {
    if (!user?.id) {
      setSubmitError('You must be logged in to get shipping rates');
      return;
    }

    // Check if we have a selected ship-from address
    if (!selectedShipFromAddress) {
      // Try to get default address first
      try {
        const defaultAddress = await sellerShipFromAddressesAPI.getDefault();
        if (defaultAddress) {
          setSelectedShipFromAddress(defaultAddress);
          // Continue with rate calculation
          await fetchRatesWithAddress(defaultAddress);
        } else {
          // No address configured, show modal
          setShowAddressModal(true);
        }
      } catch (error) {
        // No address found, show modal
        setShowAddressModal(true);
      }
      return;
    }

    // We have an address, fetch rates
    await fetchRatesWithAddress(selectedShipFromAddress);
  };

  const fetchRatesWithAddress = async (shipFromAddress: SellerShipFromAddress) => {
    setLoadingRates(true);
    setSubmitError('');

    try {
      const shipFrom = {
        name: shipFromAddress.fullName,
        company: shipFromAddress.companyName,
        addressLine1: shipFromAddress.addressLine1,
        addressLine2: shipFromAddress.addressLine2,
        city: shipFromAddress.city,
        state: shipFromAddress.state,
        postalCode: shipFromAddress.postalCode,
        country: shipFromAddress.country,
        phone: shipFromAddress.phone,
      };

      // Use average US destination for rate estimates
      const shipTo = {
        name: 'Buyer',
        addressLine1: '456 Market St',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
      };

      const { rates } = await shippingRatesAPI.getRates({
        shipFrom,
        shipTo,
        packages: [{
          weight: {
            value: parseFloat(packageWeightValue) || 8,
            unit: packageWeightUnit,
          },
          dimensions: {
            length: parseFloat(packageLength) || 6,
            width: parseFloat(packageWidth) || 4,
            height: parseFloat(packageHeight) || 1,
            unit: packageDimensionUnit,
          },
        }],
      });

      setShippingRates(rates);
      if (rates.length > 0) {
        setSelectedShippingRateId(rates[0].id); // Select cheapest by default
      }
    } catch (error: any) {
      console.error('Error getting shipping rates:', error);
      setSubmitError(error.message || 'Failed to get shipping rates. Please check your package dimensions and try again.');
    } finally {
      setLoadingRates(false);
    }
  };

  const handleAddressSelected = (address: SellerShipFromAddress) => {
    setSelectedShipFromAddress(address);
    setShowAddressModal(false);
    // Automatically fetch rates with the selected address
    fetchRatesWithAddress(address);
  };

  // TODO: Replace with actual API call to search collectibles
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 2) {
        // TODO: Call your API here to get suggestions based on searchQuery
        // For now, we'll just set empty array - ready for API integration
        // Example: const response = await fetch(`/api/search-suggestions?q=${searchQuery}`);
        // const data = await response.json();
        // setApiSuggestions(data.suggestions);
        setApiSuggestions([]);
      } else {
        setApiSuggestions([]);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleBack = () => {
    if (step === 'complete') {
      setStep('details');
    } else if (step === 'match') {
      setStep('search');
    } else if (step === 'details') {
      setStep('match');
    } else {
      navigate('/seller-dashboard?tab=mystore');
    }
  };

  const handleContinueToListing = () => {
    // For graded items, only need grading info
    if (isGraded && professionalGrader && grade) {
      // Auto-generate title from search query and grading info if not already set
      if (!title) {
        setTitle(`${searchQuery} - ${professionalGrader.toUpperCase()} ${grade}`);
      }
      setStep('complete');
    }
    // For non-graded items, need condition
    else if (!isGraded && selectedCondition) {
      // Auto-generate title from search query if not already set
      if (!title) {
        setTitle(searchQuery);
      }
      setStep('complete');
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      setStep('match');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
  };

  const handleClickAway = () => {
    setShowSuggestions(false);
  };

  const handleRestoreDraft = () => {
    setShowDraftDialog(false);
    // Show reminder about photos if on complete step and no photos
    if (formData.step === 'complete' && formData.uploadedPhotos.length === 0) {
      setShowPhotoReminder(true);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

  const handleSaveDraft = async () => {
    if (!user?.id) {
      setSubmitError('You must be logged in to save a draft');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Calculate auction end time if this is an auction
      const auctionStartTime = isAuction ? new Date() : null;
      const auctionEndTime = isAuction
        ? new Date(Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000)
        : null;

      // Save as draft with status = 'draft'
      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: title || 'Untitled Draft',
          description,
          condition: !isGraded ? selectedCondition : null,
          category: null,
          photos: [], // Will save without photos for now
          is_auction: isAuction,
          is_buy_now: isBuyNow,
          buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
          starting_bid: isAuction && startingBid ? parseFloat(startingBid) : null,
          auction_start_time: auctionStartTime?.toISOString(),
          auction_end_time: auctionEndTime?.toISOString(),
          auction_duration_days: isAuction ? auctionDurationDays : null,
          delivery_method: deliveryMethod,
          quantity: 1,
          status: 'draft', // Save as draft
          is_graded: isGraded,
          professional_grader: isGraded ? professionalGrader : null,
          grade: isGraded ? grade : null,
          certification_number: isGraded && certificationNumber.trim() ? certificationNumber.trim() : null,
          metadata: {
            detailFilters,
            searchQuery,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to save draft: ${insertError.message}`);
      }

      // Clear the local draft
      clearDraft();

      // Navigate to seller dashboard drafts view
      navigate('/seller-dashboard?tab=mystore&view=drafts');
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setSubmitError(error.message || 'Failed to save draft. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitListing = async () => {
    if (!user?.id) {
      setSubmitError('You must be logged in to create a listing');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Calculate auction end time if this is an auction
      const auctionStartTime = isAuction ? new Date() : null;
      const auctionEndTime = isAuction
        ? new Date(Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000)
        : null;

      // Step 1: Create the listing in the database first to get the UUID
      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title,
          description,
          condition: !isGraded ? selectedCondition : null,
          category: null, // Category is optional, can be added later
          photos: [], // Will update after uploading photos
          is_auction: isAuction,
          is_buy_now: isBuyNow,
          buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
          starting_bid: isAuction && startingBid ? parseFloat(startingBid) : null,
          auction_start_time: auctionStartTime?.toISOString(),
          auction_end_time: auctionEndTime?.toISOString(),
          auction_duration_days: isAuction ? auctionDurationDays : null,
          delivery_method: deliveryMethod,
          quantity: 1, // Default quantity
          status: 'active',
          // Graded item fields
          is_graded: isGraded,
          professional_grader: isGraded ? professionalGrader : null,
          grade: isGraded ? grade : null,
          certification_number: isGraded && certificationNumber.trim() ? certificationNumber.trim() : null,
          // Shipping fields
          package_weight_value: deliveryMethod === 'shipping' ? parseFloat(packageWeightValue) : null,
          package_weight_unit: deliveryMethod === 'shipping' ? packageWeightUnit : null,
          package_length: deliveryMethod === 'shipping' ? parseFloat(packageLength) : null,
          package_width: deliveryMethod === 'shipping' ? parseFloat(packageWidth) : null,
          package_height: deliveryMethod === 'shipping' ? parseFloat(packageHeight) : null,
          package_dimension_unit: deliveryMethod === 'shipping' ? packageDimensionUnit : null,
          selected_shipping_rate_id: deliveryMethod === 'shipping' ? selectedShippingRateId : null,
          // Detail filters as metadata
          metadata: {
            detailFilters,
            searchQuery,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create listing: ${insertError.message}`);
      }

      const itemId = listing.id;

      // Step 1.5: Save shipping rates if we have them
      if (deliveryMethod === 'shipping' && shippingRates.length > 0) {
        try {
          await shippingRatesAPI.saveRatesForListing(itemId, shippingRates);
        } catch (error) {
          console.error('Error saving shipping rates:', error);
          // Don't fail the listing creation if shipping rates fail to save
        }
      }

      // Step 2: Upload all photos to S3 with the item ID
      const finalUploadedPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photo = uploadedPhotos[i];

        // Only upload if the photo has a file (local preview)
        if (photo.file) {
          const uploadedPhoto = await uploadListingPhoto(
            photo.file,
            user.id,
            itemId,
            photo.type
          );
          finalUploadedPhotos.push(uploadedPhoto);
        } else if (photo.path) {
          // Photo already uploaded (shouldn't happen with new flow, but keeping for safety)
          finalUploadedPhotos.push(photo);
        }
      }

      // Step 3: Update the listing with the uploaded photo URLs
      if (finalUploadedPhotos.length > 0) {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            photos: finalUploadedPhotos.map(p => ({ url: p.url, path: p.path, type: p.type })),
          })
          .eq('id', itemId);

        if (updateError) {
          console.error('Error updating photos:', updateError);
          // Don't throw error - listing was created successfully, just without photos displayed
        }
      }

      // Step 4: Clear the draft and navigate to success page
      clearDraft();
      navigate('/seller-dashboard?tab=mystore');
    } catch (error: any) {
      console.error('Error creating listing:', error);
      setSubmitError(error.message || 'Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSearchStep = () => (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Start your listing
        </Typography>
      </Box>

      {/* Search Box */}
      <Box sx={{ maxWidth: 800, mx: 'auto', mb: 8, position: 'relative' }}>
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box>
            <Stack direction="row" spacing={2}>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <TextField
                  fullWidth
                  ref={searchInputRef}
                  placeholder="Tell us what you're selling (e.g., Amazing Spider-Man #300 CGC 9.8)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  slotProps={{
                    input: {
                      endAdornment: searchQuery && (
                        <IconButton
                          onClick={() => setSearchQuery('')}
                          edge="end"
                          size="small"
                        >
                          <Clear />
                        </IconButton>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      fontSize: '1.1rem',
                    },
                  }}
                />

                {/* API Suggestions Dropdown - TODO: Enable when API is ready */}
                {showSuggestions && apiSuggestions.length > 0 && (
                  <Paper
                    elevation={3}
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      mt: 1,
                      maxHeight: 400,
                      overflow: 'auto',
                      zIndex: 1000,
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Suggested items
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Select a match or continue typing
                      </Typography>
                    </Box>
                    <List sx={{ p: 0 }}>
                      {apiSuggestions.map((suggestion: string, index: number) => (
                        <MuiListItem key={index} disablePadding>
                          <ListItemButton
                            onClick={() => handleSuggestionClick(suggestion)}
                            sx={{
                              py: 1.5,
                              px: 3,
                              '&:hover': {
                                bgcolor: 'grey.100',
                              },
                            }}
                          >
                            <Add sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                            <ListItemText
                              primary={suggestion}
                              slotProps={{
                                primary: {
                                  style: {
                                    color: '#0078FF',
                                    fontWeight: 500,
                                  },
                                },
                              }}
                            />
                          </ListItemButton>
                        </MuiListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  minWidth: 120,
                }}
              >
                <Search />
              </Button>
            </Stack>
          </Box>
        </ClickAwayListener>
      </Box>

      {/* Steps Overview */}
      <Box sx={{ display: 'flex', gap: 4, maxWidth: 1200, mx: 'auto', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 350, borderRadius: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                bgcolor: 'grey.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h2" fontWeight={700} color="primary">
                1
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              STEP 1
            </Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Share item details
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Use keywords like brand, model, or unique info (ISBN, MPN, VIN).
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', maxWidth: 350, borderRadius: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                bgcolor: 'grey.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h2" fontWeight={700} color="primary">
                2
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              STEP 2
            </Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Find a match
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We'll search our catalog to find similar items.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', maxWidth: 350, borderRadius: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                bgcolor: 'grey.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h2" fontWeight={700} color="primary">
                3
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              STEP 3
            </Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Edit and list
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You can preview or make changes before listing your item.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );

  const renderMatchStep = () => {
    const handleFilterChange = (filterKey: keyof typeof detailFilters, value: string) => {
      setDetailFilters({
        ...detailFilters,
        [filterKey]: value,
      });
    };

    const renderFilterDropdown = (
      label: string,
      filterKey: keyof typeof detailFilters,
      options: string[]
    ) => (
      <FormControl fullWidth size="small">
        <InputLabel>{label}</InputLabel>
        <Select
          value={detailFilters[filterKey] || ''}
          label={label}
          onChange={(e) => handleFilterChange(filterKey, e.target.value)}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 200,
              },
            },
          }}
        >
          <MenuItem value="">
            <em>Select {label.toLowerCase()}</em>
          </MenuItem>
          {options.slice(0, 5).map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Find a match
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            for "{searchQuery}"
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Left Sidebar - Filters */}
          <Paper sx={{ p: 2, borderRadius: 2, width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Add details to sharpen results
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              {renderFilterDropdown('Type', 'type', DETAIL_FILTER_OPTIONS.type)}
              {renderFilterDropdown('Brand', 'brand', DETAIL_FILTER_OPTIONS.brand)}
              {renderFilterDropdown('Year', 'year', DETAIL_FILTER_OPTIONS.year)}
              {renderFilterDropdown('Exclusive/Release', 'exclusiveEventRetailer', DETAIL_FILTER_OPTIONS.exclusiveEventRetailer)}
              {renderFilterDropdown('Franchise', 'franchise', DETAIL_FILTER_OPTIONS.franchise)}
              {renderFilterDropdown('Theme', 'theme', DETAIL_FILTER_OPTIONS.theme)}
              {renderFilterDropdown('Features', 'features', DETAIL_FILTER_OPTIONS.features)}
            </Stack>
          </Paper>

        {/* Right Side - Results */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Product library matches
          </Typography>

          {/* No matches message - TODO: This will be replaced when API is integrated */}
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', mb: 3 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No matches found in our product library
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can continue without a match and manually enter your item details.
            </Typography>
          </Paper>

          <Button
            variant="contained"
            fullWidth
            sx={{ py: 2 }}
            onClick={() => setStep('details')}
          >
            Continue without match
          </Button>
        </Box>
      </Box>
    </Container>
    );
  };

  const renderDetailsStep = () => (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Confirm details
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The item details below will pre-fill your listing.
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Box
            sx={{
              width: { xs: '100%', sm: 200 },
              height: 200,
              bgcolor: 'grey.100',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Product Image
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {searchQuery || 'Item from search'}
            </Typography>
            {Object.entries(detailFilters).map(([key, value]) =>
              value ? (
                <Typography key={key} variant="body2" color="text.secondary" gutterBottom>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: {value}
                </Typography>
              ) : null
            )}
            <Button variant="text" size="small" sx={{ mt: 1 }}>
              Show more
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Is Graded Toggle */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3, bgcolor: isGraded ? 'rgba(0, 120, 255, 0.05)' : 'grey.50' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Is this item professionally graded?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Items graded by PSA, BGS, CGC, or other professional grading companies
                </Typography>
              </Box>
              <Switch
                checked={isGraded}
                onChange={(e) => setIsGraded(e.target.checked)}
              />
            </Stack>
          </Paper>
        </Box>

        {/* Grading Details - Show only if item is graded */}
        {isGraded && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
              Enter grading details
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Professional Grader
                  </Typography>
                  <HelpOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Stack>
                <FormControl fullWidth>
                  <InputLabel id="grader-select-label">Select a grader</InputLabel>
                  <Select
                    labelId="grader-select-label"
                    value={professionalGrader}
                    label="Select a grader"
                    onChange={(e) => setProfessionalGrader(e.target.value)}
                    sx={{
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select a grader</em>
                    </MenuItem>
                    {GRADER_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Grade
                  </Typography>
                  <HelpOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Stack>
                <FormControl fullWidth>
                  <InputLabel id="grade-select-label">Select grade</InputLabel>
                  <Select
                    labelId="grade-select-label"
                    value={grade}
                    label="Select grade"
                    onChange={(e) => setGrade(e.target.value)}
                    sx={{
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select grade</em>
                    </MenuItem>
                    {GRADE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Certification Number (optional)
                  </Typography>
                  <HelpOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Stack>
                <TextField
                  fullWidth
                  value={certificationNumber}
                  onChange={(e) => setCertificationNumber(e.target.value)}
                  placeholder="Enter certification number (optional)"
                  helperText="You can add this later if you don't have it now"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Box>
            </Stack>
          </Box>
        )}

        {/* Condition - Show only if NOT graded */}
        {!isGraded && (
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Select the condition of your item
              </Typography>
              <HelpOutline sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Stack>
            <FormControl fullWidth>
                <InputLabel id="condition-select-label">Condition</InputLabel>
                <Select
                  labelId="condition-select-label"
                  value={selectedCondition}
                  label="Condition"
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: 2,
                    },
                  }}
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
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={
            isGraded
              ? !professionalGrader || !grade
              : !selectedCondition
          }
          onClick={handleContinueToListing}
          sx={{
            py: 2,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1.1rem',
          }}
        >
          Continue to listing
        </Button>
      </Paper>
    </Container>
  );

  const renderCompleteListingStep = () => (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Complete your listing
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* PHOTOS & VIDEO Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            PHOTOS & VIDEO
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<ImageIcon />}
            sx={{ textTransform: 'none' }}
          >
            See photo options
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          You can add up to 24 photos and a 1-minute video. Buyers want to see all details and angles.{' '}
          <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', textDecoration: 'underline' }}>
            Tips for taking pro photos
          </Typography>
        </Typography>

        {showPhotoReminder && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setShowPhotoReminder(false)}>
            Your draft was restored, but photos need to be re-uploaded. This saves storage space and ensures you have the latest photos.
          </Alert>
        )}

        <PhotoUploadSection
          photos={uploadedPhotos}
          onPhotosChange={setUploadedPhotos}
          maxPhotos={25}
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* TITLE Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            TITLE
          </Typography>
          <Button
            variant="text"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            See title options
          </Button>
        </Stack>

        <Typography variant="body2" fontWeight={600} gutterBottom>
          Item title
        </Typography>
        <TextField
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter item title"
          sx={{ mb: 1 }}
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* ITEM SPECIFICS Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Item specifics
          </Typography>
          <Button
            variant="text"
            size="small"
            sx={{ textTransform: 'none', color: 'primary.main', textDecoration: 'underline' }}
            onClick={() => setStep('details')}
          >
            Change
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          These details were collected from your previous steps.
        </Typography>

        {/* Item Specifics Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
          {/* Show grading details if item is graded */}
          {isGraded && (
            <>
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Item Type
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Professionally Graded
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Professional Grader
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {GRADER_OPTIONS.find(g => g.value === professionalGrader)?.label || professionalGrader.toUpperCase()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Grade
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {GRADE_OPTIONS.find(g => g.value === grade)?.label || grade}
                </Typography>
              </Box>

              {certificationNumber && (
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Certification Number
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {certificationNumber}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* Show condition if not graded */}
          {!isGraded && selectedCondition && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Condition
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {CONDITION_OPTIONS.find(c => c.value === selectedCondition)?.label || selectedCondition}
              </Typography>
            </Box>
          )}

          {/* Show detail filters */}
          {detailFilters.type && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Type
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.type}
              </Typography>
            </Box>
          )}

          {detailFilters.brand && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Brand
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.brand}
              </Typography>
            </Box>
          )}

          {detailFilters.year && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Year
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.year}
              </Typography>
            </Box>
          )}

          {detailFilters.exclusiveEventRetailer && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Exclusive Event/Retailer
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.exclusiveEventRetailer}
              </Typography>
            </Box>
          )}

          {detailFilters.franchise && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Franchise
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.franchise}
              </Typography>
            </Box>
          )}

          {detailFilters.theme && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Theme
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.theme}
              </Typography>
            </Box>
          )}

          {detailFilters.features && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Features
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailFilters.features}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* DESCRIPTION Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Description
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write a detailed description of your item, or save time and let AI draft it for you."
          sx={{ mb: 2 }}
        />

        <Button
          variant="outlined"
          startIcon={<Add />}
          sx={{ textTransform: 'none', borderRadius: 20 }}
        >
          Use AI description
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* PRICING Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Pricing
        </Typography>

        {/* Auction Toggle */}
        <Paper sx={{ p: 3, mb: 2, bgcolor: isAuction ? 'rgba(0, 120, 255, 0.05)' : 'grey.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: isAuction ? 2 : 0 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Auction
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set a starting amount and let buyers compete for your item.
              </Typography>
            </Box>
            <Switch
              checked={isAuction}
              onChange={(e) => setIsAuction(e.target.checked)}
            />
          </Stack>

          {isAuction && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Starting Bid
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Set the minimum price to start the auction.
              </Typography>
              <TextField
                fullWidth
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                }}
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" fontWeight={600} gutterBottom>
                Auction Duration
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Choose how long your auction will run (1-14 days).
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={auctionDurationDays}
                  onChange={(e) => setAuctionDurationDays(Number(e.target.value))}
                >
                  <MenuItem value={1}>1 day</MenuItem>
                  <MenuItem value={3}>3 days</MenuItem>
                  <MenuItem value={5}>5 days</MenuItem>
                  <MenuItem value={7}>7 days</MenuItem>
                  <MenuItem value={10}>10 days</MenuItem>
                  <MenuItem value={14}>14 days</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Your auction will end on {new Date(Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Buy It Now Toggle */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: isBuyNow ? 'rgba(0, 120, 255, 0.05)' : 'grey.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: isBuyNow ? 2 : 0 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Buy It Now
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buyers can purchase immediately at this price.
              </Typography>
            </Box>
            <Switch
              checked={isBuyNow}
              onChange={(e) => setIsBuyNow(e.target.checked)}
            />
          </Stack>

          {isBuyNow && (
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Price
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Beat the online trending price to maximize your chance of selling.
              </Typography>
              <TextField
                fullWidth
                value={buyNowPrice}
                onChange={(e) => setBuyNowPrice(e.target.value)}
                placeholder="0.00"
                type="text"
                inputMode="decimal"
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  },
                }}
              />
            </Box>
          )}
        </Paper>

        <Button
          variant="text"
          sx={{ textTransform: 'none' }}
        >
          More options
        </Button>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* DELIVERY Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Delivery
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant={deliveryMethod === 'shipping' ? 'contained' : 'outlined'}
            onClick={() => setDeliveryMethod('shipping')}
            sx={{ flex: 1, minWidth: 200, py: 2, textTransform: 'none', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Shipping only
            </Typography>
            <Typography variant="caption">
              Ship items directly to buyers with real-time rates.
            </Typography>
          </Button>

          <Button
            variant={deliveryMethod === 'pickup' ? 'contained' : 'outlined'}
            onClick={() => setDeliveryMethod('pickup')}
            sx={{ flex: 1, minWidth: 200, py: 2, textTransform: 'none', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Pickup only
            </Typography>
            <Typography variant="caption">
              Arrange local pickup without any shipping costs.
            </Typography>
          </Button>
        </Box>

        {deliveryMethod === 'shipping' && (
          <>
            <PackageDimensionsInput
              weightValue={packageWeightValue}
              weightUnit={packageWeightUnit}
              length={packageLength}
              width={packageWidth}
              height={packageHeight}
              dimensionUnit={packageDimensionUnit}
              onWeightValueChange={setPackageWeightValue}
              onWeightUnitChange={setPackageWeightUnit}
              onLengthChange={setPackageLength}
              onWidthChange={setPackageWidth}
              onHeightChange={setPackageHeight}
              onDimensionUnitChange={setPackageDimensionUnit}
              onGetRates={handleGetShippingRates}
              isLoading={loadingRates}
              error={submitError}
            />

            <ShippingRatesDisplay
              rates={shippingRates}
              selectedRateId={selectedShippingRateId}
              onSelectRate={setSelectedShippingRateId}
            />
          </>
        )}

        {deliveryMethod === 'pickup' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Buyers will arrange to pick up the item from you directly. Make sure to specify pickup details in your item description.
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Final Actions */}
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          List it for free
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          A <Typography component="span" color="primary" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>final value fee</Typography> applies when your item sells.
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ my: 2 }}>
          By selecting List it, you agree to accept the eBay User Agreement and Payments Terms of Use, acknowledge reading the User Privacy Notice, agree to offer products and services that comply with all applicable laws, and assume full responsibility for the item offered and the content of your listing.
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Stack spacing={2} sx={{ maxWidth: 400, mx: 'auto' }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmitListing}
            disabled={isSubmitting}
            sx={{ py: 1.5, textTransform: 'none', fontSize: '1.1rem' }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Uploading photos and creating listing...
              </>
            ) : (
              'List it'
            )}
          </Button>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            disabled={isSubmitting}
            sx={{ py: 1.5, textTransform: 'none', fontSize: '1.1rem' }}
          >
            Preview
          </Button>
          <Button
            variant="text"
            size="large"
            fullWidth
            disabled={isSubmitting}
            onClick={handleSaveDraft}
            sx={{ textTransform: 'none' }}
          >
            Save for later
          </Button>
        </Stack>
      </Paper>
    </Container>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />

      {/* Ship-From Address Modal */}
      <ShipFromAddressModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onAddressSelected={handleAddressSelected}
      />

      {/* Draft Restoration Dialog */}
      <Dialog open={showDraftDialog} onClose={() => setShowDraftDialog(false)}>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Restore color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Resume your listing?
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            We found a saved draft of your listing. Would you like to continue where you left off?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Your progress is automatically saved as you work. You can safely close this page and come back later.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDiscardDraft} variant="outlined">
            Start Fresh
          </Button>
          <Button onClick={handleRestoreDraft} variant="contained">
            Resume Draft
          </Button>
        </DialogActions>
      </Dialog>

      {/* Header with Back Button */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          py: 2,
          mt: 8,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
            <IconButton>
              <HelpOutline />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      {/* Main Content */}
      <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
        {step === 'search' && renderSearchStep()}
        {step === 'match' && renderMatchStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'complete' && renderCompleteListingStep()}
      </Box>
    </Box>
  );
}
