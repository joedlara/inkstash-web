import { supabase } from './supabase/supabaseClient'

export interface SellerShipFromAddress {
  id: string;
  userId: string;
  fullName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  nickname?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const sellerShipFromAddressesAPI = {
  // Get all ship-from addresses for current user
  async getAll(): Promise<SellerShipFromAddress[]> {
    try {
      const { data, error } = await supabase
        .from('seller_ship_from_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(transformFromDB);
    } catch (error) {
      console.error('Error fetching ship-from addresses:', error);
      throw error;
    }
  },

  // Get default ship-from address
  async getDefault(): Promise<SellerShipFromAddress | null> {
    try {
      const { data, error } = await supabase
        .from('seller_ship_from_addresses')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? transformFromDB(data) : null;
    } catch (error) {
      console.error('Error fetching default ship-from address:', error);
      throw error;
    }
  },

  // Add new ship-from address
  async add(address: Omit<SellerShipFromAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SellerShipFromAddress> {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('seller_ship_from_addresses')
        .insert({
          user_id: user.id,
          full_name: address.fullName,
          company_name: address.companyName,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2,
          city: address.city,
          state: address.state,
          postal_code: address.postalCode,
          country: address.country,
          phone: address.phone,
          is_default: address.isDefault,
          nickname: address.nickname,
        })
        .select()
        .single();

      if (error) throw error;
      return transformFromDB(data);
    } catch (error) {
      console.error('Error adding ship-from address:', error);
      throw error;
    }
  },

  // Update ship-from address
  async update(id: string, updates: Partial<Omit<SellerShipFromAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<SellerShipFromAddress> {
    try {
      const { data, error } = await supabase
        .from('seller_ship_from_addresses')
        .update({
          ...(updates.fullName && { full_name: updates.fullName }),
          ...(updates.companyName !== undefined && { company_name: updates.companyName }),
          ...(updates.addressLine1 && { address_line1: updates.addressLine1 }),
          ...(updates.addressLine2 !== undefined && { address_line2: updates.addressLine2 }),
          ...(updates.city && { city: updates.city }),
          ...(updates.state && { state: updates.state }),
          ...(updates.postalCode && { postal_code: updates.postalCode }),
          ...(updates.country && { country: updates.country }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.isDefault !== undefined && { is_default: updates.isDefault }),
          ...(updates.nickname !== undefined && { nickname: updates.nickname }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformFromDB(data);
    } catch (error) {
      console.error('Error updating ship-from address:', error);
      throw error;
    }
  },

  // Set address as default
  async setDefault(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('seller_ship_from_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error setting default ship-from address:', error);
      throw error;
    }
  },

  // Delete ship-from address
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('seller_ship_from_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting ship-from address:', error);
      throw error;
    }
  },
};

function transformFromDB(data: any): SellerShipFromAddress {
  return {
    id: data.id,
    userId: data.user_id,
    fullName: data.full_name,
    companyName: data.company_name,
    addressLine1: data.address_line1,
    addressLine2: data.address_line2,
    city: data.city,
    state: data.state,
    postalCode: data.postal_code,
    country: data.country,
    phone: data.phone,
    isDefault: data.is_default,
    nickname: data.nickname,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
