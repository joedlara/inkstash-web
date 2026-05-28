import { supabase } from './supabase/supabaseClient';

export interface UserAddress {
  id: string;
  user_id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

export interface NewAddressInput {
  full_name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  phone?: string | null;
  is_default?: boolean;
}

export const addressesAPI = {
  async listMine(): Promise<UserAddress[]> {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as UserAddress[];
  },

  async getDefault(): Promise<UserAddress | null> {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserAddress;
  },

  async create(input: NewAddressInput): Promise<UserAddress> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('user_id', user.id);
    const isFirst = !existing || existing.length === 0;

    const { data, error } = await supabase
      .from('user_addresses')
      .insert({
        ...input,
        user_id: user.id,
        country: input.country ?? 'US',
        is_default: input.is_default ?? isFirst,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Could not save address');
    return data as UserAddress;
  },

  async setDefault(addressId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('set_default_address', {
      p_user_id: user.id,
      p_address_id: addressId,
    });

    if (error) throw new Error(error.message);
  },

  async remove(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw new Error(error.message);
  },
};
