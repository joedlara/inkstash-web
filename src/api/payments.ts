import { supabase } from './supabase/supabaseClient';

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
  updated_at: string;
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

// Payment Methods API
export const paymentMethodsAPI = {
  // Get all payment methods for the current user
  async getAll(): Promise<PaymentMethod[]> {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add a new payment method
  async add(paymentMethodId: string, cardDetails: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  }): Promise<PaymentMethod> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if this is the first payment method
    const { data: existingMethods } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', user.id);

    const isFirst = !existingMethods || existingMethods.length === 0;

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: cardDetails.brand,
        card_last4: cardDetails.last4,
        card_exp_month: cardDetails.exp_month,
        card_exp_year: cardDetails.exp_year,
        is_default: isFirst, // First payment method is default
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Set a payment method as default
  async setDefault(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
  },

  // Delete a payment method
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_methods')
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
