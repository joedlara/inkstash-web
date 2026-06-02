// src/api/drops.ts
//
// Drops are scheduled-release sale items that wrap an existing listing or
// pack (or, in v1.1, a standalone). Each drop adds a time gate
// (go_live_at) and a supply gate (quantity_total / quantity_sold) on top
// of the underlying buy flow.
//
// Lifecycle (derived, not stored):
//   upcoming  — now < go_live_at
//   live      — now >= go_live_at && quantity_sold < quantity_total
//   sold_out  — quantity_sold >= quantity_total
//
// State is computed client-side from the raw timestamps + counters so we
// don't need a server-side enum that drifts from reality.

import { supabase } from './supabase/supabaseClient';

export type DropKind = 'listing' | 'pack' | 'standalone';
export type DropState = 'upcoming' | 'live' | 'sold_out';

export interface DropRow {
  id: string;
  kind: DropKind;
  listing_id: string | null;
  pack_id: string | null;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  go_live_at: string;
  hero_image_url: string | null;
  vendor_id: string | null;
  is_featured: boolean;
  created_at: string;
}

export interface Drop extends DropRow {
  /** Derived: which lifecycle state this drop is in right now. */
  state: DropState;
  /** Derived: ms until go_live_at; 0 if already live. Useful for countdown. */
  ms_until_live: number;
  /** Derived: capacity remaining. */
  quantity_remaining: number;
}

export interface DropWithLinked extends Drop {
  /** Optional joined data — only populated by getDrop(id), not getDrops(). */
  linked_listing?: {
    id: string;
    title: string;
    photos: Array<{ url?: string }> | null;
    comic_publisher: string | null;
    comic_writer: string | null;
    comic_artist: string | null;
    comic_issue_number: string | null;
    description: string | null;
    user_id: string;
  } | null;
  linked_pack?: {
    id: string;
    name: string;
    partner: string | null;
    description: string | null;
    cover_image: string | null;
  } | null;
  vendor?: {
    id: string;
    username: string | null;
  } | null;
}

function deriveState(row: DropRow, now: number): { state: DropState; ms_until_live: number; quantity_remaining: number } {
  const liveAt = new Date(row.go_live_at).getTime();
  const ms_until_live = Math.max(0, liveAt - now);
  const quantity_remaining = Math.max(0, row.quantity_total - row.quantity_sold);
  let state: DropState;
  if (ms_until_live > 0) state = 'upcoming';
  else if (quantity_remaining <= 0) state = 'sold_out';
  else state = 'live';
  return { state, ms_until_live, quantity_remaining };
}

function enrich(row: DropRow): Drop {
  return { ...row, ...deriveState(row, Date.now()) };
}

export interface GetDropsOptions {
  /** Filter by lifecycle state. Default: all states. */
  state?: DropState | 'live_or_upcoming';
  limit?: number;
}

export const dropsAPI = {
  /**
   * List drops. Default sort: live first (by go_live_at desc), then
   * upcoming (by go_live_at asc — soonest first), then sold-out.
   * Client-side derivation since state isn't stored.
   */
  async getDrops(opts: GetDropsOptions = {}): Promise<Drop[]> {
    const { data, error } = await supabase
      .from('drops')
      .select('*')
      .order('go_live_at', { ascending: true });

    if (error) {
      console.error('[dropsAPI.getDrops] failed', error);
      return [];
    }

    const all = (data ?? []).map((r) => enrich(r as DropRow));

    // Backfill missing title / hero_image from linked listings so grid tiles
    // never render "Untitled drop" or a blank cover when authors omitted them.
    // Two FKs between drops and the same target prevent a single embed, so we
    // batch one IN query and merge.
    const listingIdsNeedingBackfill = all
      .filter((d) => d.kind === 'listing' && d.listing_id && (!d.title || !d.hero_image_url))
      .map((d) => d.listing_id as string);

    if (listingIdsNeedingBackfill.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, photos')
        .in('id', listingIdsNeedingBackfill);
      const byId = new Map<string, { title: string; photos: Array<{ url?: string }> | null }>();
      (listings ?? []).forEach((l: any) => byId.set(l.id, { title: l.title, photos: l.photos }));
      for (const drop of all) {
        if (drop.listing_id && byId.has(drop.listing_id)) {
          const meta = byId.get(drop.listing_id)!;
          if (!drop.title) drop.title = meta.title;
          if (!drop.hero_image_url) drop.hero_image_url = meta.photos?.[0]?.url ?? null;
        }
      }
    }

    const filtered = opts.state
      ? all.filter((d) =>
          opts.state === 'live_or_upcoming'
            ? d.state !== 'sold_out'
            : d.state === opts.state,
        )
      : all;

    const order = (s: DropState) => (s === 'live' ? 0 : s === 'upcoming' ? 1 : 2);
    filtered.sort((a, b) => {
      const o = order(a.state) - order(b.state);
      if (o !== 0) return o;
      if (a.state === 'live') return new Date(b.go_live_at).getTime() - new Date(a.go_live_at).getTime();
      if (a.state === 'upcoming') return new Date(a.go_live_at).getTime() - new Date(b.go_live_at).getTime();
      return new Date(b.go_live_at).getTime() - new Date(a.go_live_at).getTime();
    });

    return opts.limit ? filtered.slice(0, opts.limit) : filtered;
  },

  /**
   * Fetch one drop with its linked listing/pack joined. Three batched
   * queries — avoids the PostgREST two-FK-between-same-tables headache.
   */
  async getDrop(id: string): Promise<DropWithLinked | null> {
    const { data: dropRow, error } = await supabase
      .from('drops')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[dropsAPI.getDrop] failed', error);
      return null;
    }
    if (!dropRow) return null;

    const enriched: DropWithLinked = enrich(dropRow as DropRow);

    if (enriched.listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, photos, comic_publisher, comic_writer, comic_artist, comic_issue_number, description, user_id')
        .eq('id', enriched.listing_id)
        .maybeSingle();
      enriched.linked_listing = listing as DropWithLinked['linked_listing'];
    }

    if (enriched.pack_id) {
      const { data: pack } = await supabase
        .from('packs')
        .select('id, name, partner, description, cover_image')
        .eq('id', enriched.pack_id)
        .maybeSingle();
      enriched.linked_pack = pack as DropWithLinked['linked_pack'];
    }

    if (enriched.vendor_id) {
      const { data: vendor } = await supabase
        .from('users')
        .select('id, username')
        .eq('id', enriched.vendor_id)
        .maybeSingle();
      enriched.vendor = vendor as DropWithLinked['vendor'];
    }

    return enriched;
  },

  /**
   * Trigger drop purchase. Edge function (Task 7) reserves capacity via
   * reserve_drop_capacity() then creates the appropriate Stripe
   * PaymentIntent for the drop's underlying kind.
   *
   * Structured errors:
   *   not_yet_live — go_live_at is in the future
   *   sold_out     — capacity exhausted
   *   drop_not_found
   */
  async createPaymentIntent(dropId: string, qty: number = 1): Promise<{ client_secret: string; drop_id: string; qty: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in to buy a drop.');

    const { data, error } = await supabase.functions.invoke('create-drop-payment-intent', {
      body: { drop_id: dropId, qty },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw new Error(error.message);
    if (data?.error) {
      const e = new Error(data.error);
      e.name = data.error;
      throw e;
    }
    if (!data?.client_secret) throw new Error('No client_secret returned');
    return data;
  },
};
