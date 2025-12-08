// Mock API for seller onboarding development
// This allows testing the UI flow without a backend
// Set VITE_USE_MOCK_SELLER_API=true in .env to enable

import type { PlaidLinkTokenResponse, PlaidPublicTokenExchangeResponse, SellerOnboardingData } from './seller';

const MOCK_DELAY = 1000; // Simulate network delay

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockSellerApi = {
  // Mock Plaid Link Token for Bank Connection
  createPlaidBankLinkToken: async (): Promise<PlaidLinkTokenResponse> => {
    await delay(MOCK_DELAY);

    return {
      link_token: 'link-sandbox-mock-' + Date.now(),
      expiration: new Date(Date.now() + 3600000).toISOString(),
    };
  },

  // Mock Plaid Link Token for Identity Verification
  createPlaidIdentityVerificationToken: async (): Promise<PlaidLinkTokenResponse> => {
    await delay(MOCK_DELAY);

    return {
      link_token: 'link-identity-sandbox-mock-' + Date.now(),
      expiration: new Date(Date.now() + 3600000).toISOString(),
    };
  },

  // Mock Exchange Plaid public token for access token (Bank)
  exchangePlaidBankToken: async (publicToken: string): Promise<PlaidPublicTokenExchangeResponse> => {
    await delay(MOCK_DELAY);

    return {
      access_token: 'access-sandbox-mock-' + Date.now(),
      item_id: 'item-sandbox-mock-' + Date.now(),
    };
  },

  // Mock Exchange Plaid public token for access token (Identity)
  exchangePlaidIdentityToken: async (publicToken: string): Promise<PlaidPublicTokenExchangeResponse> => {
    await delay(MOCK_DELAY);

    return {
      access_token: 'access-identity-sandbox-mock-' + Date.now(),
      item_id: 'item-identity-sandbox-mock-' + Date.now(),
    };
  },

  // Mock Submit seller onboarding application
  submitOnboarding: async (data: Partial<SellerOnboardingData>): Promise<SellerOnboardingData> => {
    await delay(MOCK_DELAY);

    return {
      ...data,
      status: 'in_progress',
    } as SellerOnboardingData;
  },

  // Mock Update seller onboarding status
  updateOnboarding: async (
    sellerId: string,
    data: Partial<SellerOnboardingData>
  ): Promise<SellerOnboardingData> => {
    await delay(MOCK_DELAY);

    return {
      ...data,
      status: data.status || 'in_progress',
    } as SellerOnboardingData;
  },

  // Mock Get seller onboarding status
  getOnboardingStatus: async (sellerId: string): Promise<SellerOnboardingData> => {
    await delay(MOCK_DELAY);

    return {
      agreedToTerms: false,
      status: 'pending',
    } as SellerOnboardingData;
  },

  // Mock Get current user's onboarding progress
  getCurrentOnboardingProgress: async (): Promise<SellerOnboardingData | null> => {
    await delay(MOCK_DELAY);

    const savedProgress = localStorage.getItem('mock_seller_onboarding_progress');
    if (savedProgress) {
      return JSON.parse(savedProgress);
    }

    return null;
  },

  // Mock Save onboarding progress
  saveOnboardingProgress: async (data: {
    currentStep: number;
    agreedToTerms?: boolean;
    bankConnected?: boolean;
    identityVerified?: boolean;
  }): Promise<void> => {
    await delay(MOCK_DELAY);

    const progressData: SellerOnboardingData = {
      ...data,
      status: 'in_progress',
    } as SellerOnboardingData;

    localStorage.setItem('mock_seller_onboarding_progress', JSON.stringify(progressData));
  },

  // Mock Get current seller profile
  getSellerProfile: async (): Promise<any> => {
    await delay(MOCK_DELAY);

    return {
      id: 'mock-seller-id',
      username: 'mockseller',
      full_name: 'Mock Seller',
      seller_verified: false,
    };
  },

  // Mock Update seller profile
  updateSellerProfile: async (data: any): Promise<any> => {
    await delay(MOCK_DELAY);

    return {
      ...data,
      updated_at: new Date().toISOString(),
    };
  },
};

// Helper to check if mock API should be used
export const shouldUseMockAPI = (): boolean => {
  return import.meta.env.VITE_USE_MOCK_SELLER_API === 'true';
};
