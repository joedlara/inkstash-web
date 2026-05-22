import { supabase } from './supabase/supabaseClient';
import type { PackItem } from './packs';

export interface OpenPackRubiesResult {
  purchase_id: string;
  items: PackItem[];
  ruby_cost: number;
}

export interface ChargeBundleResult {
  paymentIntentId: string;
  status: 'succeeded' | string;
  bundleId: string;
  rubyTotal: number;
}

export const rubiesAPI = {
  async getBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('users')
      .select('ruby_balance')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return 0;
    return data.ruby_balance ?? 0;
  },

  async openPackWithRubies(packId: string): Promise<OpenPackRubiesResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in');

    const { data, error } = await supabase.functions.invoke('open-pack-rubies', {
      body: { pack_id: packId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as OpenPackRubiesResult;
  },

  /** Create a Stripe PaymentIntent for buying a Ruby bundle. Used by Elements flow. */
  async createBundleIntent(bundleId: string): Promise<{ clientSecret: string; paymentIntentId: string; amount: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in');

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { bundle_id: bundleId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as { clientSecret: string; paymentIntentId: string; amount: number };
  },

  /** One-tap Ruby bundle purchase using the user's saved default card. */
  async chargeBundleSavedCard(bundleId: string): Promise<ChargeBundleResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in');

    const { data, error } = await supabase.functions.invoke('charge-saved-card', {
      body: { bundle_id: bundleId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as ChargeBundleResult;
  },

  /**
   * Poll users.ruby_balance until it reaches expectedAtLeast. Used after
   * a bundle purchase to detect when the webhook has credited Rubies.
   * Returns the final balance or null on timeout.
   */
  async waitForBalanceAtLeast(userId: string, expectedAtLeast: number, timeoutMs = 20_000): Promise<number | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const balance = await this.getBalance(userId);
      if (balance >= expectedAtLeast) return balance;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return null;
  },
};
