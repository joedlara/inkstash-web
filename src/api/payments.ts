import { supabase } from './supabase/supabaseClient';

/**
 * Saved Stripe payment methods. Reads from public.user_payment_methods
 * (populated by the stripe-webhook Edge Function on payment_intent.succeeded).
 * Card data is never stored in plaintext — only brand, last4, exp, and the
 * Stripe payment_method id are kept.
 */
export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number;
  card_exp_year: number;
  is_default: boolean;
  created_at: string;
}

interface DbRow {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  card_brand: string;
  card_last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
  created_at: string;
}

function fromDb(row: DbRow): PaymentMethod {
  return {
    id: row.id,
    user_id: row.user_id,
    stripe_payment_method_id: row.stripe_payment_method_id,
    card_brand: row.card_brand,
    card_last4: row.card_last4,
    card_exp_month: row.exp_month,
    card_exp_year: row.exp_year,
    is_default: row.is_default,
    created_at: row.created_at,
  };
}

export interface ShippingAddress {
  id: string;
  user_id: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Payment Methods API. Backed by public.user_payment_methods. Cards are
// added implicitly during the Ruby bundle Stripe flow (the webhook saves
// them); this module only supports read / set-default / delete.
export const paymentMethodsAPI = {
  async getAll(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('id, user_id, stripe_payment_method_id, card_brand, card_last4, exp_month, exp_year, is_default, created_at')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((r) => fromDb(r as DbRow));
  },

  async setDefault(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // RPC enforces single-default constraint atomically.
    const { error } = await supabase.rpc('set_default_payment_method', {
      p_user_id: user.id,
      p_payment_method_id: id,
    });

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_payment_methods')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Shipping Addresses API
export const shippingAddressesAPI = {
  // Get all shipping addresses for the current user
  async getAll(): Promise<ShippingAddress[]> {
    const { data, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add a new shipping address
  async add(address: Omit<ShippingAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ShippingAddress> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if this is the first address
    const { data: existingAddresses } = await supabase
      .from('shipping_addresses')
      .select('id')
      .eq('user_id', user.id);

    const isFirst = !existingAddresses || existingAddresses.length === 0;

    const { data, error } = await supabase
      .from('shipping_addresses')
      .insert({
        ...address,
        user_id: user.id,
        is_default: isFirst || address.is_default, // First address is default
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a shipping address
  async update(id: string, address: Partial<Omit<ShippingAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<ShippingAddress> {
    const { data, error } = await supabase
      .from('shipping_addresses')
      .update(address)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Set a shipping address as default
  async setDefault(id: string): Promise<void> {
    const { error } = await supabase
      .from('shipping_addresses')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  // Delete a shipping address
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
