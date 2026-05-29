// src/api/sellers.ts
import { supabase } from './supabase/supabaseClient';

export type SellerStatus = 'inactive' | 'pending' | 'active' | 'paused';

export interface InitiateConnectOnboardingResult {
  url: string;
  stripe_connect_account_id: string;
}

export const sellersAPI = {
  /**
   * Triggers Stripe Connect Express onboarding for the authenticated user.
   * If they don't have a Connect account yet, the edge function creates one
   * and flips seller_status to 'pending'. Returns the Stripe-hosted
   * onboarding URL the user should be redirected to (in the same tab).
   * The webhook flips seller_status to 'active' once Stripe confirms
   * charges_enabled && payouts_enabled.
   */
  async initiateConnectOnboarding(): Promise<InitiateConnectOnboardingResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('initiate-seller-connect', {
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.url) throw new Error('No onboarding URL returned');

    return data as InitiateConnectOnboardingResult;
  },
};
