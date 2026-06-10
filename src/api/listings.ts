// src/api/listings.ts
import { supabase } from './supabase/supabaseClient';

export interface ListVaultItemResult {
  listing_id: string;
}

export type SellerInventoryItem = {
  id: string;
  title: string;
  photos: Array<{ url: string }> | null;
  buy_now_price: number | null;
  quantity: number;
  status: string;
};

export const listingsAPI = {
  /**
   * Returns the seller's active marketplace listings that have a buy-now
   * price set. Powers the livestream Shop rail (pure buy-now display — no
   * bidding, no per-stream queue). For the auction queue, see
   * livestreamsAPI.listItems / livestream_items.
   *
   * We don't strictly require is_buy_now=true; some sellers set
   * buy_now_price without toggling the flag, and a price is the only
   * thing the rail actually needs.
   */
  async listSellerInventory(userId: string): Promise<SellerInventoryItem[]> {
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, photos, buy_now_price, quantity, status, is_buy_now')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[listingsAPI.listSellerInventory] failed', error);
      return [];
    }
    return (data ?? [])
      .filter((r: { buy_now_price: number | null }) => r.buy_now_price != null)
      .map((r: {
        id: string;
        title: string;
        photos: Array<{ url: string }> | null;
        buy_now_price: number | null;
        quantity: number;
        status: string;
      }) => ({
        id: r.id,
        title: r.title,
        photos: r.photos ?? null,
        buy_now_price: r.buy_now_price,
        quantity: r.quantity,
        status: r.status,
      }));
  },

  /**
   * Lists a vault inventory item for sale on the marketplace.
   * Returns the new listing id. The book stays in the InkStash vault;
   * ownership transfers when the listing sells (handled by M3's
   * open-listing-order edge function).
   */
  async listVaultItem(inventoryId: string, priceCents: number): Promise<ListVaultItemResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('list-vault-item', {
      body: {
        inventory_id: inventoryId,
        price_cents: priceCents,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) {
      // Surface common error codes as readable messages
      if (data.error === 'seller_not_verified') {
        throw new Error('Complete seller verification before listing items.');
      }
      if (data.error === 'not_owner') {
        throw new Error('You do not own this inventory item.');
      }
      if (data.error === 'not_vaulted') {
        throw new Error('This item is not currently in your vault.');
      }
      if (data.error === 'vendor_pack_item') {
        throw new Error('Vendor pack items cannot be listed on the marketplace.');
      }
      throw new Error(data.message ?? data.error);
    }
    if (!data?.listing_id) throw new Error('No listing id returned');
    return data as ListVaultItemResult;
  },

  /**
   * Delists an active listing. Calls the delist-listing edge function so
   * the listing status flip + vault inventory revert happen atomically
   * under service role. sell_back_forfeited stays true per M2 policy
   * (one-shot forfeit — listing once permanently disables Ruby sell-back).
   */
  async delist(listingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('delist-listing', {
      body: { listing_id: listingId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
  },
};
