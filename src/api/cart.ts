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

    // Two-step fetch: cart_items + listings + users in one go, then a
    // separate batched fetch for shipping_rates. There are two FKs between
    // listings and shipping_rates (rates.listing_id and listings.selected_-
    // shipping_rate_id), so a single embed errors with PGRST201. The
    // separate fetch is also cheap — at most N rate rows per cart.
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
          selected_shipping_rate_id
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[cartAPI.getCart] failed', error);
      return [];
    }

    const rows = (data ?? []) as unknown as ServerCartRow[];

    // Collect rate ids to fetch in one batched query.
    const rateIds = rows
      .map((r) => unwrap(r.listings))
      .map((l) => (l as { selected_shipping_rate_id?: string } | null)?.selected_shipping_rate_id)
      .filter((id): id is string => !!id);

    let ratesById = new Map<string, number>();
    if (rateIds.length > 0) {
      const { data: rateRows } = await supabase
        .from('shipping_rates')
        .select('id, shipping_amount')
        .in('id', rateIds);
      if (rateRows) {
        ratesById = new Map(rateRows.map((r) => [r.id as string, Number((r as { shipping_amount: number }).shipping_amount)]));
      }
    }

    // Seller usernames: same PostgREST disambiguation issue as shipping_rates,
    // so we fetch them in a separate batch keyed by user_id.
    const sellerIds = Array.from(new Set(
      rows.map((r) => unwrap(r.listings))
        .map((l) => (l as { user_id?: string } | null)?.user_id)
        .filter((id): id is string => !!id)
    ));

    let usernamesById = new Map<string, string>();
    if (sellerIds.length > 0) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, username')
        .in('id', sellerIds);
      if (userRows) {
        usernamesById = new Map(userRows.map((u) => [u.id as string, (u as { username: string }).username ?? 'seller']));
      }
    }

    return rows
      .map((row): ServerCartItem | null => {
        const listing = unwrap(row.listings) as {
          id: string;
          title: string;
          photos: Array<{ url?: string }> | null;
          buy_now_price: number;
          status: string;
          user_id: string;
          selected_shipping_rate_id: string | null;
        } | null;
        if (!listing || listing.status !== 'active') return null;

        const shippingCost = listing.selected_shipping_rate_id
          ? (ratesById.get(listing.selected_shipping_rate_id) ?? 0)
          : 0;

        return {
          listing_id: row.listing_id,
          title: listing.title,
          cover_url: listing.photos?.[0]?.url ?? null,
          price: Number(listing.buy_now_price),
          shipping_cost: shippingCost,
          seller_id: listing.user_id,
          seller_username: usernamesById.get(listing.user_id) ?? 'seller',
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

  /**
   * Server-validates the cart and creates ONE Stripe PaymentIntent on the
   * InkStash platform covering the whole cart. The webhook (Cart-Task7)
   * fans the charge out into per-seller Transfers after it clears.
   *
   * Rejects on stale items, missing shipping address, or any seller not
   * being Connect-active — the modal in Cart-Task6 handles each branch.
   */
  async createPaymentIntent(): Promise<{
    client_secret: string;
    order_group_id: string;
    total_amount: number;
  }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to check out.');

    const { data, error } = await supabase.functions.invoke('create-cart-payment-intent', {
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(error.message);
    if (data?.error) {
      // Wrap structured errors with a typed Error so the modal can branch on .name.
      const e = new Error(data.error);
      e.name = data.error;
      (e as Error & { details?: unknown }).details = data;
      throw e;
    }
    if (!data?.client_secret) throw new Error('No client_secret returned');
    return data;
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
