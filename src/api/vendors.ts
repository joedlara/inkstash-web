// src/api/vendors.ts
import { supabase } from './supabase/supabaseClient';
import type { Pack } from './packs';

export type VendorStatus = 'pending' | 'active' | 'paused' | 'offboarded';

export interface Vendor {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;                  // without leading '@'
  avatar_url: string | null;
  bio: string | null;
  is_publisher: boolean;
  commission_rate: number;         // InkStash's cut, e.g. 0.10 for launch partner
  stripe_connect_account_id: string | null;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export const vendorsAPI = {
  async getByHandle(handle: string): Promise<Vendor | null> {
    const cleaned = handle.startsWith('@') ? handle.slice(1) : handle;
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('handle', cleaned)
      .eq('status', 'active')
      .maybeSingle();
    if (error || !data) return null;
    return data as Vendor;
  },

  async listActive(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', 'active')
      .order('display_name', { ascending: true });
    if (error || !data) return [];
    return data as Vendor[];
  },

  async listPacksByVendor(vendorId: string): Promise<Pack[]> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('vendor_id', vendorId)
      .in('status', ['active', 'sold_out', 'upcoming'])
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Pack[];
  },
};
