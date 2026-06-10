// useLivestreamItemsChannel — shared realtime subscription to
// livestream_items for a single stream. Ref-counts handlers so multiple
// consumers (Phase 3a ShopRail + Phase 3b useLiveAuction) share one socket;
// the channel only tears down when the last handler unmounts.
//
// Also exports getLastHeartbeat(streamId) so consumers can implement a
// polling fallback when the websocket goes stale.

import { useEffect, useRef } from 'react';
import { supabase } from '../../../api/supabase/supabaseClient';
import type { LivestreamItemRow } from '../../../api/livestreams';

type Payload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Partial<LivestreamItemRow>;
  old: Partial<LivestreamItemRow>;
};
type Handler = (p: Payload) => void;

const handlersByStream = new Map<string, Set<Handler>>();
const channelsByStream = new Map<string, ReturnType<typeof supabase.channel>>();
const lastBeatByStream = new Map<string, number>();

export function getLastHeartbeat(livestreamId: string): number {
  return lastBeatByStream.get(livestreamId) ?? 0;
}

export function useLivestreamItemsChannel(livestreamId: string, onChange: Handler) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let set = handlersByStream.get(livestreamId);
    if (!set) {
      set = new Set();
      handlersByStream.set(livestreamId, set);
    }
    const stable: Handler = (p) => cbRef.current(p);
    set.add(stable);

    if (!channelsByStream.has(livestreamId)) {
      const ch = supabase
        .channel(`livestream_items:${livestreamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'livestream_items',
            filter: `livestream_id=eq.${livestreamId}`,
          },
          (payload: unknown) => {
            lastBeatByStream.set(livestreamId, Date.now());
            for (const h of handlersByStream.get(livestreamId) ?? []) {
              h(payload as Payload);
            }
          },
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') lastBeatByStream.set(livestreamId, Date.now());
        });
      channelsByStream.set(livestreamId, ch);
    }

    return () => {
      const s = handlersByStream.get(livestreamId);
      s?.delete(stable);
      if (s && s.size === 0) {
        const ch = channelsByStream.get(livestreamId);
        if (ch) supabase.removeChannel(ch);
        channelsByStream.delete(livestreamId);
        handlersByStream.delete(livestreamId);
        lastBeatByStream.delete(livestreamId);
      }
    };
  }, [livestreamId]);
}
