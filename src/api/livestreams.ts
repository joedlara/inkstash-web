// src/api/livestreams.ts
//
// Frontend client for Livestreams L1 surfaces. Wraps the five edge functions
// plus a list query for /live. LiveKit Room setup happens in the React
// components (LiveStreamVideo) since it needs lifecycle management.

import { supabase } from './supabase/supabaseClient';

export type LivestreamStatus = 'preparing' | 'live' | 'ended' | 'aborted';

export interface Livestream {
  id: string;
  host_user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: LivestreamStatus;
  started_at: string | null;
  ended_at: string | null;
  scheduled_start_at: string | null;
  viewer_peak: number;
  total_unique_viewers: number;
  created_at: string;
  // Joined
  host?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  is_mod_action: boolean;
  created_at: string;
}

interface StartResponse {
  livestream_id: string;
  livekit_room_name: string;
  livekit_token: string;
  livekit_ws_url: string;
}

interface JoinResponse {
  livekit_token: string;
  livekit_ws_url: string;
  livekit_room_name: string;
  recent_chat: ChatMessage[];
  is_banned: boolean;
}

async function callFn<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not logged in.');
  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message);
  if (data?.error) {
    const e = new Error(data.error);
    e.name = data.error;
    throw e;
  }
  return data as T;
}

/** Three buckets the /live page renders as horizontal scroll rows.
 *  Featured = future hook for editorial picks; for now we surface the
 *  highest viewer-count live streams as a stand-in so the row isn't empty
 *  in early days. */
export interface LivestreamSections {
  live: Livestream[];
  upcoming: Livestream[];
  featured: Livestream[];
}

async function hydrateHosts(rows: Livestream[]): Promise<Livestream[]> {
  const hostIds = [...new Set(rows.map((r) => r.host_user_id))];
  if (hostIds.length === 0) return rows;
  const { data: hosts } = await supabase
    .from('users')
    .select('id, username, avatar_url')
    .in('id', hostIds);
  const byId = new Map<string, { username: string | null; avatar_url: string | null }>();
  (hosts ?? []).forEach((u: { id: string; username: string | null; avatar_url: string | null }) =>
    byId.set(u.id, { username: u.username, avatar_url: u.avatar_url }),
  );
  for (const r of rows) {
    r.host = byId.get(r.host_user_id) ?? null;
  }
  return rows;
}

export const livestreamsAPI = {
  async listLive(): Promise<Livestream[]> {
    const { data, error } = await supabase
      .from('livestreams')
      .select('*')
      .eq('status', 'live')
      .order('started_at', { ascending: false });
    if (error) {
      console.error('[livestreamsAPI.listLive] failed', error);
      return [];
    }
    return hydrateHosts((data ?? []) as Livestream[]);
  },

  /** One round trip per section, then batch-hydrate hosts across all rows.
   *  Cheaper than 3 separate hydrations and keeps the page-load query
   *  count predictable. */
  async listSections(): Promise<LivestreamSections> {
    const [liveRes, upcomingRes, featuredRes] = await Promise.all([
      supabase
        .from('livestreams')
        .select('*')
        .eq('status', 'live')
        .order('viewer_peak', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(12),
      supabase
        .from('livestreams')
        .select('*')
        .eq('status', 'preparing')
        .not('scheduled_start_at', 'is', null)
        .gt('scheduled_start_at', new Date().toISOString())
        .order('scheduled_start_at', { ascending: true })
        .limit(12),
      // Featured streams — for now, highest total_unique_viewers across
      // ended + live, then deduped against Live and grouped by host so the
      // row shows a variety of streamers instead of one user's catalog.
      // Editor-picked featured flag ships later.
      supabase
        .from('livestreams')
        .select('*')
        .in('status', ['ended', 'live'])
        .order('total_unique_viewers', { ascending: false })
        .limit(40),
    ]);

    const live = (liveRes.data ?? []) as Livestream[];
    const upcoming = (upcomingRes.data ?? []) as Livestream[];
    const featuredAll = (featuredRes.data ?? []) as Livestream[];

    // Exclude rows already in Live + cap to one stream per host so the
    // featured row reads as a curated lineup of different streamers,
    // not one user's catalog.
    const liveIds = new Set(live.map((s) => s.id));
    const seenHosts = new Set<string>();
    const featured: Livestream[] = [];
    for (const s of featuredAll) {
      if (liveIds.has(s.id)) continue;
      if (seenHosts.has(s.host_user_id)) continue;
      seenHosts.add(s.host_user_id);
      featured.push(s);
      if (featured.length >= 12) break;
    }

    // Single batched host hydration across all three buckets.
    const all = [...live, ...upcoming, ...featured];
    await hydrateHosts(all);
    return { live, upcoming, featured };
  },

  async get(id: string): Promise<Livestream | null> {
    const { data } = await supabase
      .from('livestreams')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const row = data as Livestream;
    const { data: host } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', row.host_user_id)
      .maybeSingle();
    row.host = host as Livestream['host'];
    return row;
  },

  start: (body: {
    title: string;
    description?: string;
    cover_image_url?: string;
    scheduled_start_at?: string | null;
    queue?: string[];
  }) => callFn<StartResponse>('start-livestream', body),

  join: (livestream_id: string) =>
    callFn<JoinResponse>('join-livestream', { livestream_id }),

  end: (livestream_id: string) =>
    callFn<{ status: string }>('end-livestream', { livestream_id }),

  postChat: (livestream_id: string, body: string) =>
    callFn<{ id: string; created_at: string }>('post-chat-message', { livestream_id, body }),

  banChatter: (livestream_id: string, user_id: string, reason?: string) =>
    callFn<{ status: string }>('ban-chatter', { livestream_id, user_id, reason }),
};
