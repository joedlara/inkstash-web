// src/api/listings.ts
import { supabase } from './supabase/supabaseClient';

export interface ListVaultItemResult {
  listing_id: string;
}

export const listingsAPI = {
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
   * Delists an active listing (the seller's own only). Sets status to 'delisted'
   * and if it was a vault listing, reverts inventory.status back to 'vaulted'.
   *
   * For M2 this is a simple status update (RLS-enforced ownership). When a
   * full delist flow is needed (e.g., to revert inventory atomically), revisit.
   */
  async delist(listingId: string): Promise<void> {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'delisted' })
      .eq('id', listingId);
    if (error) throw new Error(error.message);

    // Best-effort: if there's a source_inventory_id, revert it.
    const { data: listing } = await supabase
      .from('listings')
      .select('source_inventory_id')
      .eq('id', listingId)
      .maybeSingle();

    if (listing?.source_inventory_id) {
      await supabase
        .from('user_inventory')
        .update({ status: 'vaulted' })
        .eq('id', listing.source_inventory_id);
    }
  },
};
