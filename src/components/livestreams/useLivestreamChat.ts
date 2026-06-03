// src/components/livestreams/useLivestreamChat.ts
//
// Shared livestream chat state hook. Used by both the mobile overlay chat
// (dark pill bubbles on the video) and the desktop rail chat (light list
// inside the chat panel). Owns:
//   - Local messages array, seeded from initialMessages and grown by
//     Supabase Realtime INSERT events
//   - Profile lookups (username + avatar) for each author, batched
//   - Send handler that pipes through livestreamsAPI.postChat

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI, type ChatMessage } from '../../api/livestreams';

export interface ChatProfile {
  username: string;
  avatar_url: string | null;
}

export function useLivestreamChat(livestreamId: string, initialMessages: ChatMessage[]) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [sending, setSending] = useState(false);

  // Realtime INSERT subscription
  useEffect(() => {
    const channel = supabase
      .channel(`livestream_chat:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'livestream_chat', filter: `livestream_id=eq.${livestreamId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [livestreamId]);

  // Batched profile fetch for any author we haven't seen yet
  useEffect(() => {
    const unknown = [...new Set(messages.map((m) => m.user_id))].filter((id) => !profiles[id]);
    if (unknown.length === 0) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', unknown)
      .then(({ data }) => {
        if (cancelled) return;
        const next: Record<string, ChatProfile> = {};
        (data ?? []).forEach((u: { id: string; username: string | null; avatar_url: string | null }) => {
          next[u.id] = { username: u.username ?? 'anon', avatar_url: u.avatar_url };
        });
        setProfiles((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [messages, profiles]);

  const send = useCallback(
    async (body: string): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const trimmed = body.trim();
      if (!trimmed || sending) return { ok: false, reason: 'empty_or_sending' };
      setSending(true);
      try {
        await livestreamsAPI.postChat(livestreamId, trimmed);
        return { ok: true };
      } catch (err) {
        return { ok: false, reason: (err as Error).name || 'unknown' };
      } finally {
        setSending(false);
      }
    },
    [livestreamId, sending],
  );

  return { messages, profiles, sending, send };
}
