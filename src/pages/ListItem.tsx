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
  InputAdornment,
  Alert,
  Tooltip,
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
  HelpOutline,
  Add,
  AutoAwesome,
  Image as ImageIcon,
  Restore,
} from '@mui/icons-material';

// Condition options — comics-specific
const CONDITION_OPTIONS = [
  { value: 'sealed', label: 'Sealed' },
  { value: 'near-mint', label: 'Near Mint' },
  { value: 'very-fine', label: 'Very Fine' },
  { value: 'fine', label: 'Fine' },
  { value: 'good', label: 'Good' },
  { value: 'poor', label: 'Poor' },
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
import AppShell from '../components/layout/AppShell';
import PhotoUploadSection from '../components/listing/PhotoUploadSection';
import PackageDimensionsInput from '../components/listing/PackageDimensionsInput';
import ShippingRatesDisplay from '../components/listing/ShippingRatesDisplay';
import ShipFromAddressModal from '../components/listing/ShipFromAddressModal';
import type { ComicSelection } from '../components/listings/ComicSearchInput';
import ListingStartPanel from '../components/listings/ListingStartPanel';
import SellerConnectGate from '../components/listings/SellerConnectGate';
import { useListingPersistence } from '../hooks/useListingPersistence';
import { uploadListingPhoto } from '../utils/photoUpload';
import type { UploadedPhoto } from '../utils/photoUpload';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase/supabaseClient';
import { shippingRatesAPI } from '../api/shipping';
import { sellerShipFromAddressesAPI, type SellerShipFromAddress } from '../api/sellerShipFromAddresses';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

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

// Detail filter options for the match step - Comics-only filters
const DETAIL_FILTER_OPTIONS = {
  type: ['Floppy (Single Issue)', 'Trade Paperback / OGN', 'Graded Slab', 'Variant Cover', 'Key / First Appearance', 'Golden Age / Silver Age', 'Limited Edition / Signed', 'Other'],
  brand: ['Various - Type to add'],
  year: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'Pre-2020', 'Other'],
  exclusiveEventRetailer: ['Store Exclusive', 'Convention Exclusive', 'Limited Release', 'Standard Release', 'Other'],
  franchise: ['Marvel', 'DC', 'Image', 'Dark Horse', 'IDW', 'BOOM! Studios', 'Independent', 'Other'],
  theme: ['Superhero', 'Horror', 'Sci-Fi', 'Fantasy', 'Crime / Noir', 'Manga', 'Other'],
  features: ['Limited Edition', 'Signed', 'First Edition', 'Numbered', 'Foil Cover', 'Newsstand', 'Other'],
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

  // Seller verification gate
  const isSeller = user?.seller_status === 'active';

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
      setStep('search');
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

  const handleComicSelected = (sel: ComicSelection) => {
    updateFormData({
      title: sel.title,
      issueNumber: sel.issue_number ?? '',
      publisher: sel.publisher ?? '',
      writer: sel.writer ?? '',
      artist: sel.artist ?? '',
      coverImageUrl: sel.cover_url ?? '',
      comicVineId: sel.comic_vine_id,
      // Skip the deleted 'match' + 'details' confirm steps. Go straight
      // to the listing form so the seller fills it out in one place.
      step: 'complete',
    });
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
          // Shipping fields — preserve so resuming the draft does not reset them
          package_weight_value: deliveryMethod === 'shipping' && packageWeightValue ? parseFloat(packageWeightValue) : null,
          package_weight_unit: deliveryMethod === 'shipping' ? packageWeightUnit : null,
          package_length: deliveryMethod === 'shipping' && packageLength ? parseFloat(packageLength) : null,
          package_width: deliveryMethod === 'shipping' && packageWidth ? parseFloat(packageWidth) : null,
          package_height: deliveryMethod === 'shipping' && packageHeight ? parseFloat(packageHeight) : null,
          package_dimension_unit: deliveryMethod === 'shipping' ? packageDimensionUnit : null,
          selected_shipping_rate_id: deliveryMethod === 'shipping' ? selectedShippingRateId : null,
          // Comic metadata — preserve so a draft started from ComicVine search
          // restores the matched comic instead of forcing the user to re-search
          comic_vine_id: formData.comicVineId ?? null,
          comic_publisher: formData.publisher || null,
          comic_writer: formData.writer || null,
          comic_artist: formData.artist || null,
          comic_issue_number: formData.issueNumber || null,
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
          category: null,
          photos: [], // Will update after uploading photos
          is_auction: isAuction,
          is_buy_now: isBuyNow,
          buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
          starting_bid: isAuction && startingBid ? parseFloat(startingBid) : null,
          auction_start_time: auctionStartTime?.toISOString(),
          auction_end_time: auctionEndTime?.toISOString(),
          auction_duration_days: isAuction ? auctionDurationDays : null,
          delivery_method: deliveryMethod,
          quantity: 1,
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
          // Comic metadata from ComicVine search
          comic_vine_id: formData.comicVineId ?? null,
          comic_publisher: formData.publisher || null,
          comic_writer: formData.writer || null,
          comic_artist: formData.artist || null,
          comic_issue_number: formData.issueNumber || null,
          // Platform fee snapshot
          application_fee_pct: 0.100,
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
    <ListingStartPanel onPicked={(sel) => handleComicSelected(sel)} />
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
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Title
        </Typography>

        <TextField
          fullWidth
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Absolute Batman #1"
          helperText="The comic's name and issue number, as buyers will see it."
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
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            Description
          </Typography>
          <Tooltip title="AI description coming soon. Upload photos first so we can generate from cover art.">
            <span>
              <Button
                variant="outlined"
                size="small"
                disabled
                startIcon={<AutoAwesome fontSize="small" />}
                sx={{
                  textTransform: 'none',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontFamily: inkstashFonts.ui,
                  borderColor: inkstashColors.borderStrong,
                  color: inkstashColors.muted,
                }}
              >
                Generate from photos
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <TextField
          fullWidth
          multiline
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what makes this copy worth buying — issue, printing, condition notes, signed/sealed details, anything special."
          sx={{ mb: 1 }}
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* PRICING Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Pricing
        </Typography>

        {/* Buy It Now price (auctions are Phase 6) */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(0, 120, 255, 0.05)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Buy It Now
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set the price buyers pay to purchase immediately.
            </Typography>
          </Box>

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
        </Paper>
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

  // Seller verification gate — show card instead of wizard for unverified users
  if (!isSeller) {
    return (
      <AppShell>
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5, fontFamily: inkstashFonts.display }}>
            Verify to start selling
          </Typography>
          <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
            List items on InkStash after a 5-minute verification with Stripe.
          </Typography>
          <SellerConnectGate>
            <Button
              variant="contained"
              size="large"
              sx={{ fontWeight: 700, py: 1.5, px: 4 }}
            >
              Start verification
            </Button>
          </SellerConnectGate>
        </Container>
      </AppShell>
    );
  }

  return (
    <AppShell>

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

      {/* Main Content */}
      <Box sx={{ minHeight: 'calc(100vh - 200px)' }}>
        {step === 'search' && renderSearchStep()}
        {step === 'complete' && renderCompleteListingStep()}
      </Box>
    </AppShell>
  );
}
