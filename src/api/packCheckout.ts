import { supabase } from './supabase/supabaseClient';

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export const packCheckoutAPI = {
  async createPaymentIntent(packId: string): Promise<CreatePaymentIntentResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to buy a pack');

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { pack_id: packId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as CreatePaymentIntentResult;
  },

  async pollPurchaseByIntent(paymentIntentId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('pack_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (error) return null;
    return data?.id ?? null;
  },
};
