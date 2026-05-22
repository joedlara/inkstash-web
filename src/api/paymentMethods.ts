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
};
