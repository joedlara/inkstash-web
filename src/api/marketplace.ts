// src/api/marketplace.ts
import { supabase } from './supabase/supabaseClient';

export type MarketplaceFeedSource = 'all' | 'listing' | 'auction';
export type MarketplaceFeedSort = 'recent' | 'price_asc' | 'price_desc' | 'ending_soon';

export interface MarketplaceFeedFilters {
  publisher?: string;
  query?: string;
  source?: MarketplaceFeedSource;
}

export interface MarketplaceFeedCard {
  id: string;
  source: 'listing' | 'auction';
  title: string;
  cover_url: string | null;
  price: number;
  display_price_label: string;
  seller_id: string;
  comic_publisher: string | null;
  comic_writer: string | null;
  comic_artist: string | null;
  comic_issue_number: string | null;
  is_vault_item: boolean;
  ends_at: string | null;
  created_at: string;
  total_count: number;
}

export interface MarketplaceFeedResult {
  rows: MarketplaceFeedCard[];
  totalCount: number;
}

export const marketplaceAPI = {
  async listFeed(opts: {
    filters?: MarketplaceFeedFilters;
    sort?: MarketplaceFeedSort;
    page?: number;
    pageSize?: number;
  }): Promise<MarketplaceFeedResult> {
    const { data, error } = await supabase.rpc('query_marketplace_feed', {
      p_filters: opts.filters ?? {},
      p_sort: opts.sort ?? 'recent',
      p_page: opts.page ?? 1,
      p_page_size: opts.pageSize ?? 24,
    });

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as MarketplaceFeedCard[];
    const totalCount = rows.length > 0 ? rows[0].total_count : 0;
    return { rows, totalCount };
  },

  /** Top-N publishers by active-listing count. Used by PublisherFilterPills. */
  async listPublishers(limit: number = 6): Promise<Array<{ publisher: string; count: number }>> {
    // PostgREST doesn't natively expose GROUP BY; use a tiny helper RPC OR
    // do it client-side after fetching the feed once. For v1 simplicity we
    // do it client-side: pull the first 200 active listings, dedupe by
    // publisher. Replace with a dedicated RPC if performance demands it.
    const { data, error } = await supabase
      .from('listings')
      .select('comic_publisher')
      .eq('status', 'active')
      .eq('is_buy_now', true)
      .not('comic_publisher', 'is', null)
      .limit(200);

    if (error || !data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const p = row.comic_publisher;
      if (!p) continue;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([publisher, count]) => ({ publisher, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
