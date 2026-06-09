// src/components/livestreams/useWinnerUsername.ts
//
// Resolves a livestream_items.current_winner_id (uuid) into the
// winner's username + avatar_url so the auction status line + winner
// banner can render "@joe is winning!" instead of a uuid stub.
//
// Used by CurrentItemBar (desktop) and MobileAuctionCard (mobile)
// without duplicating the SELECT in both files. Caches lookups in a
// module-scope Map keyed by user_id so the same winner doesn't get
// re-fetched once per render.

import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';

export interface WinnerProfile {
  username: string;
  avatarUrl: string | null;
}

// Cache survives navigation; eviction isn't an issue since the only
// keys we look up are winners actually surfaced in the UI.
const cache = new Map<string, WinnerProfile>();
const inflight = new Map<string, Promise<WinnerProfile | null>>();

async function fetchProfile(userId: string): Promise<WinnerProfile | null> {
  if (cache.has(userId)) return cache.get(userId)!;
  if (inflight.has(userId)) return inflight.get(userId)!;
  const p = (async () => {
    const { data } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return null;
    const profile: WinnerProfile = {
      username: (data as { username: string | null }).username ?? 'someone',
      avatarUrl: (data as { avatar_url: string | null }).avatar_url ?? null,
    };
    cache.set(userId, profile);
    inflight.delete(userId);
    return profile;
  })();
  inflight.set(userId, p);
  return p;
}

export function useWinnerUsername(winnerId: string | null): WinnerProfile | null {
  const [profile, setProfile] = useState<WinnerProfile | null>(
    winnerId ? cache.get(winnerId) ?? null : null,
  );

  useEffect(() => {
    if (!winnerId) { setProfile(null); return; }
    if (cache.has(winnerId)) { setProfile(cache.get(winnerId)!); return; }
    let cancelled = false;
    fetchProfile(winnerId).then((p) => {
      if (!cancelled) setProfile(p);
    });
    return () => { cancelled = true; };
  }, [winnerId]);

  return profile;
}
