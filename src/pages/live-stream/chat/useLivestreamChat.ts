// useLivestreamChat — Phase 2 mock chat. Seeds from the prototype's static
// chat array and lets the composer push new "you" messages onto the list.
// Replaced in Phase 3c by the real chat subscription + insert RPC.
//
// The returned shape matches the Phase-3 contract: every message has a real
// `user_id` (synthesized as a stable UUID per username here, replaced by the
// real auth user_id in Phase 3c). Mentions are stored as `mentioned_user_ids`
// — a UUID[] — so the wire shape matches the real `livestream_chat_messages`
// row already. Participants are a `Map<user_id, {username, color}>` for the
// same reason: mention pills render by resolving an id, not a name.
import { useCallback, useMemo, useState } from 'react';
import { mockChat, mockHost } from '../_mock/streamData.mock';
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

/** Stable username → synthetic-UUID cache, module-scoped so the same username
 *  resolves to the same id across re-renders / re-mounts of the hook. Phase 3c
 *  swaps this for the real auth.users.id from the chat row. */
const usernameToId = new Map<string, string>();
function idFor(username: string): string {
  const existing = usernameToId.get(username);
  if (existing) return existing;
  const id = crypto.randomUUID();
  usernameToId.set(username, id);
  return id;
}

/** Build the initial ChatMessage[] from the prototype's static seed, resolving
 *  every mention `@name` token to its synthetic user_id. */
function seedMessages(): ChatMessage[] {
  // Pre-warm host id so participants always lists the host even if they haven't
  // spoken in chat yet.
  idFor(mockHost.name);
  const base = Date.now() - mockChat.length * 1000;
  return mockChat.map((m, i) => {
    const mentionedIds: string[] = [];
    if (m.mention) {
      const name = m.mention.replace(/^@/, '');
      mentionedIds.push(idFor(name));
    }
    return {
      id: 'seed-' + i,
      user_id: idFor(m.user),
      username: m.user,
      body: m.text,
      ts: base + i * 1000,
      mentioned_user_ids: mentionedIds,
      q: m.q,
    };
  });
}

export function useLivestreamChat(_livestreamId: string): UseLivestreamChat {
  const [messages, setMessages] = useState<ChatMessage[]>(() => seedMessages());

  // Pre-seed "you" so the local viewer has a stable id (mirrors LiveStreamView's
  // VIEWER_ID constant, but uses a UUID for shape parity with Phase 3c).
  const youId = useMemo(() => idFor('you'), []);

  // Participants = every distinct author seen (host pre-warmed via seedMessages).
  const participants = useMemo<Map<string, Participant>>(() => {
    const m = new Map<string, Participant>();
    // Host always present.
    m.set(idFor(mockHost.name), { username: mockHost.name, color: usernameColor(mockHost.name) });
    for (const msg of messages) {
      if (!m.has(msg.user_id)) {
        m.set(msg.user_id, { username: msg.username, color: usernameColor(msg.username) });
      }
    }
    return m;
  }, [messages]);

  const sendMessage = useCallback(
    async (body: string, mentionedUserIds: string[]) => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'local-' + prev.length,
          user_id: youId,
          username: 'you',
          body,
          ts: Date.now(),
          mentioned_user_ids: mentionedUserIds,
        },
      ]);
    },
    [youId],
  );

  return { messages, participants, sendMessage };
}
