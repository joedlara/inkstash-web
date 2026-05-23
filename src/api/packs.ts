import { supabase } from './supabase/supabaseClient';

export interface Pack {
  id: string;
  name: string;
  partner: string;
  price: number;
  item_count: number;
  rarity_tiers: { common: number; rare: number; legendary: number };
  status: 'active' | 'sold_out' | 'upcoming' | 'archived';
  cover_image: string | null;
  badge: string | null;
  drop_at: string | null;
  created_at: string;
}

export interface PackItem {
  id: string;
  pack_id: string;
  comic_title: string;
  issue_number: string | null;
  grade: string | null;
  condition: string | null;
  rarity: 'common' | 'rare' | 'legendary';
  estimated_value: number | null;
  image_url: string | null;
  quantity: number;
  remaining: number;
  /** Inventory row id, set by open-pack-rubies. Null when reading from
   *  pack_purchases.items_received historical snapshots. */
  inventory_id?: string | null;
}

export interface PackPurchase {
  id: string;
  user_id: string;
  pack_id: string;
  items_received: PackItem[];
  stripe_payment_intent_id: string | null;
  revealed_at: string | null;
  created_at: string;
  pack?: Pick<Pack, 'id' | 'name' | 'partner' | 'cover_image'>;
}

export interface OpenPackResult {
  purchase_id: string;
  items: PackItem[];
}

export const FALLBACK_PACKS: Pack[] = [
  { id: 'p1', name: 'DC Legends Pack',        partner: 'DC × InkStash',    price: 14.99, item_count: 5, rarity_tiers: { common: 0.80, rare: 0.18, legendary: 0.02 }, status: 'active',   cover_image: 'https://picsum.photos/seed/dc1/400/520',     badge: 'COLLAB',   drop_at: null, created_at: '' },
  { id: 'p2', name: 'Spider-Verse Keys',      partner: 'InkStash House',   price: 24.99, item_count: 3, rarity_tiers: { common: 0.70, rare: 0.25, legendary: 0.05 }, status: 'active',   cover_image: 'https://picsum.photos/seed/spider1/400/520', badge: 'HOT',      drop_at: null, created_at: '' },
  { id: 'p3', name: 'Image Horror Bundle',    partner: 'Image × InkStash', price: 19.99, item_count: 4, rarity_tiers: { common: 0.85, rare: 0.14, legendary: 0.01 }, status: 'active',   cover_image: 'https://picsum.photos/seed/horror1/400/520', badge: 'NEW',      drop_at: null, created_at: '' },
  { id: 'p4', name: 'Conan Keys Pack',        partner: 'BOOM! × InkStash', price: 14.99, item_count: 5, rarity_tiers: { common: 0.75, rare: 0.22, legendary: 0.03 }, status: 'sold_out', cover_image: 'https://picsum.photos/seed/conan1/400/520',  badge: 'SOLD OUT', drop_at: null, created_at: '' },
  { id: 'p5', name: 'Marvel Silver Age',      partner: 'InkStash House',   price: 34.99, item_count: 6, rarity_tiers: { common: 0.62, rare: 0.30, legendary: 0.08 }, status: 'active',   cover_image: 'https://picsum.photos/seed/marvel1/400/520', badge: 'HOT',      drop_at: null, created_at: '' },
  { id: 'p6', name: 'Golden Age Mystery Box', partner: 'InkStash House',   price: 49.99, item_count: 4, rarity_tiers: { common: 0.55, rare: 0.35, legendary: 0.10 }, status: 'active',   cover_image: 'https://picsum.photos/seed/golden1/400/520', badge: 'NEW',      drop_at: null, created_at: '' },
];

export const packsAPI = {
  async list(): Promise<Pack[]> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .in('status', ['active', 'sold_out', 'upcoming'])
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return FALLBACK_PACKS;
    return data as Pack[];
  },

  async getById(packId: string): Promise<Pack | null> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (error || !data) return null;
    return data as Pack;
  },

  async listItems(packId: string): Promise<PackItem[]> {
    const { data, error } = await supabase
      .from('pack_items')
      .select('*')
      .eq('pack_id', packId)
      .order('rarity', { ascending: true });

    if (error || !data) return [];
    return data as PackItem[];
  },

  async getPurchase(purchaseId: string): Promise<PackPurchase | null> {
    const { data, error } = await supabase
      .from('pack_purchases')
      .select('*, pack:packs(id, name, partner, cover_image)')
      .eq('id', purchaseId)
      .single();

    if (error || !data) return null;
    return data as PackPurchase;
  },

  async openPack(packId: string, stripePaymentIntentId?: string): Promise<OpenPackResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to open a pack');

    const { data, error } = await supabase.functions.invoke('open-pack', {
      body: {
        pack_id: packId,
        stripe_payment_intent_id: stripePaymentIntentId ?? null,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as OpenPackResult;
  },
};
