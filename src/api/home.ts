import { supabase } from './supabase/supabaseClient';

// Home-page card shape for live streams. Mirrors livestreams L1 schema with
// host_user_id renamed to keep the rest of the home page semantics intact.
// `scheduled_start_time` stays nullable for future L3 (scheduled streams) but
// is always null in L1.
export interface LiveStream {
  id: string;
  title: string;
  cover_image_url: string | null;
  status: string;
  host_user_id: string;
  host_username: string | null;
  host_avatar: string | null;
  scheduled_start_time: string | null;
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

// ── Fallback data shown when DB has no relevant rows ─────────────────────────

const FALLBACK_STREAMS: LiveStream[] = [
  { id: 'f1', title: 'Sunday Silver Age Comics Auction',         cover_image_url: null, status: 'live', host_user_id: '', host_username: 'silveragedan',   host_avatar: null, scheduled_start_time: null },
  { id: 'f2', title: 'Golden Age Keys Break — JSA & CGC Slabs',  cover_image_url: null, status: 'live', host_user_id: '', host_username: 'comicvaultpdx', host_avatar: null, scheduled_start_time: null },
];

const FALLBACK_TRENDING: TrendingAuction[] = [
  { id: 't1', title: 'Wolverine #1 CGC 9.8 — 1982 Limited Series', current_bid: 4800,  starting_bid: 500,  image_url: null, end_time: new Date(Date.now() + 2 * 3600000).toISOString(),  status: 'active', bid_count: 11, category: 'Graded Slabs',          seller_username: 'slabking' },
  { id: 't2', title: 'ASM #300 CGC 9.6 — 1st Venom (White Pages)', current_bid: 2100,  starting_bid: 200,  image_url: null, end_time: new Date(Date.now() + 5 * 3600000).toISOString(),  status: 'active', bid_count: 9,  category: 'Keys & First Appearances', seller_username: 'keymaster88' },
  { id: 't3', title: 'X-Men #1 FN/VF — 1963 Silver Age (Stan Lee)', current_bid: 1350,  starting_bid: 800,  image_url: null, end_time: new Date(Date.now() + 18 * 3600000).toISOString(), status: 'active', bid_count: 6,  category: 'Golden Age / Silver Age',  seller_username: 'silveragedan' },
  { id: 't4', title: 'Spawn #1 Raw NM — Todd McFarlane Signed',     current_bid: 340,   starting_bid: 100,  image_url: null, end_time: new Date(Date.now() + 8 * 3600000).toISOString(),  status: 'active', bid_count: 14, category: 'Limited Edition / Signed', seller_username: 'imagecollect' },
  { id: 't5', title: 'Batman #1 Facsimile — 2019 Foil Variant',     current_bid: 89,    starting_bid: 25,   image_url: null, end_time: new Date(Date.now() + 24 * 3600000).toISOString(), status: 'active', bid_count: 7,  category: 'Variant Covers',           seller_username: 'dcvaultco' },
];

const FALLBACK_FEATURED: FeaturedAuction[] = [
  { id: 'fa1', title: 'Wolverine #1 CGC 9.8 — 1982 Limited Series',         description: null, current_bid: 4800,  buy_now_price: 6500, image_url: null, end_time: new Date(Date.now() + 2 * 3600000).toISOString(),  status: 'active', bid_count: 11, is_featured: true,  category: 'Graded Slabs',          condition: 'CGC 9.8', seller_username: 'slabking',     seller_avatar: null },
  { id: 'fa2', title: 'ASM #300 CGC 9.6 — 1st Venom',                       description: null, current_bid: 2100,  buy_now_price: null, image_url: null, end_time: new Date(Date.now() + 5 * 3600000).toISOString(),  status: 'active', bid_count: 9,  is_featured: true,  category: 'Keys & First Appearances', condition: 'CGC 9.6', seller_username: 'keymaster88', seller_avatar: null },
  { id: 'fa3', title: 'X-Men #1 FN/VF — 1963 Silver Age',                   description: null, current_bid: 1350,  buy_now_price: null, image_url: null, end_time: new Date(Date.now() + 18 * 3600000).toISOString(), status: 'active', bid_count: 6,  is_featured: false, category: 'Golden Age / Silver Age',  condition: 'FN/VF',   seller_username: 'silveragedan', seller_avatar: null },
  { id: 'fa4', title: 'Batman #1 Facsimile — 2019 Foil Variant',            description: null, current_bid: 89,    buy_now_price: 120,  image_url: null, end_time: new Date(Date.now() + 24 * 3600000).toISOString(), status: 'active', bid_count: 7,  is_featured: false, category: 'Variant Covers',           condition: 'NM',      seller_username: 'dcvaultco',   seller_avatar: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchUsernamesBatch(userIds: string[]): Promise<Map<string, { username: string; avatar_url: string | null }>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .in('id', userIds);
  const map = new Map<string, { username: string; avatar_url: string | null }>();
  (data || []).forEach((u: any) => map.set(u.id, { username: u.username, avatar_url: u.avatar_url }));
  return map;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getLiveAndUpcomingStreams(): Promise<LiveStream[]> {
  // L1 schema: livestreams.status='live' only. Scheduled streams ship later
  // (L3) with a separate scheduled_at column; for now there's no upcoming.
  const { data, error } = await supabase
    .from('livestreams')
    .select('id, title, cover_image_url, status, host_user_id')
    .eq('status', 'live')
    .order('started_at', { ascending: false })
    .limit(6);

  if (error || !data || data.length === 0) return FALLBACK_STREAMS;

  const hostIds = [...new Set(data.map((r: { host_user_id: string }) => r.host_user_id).filter(Boolean))];
  const usersMap = await fetchUsernamesBatch(hostIds);

  return data.map((row: { id: string; title: string; cover_image_url: string | null; status: string; host_user_id: string }) => {
    const u = usersMap.get(row.host_user_id);
    return {
      id: row.id,
      title: row.title,
      cover_image_url: row.cover_image_url,
      status: row.status,
      host_user_id: row.host_user_id,
      host_username: u?.username ?? null,
      host_avatar: u?.avatar_url ?? null,
      scheduled_start_time: null,
    };
  });
}

export async function getTrendingAuctions(): Promise<TrendingAuction[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('auctions')
    .select('id, title, current_bid, starting_bid, image_url, end_time, status, bid_count, category, seller_id')
    .in('status', ['active', 'live'])
    .gte('created_at', since)
    .order('bid_count', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) return FALLBACK_TRENDING;

  const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))];
  const usersMap = await fetchUsernamesBatch(sellerIds);

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    current_bid: Number(row.current_bid ?? row.starting_bid ?? 0),
    starting_bid: Number(row.starting_bid ?? 0),
    image_url: row.image_url,
    end_time: row.end_time,
    status: row.status,
    bid_count: row.bid_count ?? 0,
    category: row.category,
    seller_username: usersMap.get(row.seller_id)?.username ?? null,
  }));
}

export async function getFeaturedAuctions(): Promise<FeaturedAuction[]> {
  const { data, error } = await supabase
    .from('auctions')
    .select('id, title, description, current_bid, buy_now_price, image_url, end_time, status, bid_count, is_featured, category, condition, seller_id')
    .in('status', ['active', 'live', 'upcoming'])
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(4);

  if (error || !data || data.length === 0) return FALLBACK_FEATURED;

  const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))];
  const usersMap = await fetchUsernamesBatch(sellerIds);

  return data.map((row: any) => {
    const u = usersMap.get(row.seller_id);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      current_bid: Number(row.current_bid ?? row.buy_now_price ?? 0),
      buy_now_price: row.buy_now_price ? Number(row.buy_now_price) : null,
      image_url: row.image_url,
      end_time: row.end_time,
      status: row.status,
      bid_count: row.bid_count ?? 0,
      is_featured: row.is_featured ?? false,
      category: row.category,
      condition: row.condition,
      seller_username: u?.username ?? null,
      seller_avatar: u?.avatar_url ?? null,
    };
  });
}
