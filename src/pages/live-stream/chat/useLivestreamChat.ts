// useLivestreamChat — Phase 3c real-backend chat hook. Reads recent rows from
// `livestream_chat` (with the author's username), subscribes to INSERTs via
// Realtime filtered by livestream_id, and posts new messages through the
// `post-chat-message` edge function (which validates mentions and bans).
//
// Wire shape: every chat row carries `mentioned_user_ids` (UUID[]) populated
// by the composer's client-side parse of `@name` tokens against the
// participants map. The receiver (MessageRow) walks the body for `@name`
// tokens and renders a pill only when the resolved user_id is in this array.
//
// Participants Map is keyed by user_id and derived from message authors so
// the mention autocomplete and pill renderer share a single source of truth.
// The host id is not pre-seeded here — the host won't appear until they
// speak. (Future change: optional `seedHostId` arg.)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../api/supabase/supabaseClient';
import { usernameColor } from './usernameColor';

export type ChatMessage = {
  id: string;
  user_id: string;
  username: string;
  body: string;
  ts: number;
  mentioned_user_ids: string[];
  /** Legacy prototype field: question highlight. Carried through for visual parity. */
  q?: boolean;
};

export type Participant = { username: string; color: string };

export type UseLivestreamChat = {
  messages: ChatMessage[];
  /** Keyed by user_id. */
  participants: Map<string, Participant>;
  sendMessage: (body: string, mentionedUserIds: string[]) => Promise<void>;
};

/** PostgREST embeds can type as object OR array depending on the FK shape
 *  (this is the same quirk Phase 2b-fix worked around). Normalize to the
 *  single embedded row or null. */
function pickOne<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

type ChatRowFromDb = {
  id: string;
  user_id: string;
  body: string;
  mentioned_user_ids: string[] | null;
  created_at: string;
  user: { username: string | null } | { username: string | null }[] | null;
};

export function useLivestreamChat(livestreamId: string): UseLivestreamChat {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // user_id → username cache, populated from the initial fetch and reused
  // by the realtime INSERT handler so chatty users don't trigger a `users`
  // lookup per message.
  const usernameCacheRef = useRef<Map<string, string>>(new Map());

  // Initial fetch + realtime subscription. Re-runs when livestreamId changes
  // (which doesn't normally happen — but switching streams in a SPA should
  // not leak the previous channel).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('livestream_chat')
        .select('id, user_id, body, mentioned_user_ids, created_at, user:users!user_id(username)')
        .eq('livestream_id', livestreamId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (cancelled) return;
      if (error) {
        console.warn('[useLivestreamChat] initial fetch failed', error);
        return;
      }

      const rows = (data ?? []) as ChatRowFromDb[];
      const seeded: ChatMessage[] = rows.map((r) => {
        const userRow = pickOne<{ username: string | null }>(r.user);
        const username = userRow?.username ?? 'anon';
        usernameCacheRef.current.set(r.user_id, username);
        return {
          id: r.id,
          user_id: r.user_id,
          username,
          body: r.body,
          ts: Date.parse(r.created_at),
          mentioned_user_ids: r.mentioned_user_ids ?? [],
        };
      });
      setMessages(seeded);
    })();

    const channel = supabase
      .channel(`livestream_chat:${livestreamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'livestream_chat',
          filter: `livestream_id=eq.${livestreamId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            user_id: string;
            body: string;
            mentioned_user_ids: string[] | null;
            created_at: string;
          };

          // Hydrate username from cache first; only hit `users` for unseen ids.
          let username = usernameCacheRef.current.get(row.user_id);
          if (!username) {
            const { data: u } = await supabase
              .from('users')
              .select('username')
              .eq('id', row.user_id)
              .maybeSingle();
            if (cancelled) return;
            username = ((u as { username: string | null } | null)?.username) ?? 'anon';
            usernameCacheRef.current.set(row.user_id, username);
          }

          const msg: ChatMessage = {
            id: row.id,
            user_id: row.user_id,
            username,
            body: row.body,
            ts: Date.parse(row.created_at),
            mentioned_user_ids: row.mentioned_user_ids ?? [],
          };

          setMessages((prev) => {
            // Dedupe: Realtime can echo a message that the sender already
            // sees via optimistic insert in a future iteration. For now we
            // rely on the edge fn being the only writer, so duplicates only
            // happen if the same id arrives twice (defensive guard).
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [livestreamId]);

  // Participants = every distinct author seen in `messages`. Keyed by user_id.
  // The host won't appear until they speak — deferred per Step 3 #3.
  const participants = useMemo<Map<string, Participant>>(() => {
    const m = new Map<string, Participant>();
    for (const msg of messages) {
      if (!m.has(msg.user_id)) {
        m.set(msg.user_id, { username: msg.username, color: usernameColor(msg.username) });
      }
    }
    return m;
  }, [messages]);

  const sendMessage = useCallback(
    async (body: string, mentioned_user_ids: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in.');
      const { error } = await supabase.functions.invoke('post-chat-message', {
        body: { livestream_id: livestreamId, body, mentioned_user_ids },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
    },
    [livestreamId],
  );

  return { messages, participants, sendMessage };
}
