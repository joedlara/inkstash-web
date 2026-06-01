import { useState, useEffect, useCallback, useRef } from 'react';
import type { UploadedPhoto } from '../utils/photoUpload';

export interface ListingFormData {
  step: 'search' | 'complete';
  searchQuery: string;
  selectedCondition: string;
  selectedCategory: string;
  uploadedPhotos: UploadedPhoto[];
  title: string;
  description: string;
  isAuction: boolean;
  isBuyNow: boolean;
  buyNowPrice: string;
  auctionDurationDays: number; // 1-14 days for auction duration
  startingBid: string;
  deliveryMethod: string;
  selectedItem?: any;
  // Graded item fields
  isGraded: boolean;
  professionalGrader: string;
  grade: string;
  certificationNumber: string;
  // Comic metadata from ComicVine search (step 1)
  comicVineId?: number | null;
  issueNumber?: string;
  publisher?: string;
  writer?: string;
  artist?: string;
  coverImageUrl?: string;
  // Detail filters from match step
  detailFilters: {
    type?: string;
    brand?: string;
    year?: string;
    exclusiveEventRetailer?: string;
    franchise?: string;
    theme?: string;
    features?: string;
  };
  // Shipping fields
  packageWeightValue: string;
  packageWeightUnit: 'ounce' | 'pound';
  packageLength: string;
  packageWidth: string;
  packageHeight: string;
  packageDimensionUnit: 'inch' | 'centimeter';
  shippingRates: any[]; // ShippingRate[]
  selectedShippingRateId?: string;
  loadingRates: boolean;
}

const STORAGE_KEY = 'inkstash_listing_draft';
const AUTO_SAVE_DELAY = 1000; // 1 second debounce

export function useListingPersistence() {
  // Track if we've loaded from storage to prevent overwriting on first render
  const hasLoadedFromStorageRef = useRef(false);
  const isInitialMount = useRef(true);

  const [formData, setFormData] = useState<ListingFormData>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Note: File objects can't be serialized to localStorage.
        // Photos with blob URLs will not work after page refresh.
        // Filter out any blob URLs that are no longer valid.
        const validPhotos = parsed.uploadedPhotos?.filter((photo: UploadedPhoto) => {
          // Keep photos that have already been uploaded (have path)
          // Remove photos that only have blob URLs (will be broken after refresh)
          return photo.path && !photo.url.startsWith('blob:');
        }) || [];

        hasLoadedFromStorageRef.current = true;

        return {
          ...parsed,
          uploadedPhotos: validPhotos,
          // Add default values for new fields if they don't exist in saved data
          isGraded: parsed.isGraded ?? false,
          professionalGrader: parsed.professionalGrader ?? '',
          grade: parsed.grade ?? '',
          certificationNumber: parsed.certificationNumber ?? '',
          detailFilters: parsed.detailFilters ?? {},
          auctionDurationDays: parsed.auctionDurationDays ?? 7,
          startingBid: parsed.startingBid ?? '',
          // Shipping defaults
          packageWeightValue: parsed.packageWeightValue ?? '8',
          packageWeightUnit: parsed.packageWeightUnit ?? 'ounce',
          packageLength: parsed.packageLength ?? '6',
          packageWidth: parsed.packageWidth ?? '4',
          packageHeight: parsed.packageHeight ?? '1',
          packageDimensionUnit: parsed.packageDimensionUnit ?? 'inch',
          shippingRates: parsed.shippingRates ?? [],
          selectedShippingRateId: parsed.selectedShippingRateId,
          loadingRates: false,
        };
      } catch (error) {
        console.error('Error parsing saved listing data:', error);
      }
    }
    // Default values
    return {
      step: 'search',
      searchQuery: '',
      selectedCondition: '',
      selectedCategory: '',
      uploadedPhotos: [],
      title: '',
      description: '',
      isAuction: false,
      isBuyNow: true,
      buyNowPrice: '',
      auctionDurationDays: 7,
      startingBid: '',
      deliveryMethod: 'shipping',
      isGraded: false,
      professionalGrader: '',
      grade: '',
      certificationNumber: '',
      detailFilters: {},
      // Shipping defaults
      packageWeightValue: '8',
      packageWeightUnit: 'ounce',
      packageLength: '6',
      packageWidth: '4',
      packageHeight: '1',
      packageDimensionUnit: 'inch',
      shippingRates: [],
      loadingRates: false,
    };
  });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (formData.uploadedPhotos) {
        formData.uploadedPhotos.forEach((photo) => {
          if (photo.url.startsWith('blob:')) {
            URL.revokeObjectURL(photo.url);
          }
        });
      }
    };
  }, []);

  // Auto-save to localStorage (skip on initial mount)
  useEffect(() => {
    // Skip the first render to avoid overwriting loaded data
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      // Create a copy without File objects and blob URLs (which can't be serialized)
      const dataToSave = {
        ...formData,
        uploadedPhotos: formData.uploadedPhotos
          .filter((photo) => {
            // Only save photos that have been uploaded to server (have path)
            // Skip blob URLs and data URLs - they're too large for localStorage
            return photo.path && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:');
          })
          .map((photo) => ({
            url: photo.url,
            path: photo.path,
            type: photo.type,
            // Omit 'file' property - it can't be serialized
          })),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded. Skipping save of draft.');
          // Optionally clear old data or notify user
        } else {
          console.error('Error saving to localStorage:', error);
        }
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const updateFormData = useCallback((updates: Partial<ListingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearDraft = useCallback(() => {
    // Revoke all blob URLs to free up memory
    if (formData.uploadedPhotos) {
      formData.uploadedPhotos.forEach((photo) => {
        if (photo.url.startsWith('blob:')) {
          URL.revokeObjectURL(photo.url);
        }
      });
    }

    localStorage.removeItem(STORAGE_KEY);
    setFormData({
      step: 'search',
      searchQuery: '',
      selectedCondition: '',
      selectedCategory: '',
      uploadedPhotos: [],
      title: '',
      description: '',
      isAuction: false,
      isBuyNow: true,
      buyNowPrice: '',
      auctionDurationDays: 7,
      startingBid: '',
      deliveryMethod: 'shipping',
      isGraded: false,
      professionalGrader: '',
      grade: '',
      certificationNumber: '',
      detailFilters: {},
      // Shipping defaults
      packageWeightValue: '8',
      packageWeightUnit: 'ounce',
      packageLength: '6',
      packageWidth: '4',
      packageHeight: '1',
      packageDimensionUnit: 'inch',
      sellerPaysShipping: false,
      shippingRates: [],
      loadingRates: false,
    });
  }, [formData.uploadedPhotos]);

  const hasDraft = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  return {
    formData,
    updateFormData,
    clearDraft,
    hasDraft,
  };
}