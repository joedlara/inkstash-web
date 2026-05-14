import { supabase } from './supabase/supabaseClient';

export interface LiveStream {
  id: string;
  title: string;
  thumbnail_url: string | null;
  current_viewers: number;
  is_live: boolean;
  status: string;
  seller_id: string;
  seller_username: string | null;
  seller_avatar: string | null;
  scheduled_start_time: string | null;
  actual_start_time: string | null;
}

export interface TrendingAuction {
  id: string;
  title: string;
  current_bid: number;
  starting_bid: number;
  image_url: string | null;
  end_time: string;
  status: string;
  bid_count: number;
  category: string;
  seller_username: string | null;
}

export interface FeaturedAuction {
  id: string;
  title: string;
  description: string | null;
  current_bid: number;
  buy_now_price: number | null;
  image_url: string | null;
  end_time: string;
  status: string;
  bid_count: number;
  is_featured: boolean;
  category: string;
  condition: string;
  seller_username: string | null;
  seller_avatar: string | null;
}

/** Live and upcoming streams with seller info */
export async function getLiveAndUpcomingStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from('livestreams')
    .select(`
      id,
      title,
      thumbnail_url,
      current_viewers,
      is_live,
      status,
      seller_id,
      scheduled_start_time,
      actual_start_time,
      users!livestreams_seller_id_fkey (
        username,
        avatar_url
      )
    `)
    .in('status', ['live', 'scheduled'])
    .order('is_live', { ascending: false })
    .order('current_viewers', { ascending: false })
    .limit(6);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    current_viewers: row.current_viewers ?? 0,
    is_live: row.is_live ?? false,
    status: row.status,
    seller_id: row.seller_id,
    seller_username: row.users?.username ?? null,
    seller_avatar: row.users?.avatar_url ?? null,
    scheduled_start_time: row.scheduled_start_time,
    actual_start_time: row.actual_start_time,
  }));
}

/** Trending = most-bid auctions in last 7 days, active status */
export async function getTrendingAuctions(): Promise<TrendingAuction[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('auctions')
    .select(`
      id,
      title,
      current_bid,
      starting_bid,
      image_url,
      end_time,
      status,
      bid_count,
      category,
      users!auctions_seller_id_fkey (
        username
      )
    `)
    .in('status', ['active', 'live'])
    .gte('created_at', since)
    .gt('bid_count', 0)
    .order('bid_count', { ascending: false })
    .limit(5);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    current_bid: row.current_bid ?? row.starting_bid,
    starting_bid: row.starting_bid,
    image_url: row.image_url,
    end_time: row.end_time,
    status: row.status,
    bid_count: row.bid_count ?? 0,
    category: row.category,
    seller_username: row.users?.username ?? null,
  }));
}

/** Featured / newest active auctions for the "Open Now" section */
export async function getFeaturedAuctions(): Promise<FeaturedAuction[]> {
  const { data, error } = await supabase
    .from('auctions')
    .select(`
      id,
      title,
      description,
      current_bid,
      buy_now_price,
      image_url,
      end_time,
      status,
      bid_count,
      is_featured,
      category,
      condition,
      users!auctions_seller_id_fkey (
        username,
        avatar_url
      )
    `)
    .in('status', ['active', 'live', 'upcoming'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(4);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    current_bid: row.current_bid ?? row.starting_bid,
    buy_now_price: row.buy_now_price,
    image_url: row.image_url,
    end_time: row.end_time,
    status: row.status,
    bid_count: row.bid_count ?? 0,
    is_featured: row.is_featured ?? false,
    category: row.category,
    condition: row.condition,
    seller_username: row.users?.username ?? null,
    seller_avatar: row.users?.avatar_url ?? null,
  }));
}
