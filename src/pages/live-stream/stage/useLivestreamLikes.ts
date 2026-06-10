// useLivestreamLikes — TikTok-style tap counter wired to the real
// `livestreams.like_count` column via the `tap_livestream_like` RPC.
//
// The UI fires taps fast (one per gesture); to avoid hammering the RPC,
// we batch a short window of taps locally and flush them in one call.
// The returned count is the optimistic local total; the realtime channel
// reconciles when the server-side total broadcast arrives.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../api/supabase/supabaseClient';

const FLUSH_DEBOUNCE_MS = 250;   // flush 250ms after the most-recent tap
const FLUSH_MAX_TAPS = 50;       // hard ceiling matches the RPC's guard

export function useLivestreamLikes(livestreamId: string) {
  const [count, setCount] = useState<number>(0);
  const pendingRef = useRef<number>(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial hydration: read the current like_count off the row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('livestreams')
        .select('like_count')
        .eq('id', livestreamId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { like_count: number } | null;
      if (row) setCount(Number(row.like_count) || 0);
    })();
    return () => { cancelled = true; };
  }, [livestreamId]);

  // Realtime: subscribe to UPDATE on the livestreams row so other viewers'
  // taps tick up our count too.
  useEffect(() => {
    const ch = supabase
      .channel(`livestream_likes:${livestreamId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'livestreams',
        filter: `id=eq.${livestreamId}`,
      }, (payload) => {
        const next = (payload.new as { like_count?: number } | undefined)?.like_count;
        if (typeof next === 'number') setCount((prev) => Math.max(prev, next));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [livestreamId]);

  const flush = useCallback(async () => {
    const batched = Math.min(pendingRef.current, FLUSH_MAX_TAPS);
    if (batched <= 0) return;
    pendingRef.current = 0;
    try {
      const { data, error } = await supabase.rpc('tap_livestream_like', {
        p_livestream_id: livestreamId,
        p_taps: batched,
      });
      if (error) throw error;
      if (typeof data === 'number') setCount((prev) => Math.max(prev, data));
    } catch (e) {
      console.warn('[useLivestreamLikes] flush failed', e);
      // Don't roll back the optimistic local count — UX is fine being slightly
      // ahead of the server when offline / errored.
    }
  }, [livestreamId]);

  const tap = useCallback(() => {
    pendingRef.current += 1;
    setCount((prev) => prev + 1);  // optimistic
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      flush().catch(console.error);
    }, FLUSH_DEBOUNCE_MS);
    // Hard ceiling: if a user spams way past the batch limit, flush sooner.
    if (pendingRef.current >= FLUSH_MAX_TAPS) {
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flush().catch(console.error);
    }
  }, [flush]);

  return { count, tap };
}
