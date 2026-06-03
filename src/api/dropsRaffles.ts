import { supabase } from './supabase/supabaseClient';

export interface Drop {
  id: string;
  name: string;
  partner: string;
  description: string | null;
  drop_at: string;
  price: number;
  quantity: number;
  remaining: number;
  status: 'upcoming' | 'live' | 'ended';
  image_url: string | null;
  tags: string[];
  created_at: string;
}

export interface Raffle {
  id: string;
  item_title: string;
  item_image_url: string | null;
  estimated_value: number | null;
  ticket_price: number;
  max_spots: number;
  spots_filled: number;
  status: 'upcoming' | 'live' | 'ended';
  ends_at: string;
  livestream_id: string | null;
  winner_user_id: string | null;
  seller_id: string;
  created_at: string;
  seller_username?: string | null;
  seller_avatar?: string | null;
}

// ── Fallback data ─────────────────────────────────────────────────────────────

export const FALLBACK_DROPS: Drop[] = [
  {
    id: 'd1', name: 'Spawn Origins Pack', partner: 'Image Comics × InkStash',
    description: 'First 300 issues distilled into a 6-card blind bag. Legendary pulls include graded #1 slabs.',
    drop_at: new Date(Date.now() + 2 * 3600000 + 34 * 60000).toISOString(),
    price: 29.99, quantity: 500, remaining: 347, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/spawn1/800/420',
    tags: ['Comics', 'Keys', 'Graded'], created_at: '',
  },
  {
    id: 'd2', name: 'Marvel Keys Collab', partner: 'Marvel × InkStash',
    description: 'Exclusive Marvel key issues — first appearances, death issues, and variant covers.',
    drop_at: new Date(Date.now() + 27 * 3600000).toISOString(),
    price: 39.99, quantity: 300, remaining: 300, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/marvel2/800/420',
    tags: ['Comics', 'Keys', 'Marvel'], created_at: '',
  },
  {
    id: 'd3', name: 'DC Rebirth Variants', partner: 'DC × InkStash',
    description: 'Rare variant covers from the DC Rebirth era. Limited to 200 packs.',
    drop_at: new Date(Date.now() + 72 * 3600000).toISOString(),
    price: 24.99, quantity: 200, remaining: 200, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/dc2/800/420',
    tags: ['Comics', 'Variants', 'DC'], created_at: '',
  },
];

export const FALLBACK_RAFFLES: Raffle[] = [
  {
    id: 'r1', item_title: 'ASM #300 CGC 9.8 — 1st Venom',
    item_image_url: 'https://picsum.photos/seed/asm300/480/480',
    estimated_value: 1200, ticket_price: 15, max_spots: 100, spots_filled: 73,
    status: 'live', ends_at: new Date(Date.now() + 45 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'comicvaultpdx', seller_avatar: null, created_at: '',
  },
  {
    id: 'r2', item_title: 'Wolverine #1 CGC 9.4 — 1982 Limited Series',
    item_image_url: 'https://picsum.photos/seed/wolv1/480/480',
    estimated_value: 3800, ticket_price: 25, max_spots: 50, spots_filled: 50,
    status: 'ended', ends_at: new Date(Date.now() - 30 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'slabkingPDX', seller_avatar: null, created_at: '',
  },
  {
    id: 'r3', item_title: 'X-Men #1 FN/VF — 1963 Silver Age',
    item_image_url: 'https://picsum.photos/seed/xmen1/480/480',
    estimated_value: 1800, ticket_price: 50, max_spots: 40, spots_filled: 12,
    status: 'upcoming', ends_at: new Date(Date.now() + 3 * 3600000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'silveragedan', seller_avatar: null, created_at: '',
  },
  {
    id: 'r4', item_title: 'Spawn #1 Raw NM — Todd McFarlane Signed',
    item_image_url: 'https://picsum.photos/seed/spawn300/480/480',
    estimated_value: 450, ticket_price: 10, max_spots: 200, spots_filled: 118,
    status: 'live', ends_at: new Date(Date.now() + 22 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'imagecollect', seller_avatar: null, created_at: '',
  },
];

// ── Queries ───────────────────────────────────────────────────────────────────

// dropsAPI removed — the new drops table has a different schema. Use
// `import { dropsAPI } from '../api/drops'` instead. The old Drop
// interface + FALLBACK_DROPS export below stays unused for now; safe to
// purge once raffles get their own dedicated file.

export const rafflesAPI = {
  async list(): Promise<Raffle[]> {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .in('status', ['upcoming', 'live', 'ended'])
      .order('ends_at', { ascending: true })
      .limit(20);

    if (error || !data || data.length === 0) return FALLBACK_RAFFLES;

    const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))] as string[];
    const usersMap = new Map<string, { username: string; avatar_url: string | null }>();

    if (sellerIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', sellerIds);
      (users || []).forEach((u: any) => usersMap.set(u.id, { username: u.username, avatar_url: u.avatar_url }));
    }

    return data.map((row: any) => {
      const u = usersMap.get(row.seller_id);
      return {
        ...row,
        seller_username: u?.username ?? null,
        seller_avatar: u?.avatar_url ?? null,
      } as Raffle;
    });
  },
};
