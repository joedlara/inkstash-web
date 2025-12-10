// src/api/seller.ts - Seller onboarding and management API
import { api } from './axiosClient';
import { mockSellerApi, shouldUseMockAPI } from './seller-mock';

// Types
export interface SellerOnboardingData {
  agreedToTerms: boolean;
  plaidBankToken?: string;
  plaidIdentityToken?: string;
  currentStep?: number;
  bankConnected?: boolean;
  identityVerified?: boolean;
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    ssn?: string;
  };
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    taxId?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  status: 'pending' | 'in_progress' | 'verified' | 'rejected';
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidPublicTokenExchangeResponse {
  access_token: string;
  item_id: string;
}

// Helper to get Supabase Function URL
const getSupabaseFunctionUrl = (functionName: string): string => {
  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

// Seller Onboarding API
export const sellerApi = {
  // Create Plaid Link Token for Bank Connection (ACH)
  // Backend should configure with products: ['auth'] for bank account verification
  createPlaidBankLinkToken: async (): Promise<PlaidLinkTokenResponse> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.createPlaidBankLinkToken();
    }
    try {
      const url = getSupabaseFunctionUrl('create-plaid-bank-link-token');
      return await api.post(url);
    } catch (error) {
      throw error;
    }
  },

  // Create Plaid Link Token for Identity Verification
  createPlaidIdentityVerificationToken: async (): Promise<PlaidLinkTokenResponse> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.createPlaidIdentityVerificationToken();
    }
    try {
      const url = getSupabaseFunctionUrl('create-plaid-identity-verification-token');
      console.log('🔗 Calling Plaid Identity Verification:', url);
      return await api.post(url);
    } catch (error) {
      console.error('Failed to create Plaid identity verification token:', error);
      throw error;
    }
  },

  // Exchange Plaid public token for access token (Bank)
  exchangePlaidBankToken: async (publicToken: string): Promise<PlaidPublicTokenExchangeResponse> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.exchangePlaidBankToken(publicToken);
    }
    try {
      const url = getSupabaseFunctionUrl('exchange-plaid-bank-token');
      return await api.post(url, {
        public_token: publicToken,
      });
    } catch (error) {
      throw error;
    }
  },

  // Exchange Plaid public token for access token (Identity)
  exchangePlaidIdentityToken: async (publicToken: string): Promise<PlaidPublicTokenExchangeResponse> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.exchangePlaidIdentityToken(publicToken);
    }
    try {
      const url = getSupabaseFunctionUrl('exchange-plaid-identity-token');
      return await api.post(url, {
        public_token: publicToken,
      });
    } catch (error) {
      console.error('Error exchanging Plaid identity token:', error);
      throw error;
    }
  },

  // Submit seller onboarding application
  submitOnboarding: async (data: Partial<SellerOnboardingData>): Promise<SellerOnboardingData> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.submitOnboarding(data);
    }
    try {
      const url = getSupabaseFunctionUrl('submit-seller-onboarding');
      return await api.post(url, data);
    } catch (error) {
      console.error('Error submitting seller onboarding:', error);
      throw error;
    }
  },

  // Update seller onboarding status
  updateOnboarding: async (
    sellerId: string,
    data: Partial<SellerOnboardingData>
  ): Promise<SellerOnboardingData> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.updateOnboarding(sellerId, data);
    }
    try {
      return await api.patch(`/seller/onboarding/${sellerId}`, data);
    } catch (error) {
      console.error('Error updating seller onboarding:', error);
      throw error;
    }
  },

  // Get seller onboarding status
  getOnboardingStatus: async (sellerId: string): Promise<SellerOnboardingData> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.getOnboardingStatus(sellerId);
    }
    try {
      return await api.get(`/seller/onboarding/${sellerId}`);
    } catch (error) {
      console.error('Error getting seller onboarding status:', error);
      throw error;
    }
  },

  // Get current user's onboarding progress (used to restore state on refresh)
  getCurrentOnboardingProgress: async (): Promise<SellerOnboardingData | null> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.getCurrentOnboardingProgress();
    }
    try {
      const url = getSupabaseFunctionUrl('get-seller-onboarding-progress');
      return await api.get(url);
    } catch (error) {
      console.error('Error getting current onboarding progress:', error);
      // Return null if no onboarding exists yet
      return null;
    }
  },

  // Save onboarding progress (step completion tracking)
  saveOnboardingProgress: async (data: {
    currentStep: number;
    agreedToTerms?: boolean;
    bankConnected?: boolean;
    identityVerified?: boolean;
  }): Promise<void> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.saveOnboardingProgress(data);
    }
    try {
      const url = getSupabaseFunctionUrl('save-seller-onboarding-progress');
      await api.post(url, data);
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
      throw error;
    }
  },

  // Get current seller profile
  getSellerProfile: async (): Promise<any> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.getSellerProfile();
    }
    try {
      return await api.get('/seller/profile');
    } catch (error) {
      console.error('Error getting seller profile:', error);
      throw error;
    }
  },

  // Update seller profile
  updateSellerProfile: async (data: any): Promise<any> => {
    if (shouldUseMockAPI()) {
      return mockSellerApi.updateSellerProfile(data);
    }
    try {
      return await api.patch('/seller/profile', data);
    } catch (error) {
      console.error('Error updating seller profile:', error);
      throw error;
    }
  },
};

export default sellerApi;
