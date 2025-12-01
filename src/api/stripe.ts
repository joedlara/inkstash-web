// src/api/stripe.ts - Stripe API integration using axios
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe as StripeClient } from '@stripe/stripe-js';

// Initialize Stripe client
let stripePromise: Promise<StripeClient | null>;

export const getStripe = (): Promise<StripeClient | null> => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Stripe publishable key not found');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

// Create axios instance for your backend Stripe endpoints
const stripeBackendClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
stripeBackendClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
stripeBackendClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ Stripe API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code,
    });
    return Promise.reject(error);
  }
);

// Types
export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaymentMethodDetails {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface CreateSetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

// Stripe API functions
export const stripeAPI = {
  /**
   * Create a payment intent for an auction purchase
   */
  async createPaymentIntent(
    data: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    const response = await stripeBackendClient.post<CreatePaymentIntentResponse>(
      '/stripe/create-payment-intent',
      {
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || 'usd',
        metadata: data.metadata,
        description: data.description,
      }
    );

    return response.data;
  },

  /**
   * Create a setup intent for saving payment methods
   */
  async createSetupIntent(): Promise<CreateSetupIntentResponse> {
    const response = await stripeBackendClient.post<CreateSetupIntentResponse>(
      '/stripe/create-setup-intent'
    );

    return response.data;
  },

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    const response = await stripeBackendClient.post('/stripe/confirm-payment', {
      paymentIntentId,
      paymentMethodId,
    });

    return response.data;
  },

  /**
   * Get payment method details
   */
  async getPaymentMethod(paymentMethodId: string): Promise<PaymentMethodDetails> {
    const response = await stripeBackendClient.get<PaymentMethodDetails>(
      `/stripe/payment-methods/${paymentMethodId}`
    );

    return response.data;
  },

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<void> {
    await stripeBackendClient.post('/stripe/attach-payment-method', {
      paymentMethodId,
      customerId,
    });
  },

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await stripeBackendClient.post('/stripe/detach-payment-method', {
      paymentMethodId,
    });
  },

  /**
   * Create a customer in Stripe
   */
  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<{ customerId: string }> {
    const response = await stripeBackendClient.post<{ customerId: string }>(
      '/stripe/create-customer',
      data
    );

    return response.data;
  },

  /**
   * Update customer information
   */
  async updateCustomer(
    customerId: string,
    data: {
      email?: string;
      name?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    await stripeBackendClient.patch(`/stripe/customers/${customerId}`, data);
  },

  /**
   * Create a refund
   */
  async createRefund(data: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<{ refundId: string }> {
    const response = await stripeBackendClient.post<{ refundId: string }>(
      '/stripe/create-refund',
      {
        paymentIntentId: data.paymentIntentId,
        amount: data.amount ? Math.round(data.amount * 100) : undefined,
        reason: data.reason,
      }
    );

    return response.data;
  },

  /**
   * Get webhook signature for verification
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string
  ): Promise<boolean> {
    const response = await stripeBackendClient.post<{ valid: boolean }>(
      '/stripe/verify-webhook',
      {
        payload,
        signature,
      }
    );

    return response.data.valid;
  },

  /**
   * Calculate platform fee for a transaction
   */
  calculatePlatformFee(amount: number, feePercentage: number = 2.5): number {
    return Math.round(amount * (feePercentage / 100) * 100) / 100;
  },

  /**
   * Format amount for display (cents to dollars)
   */
  formatAmount(cents: number): string {
    return (cents / 100).toFixed(2);
  },

  /**
   * Convert dollars to cents
   */
  toCents(dollars: number): number {
    return Math.round(dollars * 100);
  },

  /**
   * Convert cents to dollars
   */
  toDollars(cents: number): number {
    return cents / 100;
  },
};

export default stripeAPI;
