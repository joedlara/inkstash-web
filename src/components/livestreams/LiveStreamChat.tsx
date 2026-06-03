// src/components/livestreams/LiveStreamChat.tsx
//
// Bottom-docked chat with sticky composer. Uses Supabase Realtime channel
// on the livestream_chat table for incoming messages and the post-chat-message
// edge fn for sending.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Box, TextField, IconButton, Avatar, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI, type ChatMessage } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
  /** When true, render a tiny ban link next to each message so the host can tap to ban. */
  hostMode?: boolean;
  onBanUser?: (userId: string) => void;
}

export default function LiveStreamChat({
  livestreamId, initialMessages, isBanned, hostMode = false, onBanUser,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to new chat messages via Supabase Realtime
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

  // Backfill usernames for messages we don't yet have names for. One batched call
  // when the list of unknown user_ids grows.
  useEffect(() => {
    const unknown = [...new Set(messages.map((m) => m.user_id))].filter((id) => !usernames[id]);
    if (unknown.length === 0) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('id, username')
      .in('id', unknown)
      .then(({ data }) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        (data ?? []).forEach((u: { id: string; username: string | null }) => {
          next[u.id] = u.username ?? 'anon';
        });
        setUsernames((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [messages, usernames]);

  // Auto-scroll to bottom on new messages (only if user is near the bottom).
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const wasNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (wasNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || isBanned) return;
    setSending(true);
    setDraft('');
    try {
      await livestreamsAPI.postChat(livestreamId, body);
    } catch (err) {
      const e = err as Error;
      if (e.name === 'profanity_blocked') {
        setDraft(body);
        // TODO: surface a toast saying "watch your language"
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          // Semi-transparent dark gradient so video shows through
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
        }}
      >
        {messages.map((m) => (
          <Box key={m.id} sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'flex-start' }}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>
              {(usernames[m.user_id] ?? '?').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                component="span"
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: m.is_mod_action ? inkstashColors.gold : '#fff',
                  mr: 0.5,
                }}
              >
                {m.is_mod_action ? 'MOD' : (usernames[m.user_id] ?? '...')}
              </Typography>
              <Typography component="span" sx={{ fontSize: 12, color: '#eee' }}>
                {m.body}
              </Typography>
              {hostMode && !m.is_mod_action && (
                <Typography
                  component="button"
                  onClick={() => onBanUser?.(m.user_id)}
                  sx={{
                    ml: 1, fontSize: 10, color: '#ff7676', bgcolor: 'transparent',
                    border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                  }}
                >
                  Ban
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={send}
        sx={{
          display: 'flex',
          gap: 1,
          p: 1,
          bgcolor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <TextField
          fullWidth
          size="small"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isBanned}
          placeholder={isBanned ? 'You were banned from this stream.' : 'Say something…'}
          inputProps={{ maxLength: 280 }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: 13,
              borderRadius: 999,
            },
            '& fieldset': { border: 'none' },
          }}
        />
        <IconButton type="submit" disabled={!draft.trim() || sending || isBanned} sx={{ color: inkstashColors.brand }}>
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
