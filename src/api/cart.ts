// src/api/cart.ts
//
// Server-side cart sync. The CartContext is the source of truth for the UI;
// these functions just keep the cart_items table in sync so the buyer's
// cart follows them across devices.
//
// Each call is small + idempotent. The context calls them optimistically
// (UI updates first, server roundtrip in the background; rollback on error).

import { supabase } from './supabase/supabaseClient';

export interface ServerCartItem {
  listing_id: string;
  title: string;
  cover_url: string | null;
  price: number;
  shipping_cost: number;
  seller_id: string;
  seller_username: string;
  added_at: string;
}

interface ServerCartRow {
  listing_id: string;
  added_at: string;
  listings: {
    id: string;
    title: string;
    photos: Array<{ url?: string }> | null;
    buy_now_price: number;
    status: string;
    user_id: string;
    selected_shipping_rate_id: string | null;
    shipping_rates?: { rate_amount?: number } | { rate_amount?: number }[] | null;
    users?: { username: string } | { username: string }[] | null;
  } | { id: string; [k: string]: unknown }[] | null;
}

function unwrap<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

export const cartAPI = {
  /**
   * Read the signed-in user's cart from the server. Joins each cart_items
   * row to its listing, the listing's seller, and the seller's selected
   * shipping rate so the caller has everything the UI needs in one fetch.
   *
   * Filters out cart items whose listings are no longer active — those
   * get treated as if the buyer never had them.
   */
  async getCart(): Promise<ServerCartItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        listing_id,
        added_at,
        listings (
          id,
          title,
          photos,
          buy_now_price,
          status,
          user_id,
          selected_shipping_rate_id,
          shipping_rates ( rate_amount ),
          users ( username )
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[cartAPI.getCart] failed', error);
      return [];
    }

    return ((data ?? []) as unknown as ServerCartRow[])
      .map((row): ServerCartItem | null => {
        const listing = unwrap(row.listings) as {
          id: string;
          title: string;
          photos: Array<{ url?: string }> | null;
          buy_now_price: number;
          status: string;
          user_id: string;
          shipping_rates?: { rate_amount?: number } | { rate_amount?: number }[] | null;
          users?: { username: string } | { username: string }[] | null;
        } | null;
        if (!listing || listing.status !== 'active') return null;

        const rate = unwrap(listing.shipping_rates) as { rate_amount?: number } | null;
        const sellerUser = unwrap(listing.users) as { username: string } | null;

        return {
          listing_id: row.listing_id,
          title: listing.title,
          cover_url: listing.photos?.[0]?.url ?? null,
          price: Number(listing.buy_now_price),
          shipping_cost: Number(rate?.rate_amount ?? 0),
          seller_id: listing.user_id,
          seller_username: sellerUser?.username ?? 'seller',
          added_at: row.added_at,
        };
      })
      .filter((x): x is ServerCartItem => x !== null);
  },

  /**
   * Add a listing to the server cart. ON CONFLICT do nothing (cart is set-
   * semantics — a listing can only be in your cart once, enforced by the
   * UNIQUE constraint).
   *
   * Returns the freshly-joined item shape so the caller can update its UI
   * without a second round-trip.
   */
  async addItem(listingId: string): Promise<ServerCartItem | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to add to cart.');

    // Insert; ignore duplicate-key errors (UNIQUE constraint).
    const { error } = await supabase
      .from('cart_items')
      .upsert({ user_id: user.id, listing_id: listingId }, { onConflict: 'user_id,listing_id', ignoreDuplicates: true });

    if (error) {
      console.error('[cartAPI.addItem] failed', error);
      throw new Error(error.message);
    }

    // Refetch just this one item with all joins so the caller can render it.
    const all = await this.getCart();
    return all.find((i) => i.listing_id === listingId) ?? null;
  },

  async removeItem(listingId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);

    if (error) {
      console.error('[cartAPI.removeItem] failed', error);
      throw new Error(error.message);
    }
  },

  async clear(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('[cartAPI.clear] failed', error);
      throw new Error(error.message);
    }
  },
};
