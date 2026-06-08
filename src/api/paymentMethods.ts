import { supabase } from './supabase/supabaseClient';
import type { PackItem } from './packs';

export interface UserPaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

export interface ChargeSavedCardResult {
  purchase_id: string;
  items: PackItem[];
  amount: number;
}

export const paymentMethodsAPI = {
  async listMine(): Promise<UserPaymentMethod[]> {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as UserPaymentMethod[];
  },

  async getDefault(): Promise<UserPaymentMethod | null> {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserPaymentMethod;
  },

  async chargeSavedCard(packId: string): Promise<ChargeSavedCardResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in');

    const { data, error } = await supabase.functions.invoke('charge-saved-card', {
      body: { pack_id: packId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as ChargeSavedCardResult;
  },

  async remove(paymentMethodId: string): Promise<void> {
    const { error } = await supabase
      .from('user_payment_methods')
      .delete()
      .eq('id', paymentMethodId);

    if (error) throw new Error(error.message);
  },

  /** Pivots the is_default flag to the chosen row. Uses the
   *  set_default_payment_method RPC (migration 20260522020000) so the
   *  partial unique index never sees two defaults simultaneously. */
  async setDefault(paymentMethodId: string): Promise<void> {
    const { error } = await supabase.rpc('set_default_payment_method', {
      p_payment_method_id: paymentMethodId,
    });
    if (error) throw new Error(error.message);
  },

  /** Mints a SetupIntent so the client can collect a card without
   *  charging. Used by the in-stream WalletDrawer's add-card flow.
   *  Returns the client_secret for <PaymentElement>. */
  async createSetupIntent(): Promise<{ client_secret: string; setup_intent_id: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in');
    const { data, error } = await supabase.functions.invoke('create-setup-intent', {
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as { client_secret: string; setup_intent_id: string };
  },
};
