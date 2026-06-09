// src/components/livestreams/LiveStreamChat.tsx
//
// WhatNot-style overlay chat. The video sits underneath full-bleed; chat
// floats in the lower-third with no opaque panel:
//   - Messages render as pill bubbles with avatar + username + body
//   - A short gradient mask fades the bottom so video shows through behind chat
//   - Composer is a transparent rounded input pinned to the very bottom
//
// In-chat ban link is removed in v1; moderation moves to a click-username
// modal in a later milestone.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Box, TextField, IconButton, Avatar, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI, type ChatMessage } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';
import { colorForUsername } from './usernameColor';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
  // Host-overlay mode: hide composer, keep the scrollable message list.
  readOnly?: boolean;
  /** Reserved space at the bottom in px, e.g. for the MobileAuctionCard
   *  sitting under the chat. Composer lifts by this much so the input
   *  isn't covered by the card. */
  bottomReserve?: number;
}

export default function LiveStreamChat({
  livestreamId, initialMessages, isBanned, readOnly = false, bottomReserve = 0,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({});
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

  // Backfill profiles (username + avatar) for any author we haven't seen yet.
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
        const next: Record<string, { username: string; avatar_url: string | null }> = {};
        (data ?? []).forEach((u: { id: string; username: string | null; avatar_url: string | null }) => {
          next[u.id] = { username: u.username ?? 'anon', avatar_url: u.avatar_url };
        });
        setProfiles((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
  }, [messages, profiles]);

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
      }
    } finally {
      setSending(false);
    }
  }

  // Tail the last 6 messages so the overlay never grows past the lower-third.
  const visible = messages.slice(-6);

  // Track the on-screen keyboard so we can lift JUST the composer above it,
  // not push the whole camera up. visualViewport reports the part of the
  // viewport not covered by the OSK; the delta between window.innerHeight
  // and visualViewport.height is the keyboard height.
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(kb);
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        pointerEvents: 'none', // let video receive clicks except where we explicitly opt in
      }}
    >
      {/* Message stack — pill bubbles floating on the video. Lifts with the
          keyboard so the bottom messages stay visible above the OSK. */}
      <Box
        ref={listRef}
        sx={{
          maxHeight: '50vh',
          overflowY: 'auto',
          px: 1.5,
          pb: 1,
          pointerEvents: 'auto',
          transform: `translateY(${-keyboardOffset}px)`,
          transition: 'transform 180ms ease-out',
          // Hide the scrollbar; WhatNot's chat scrolls without a visible bar.
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // Soft top fade so messages dissolve into the video as they scroll up.
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
        }}
      >
        {visible.map((m) => {
          const profile = profiles[m.user_id];
          const username = profile?.username ?? '...';
          return (
            <Box key={m.id} sx={{ display: 'block', mb: 0.6 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  maxWidth: '100%',
                  bgcolor: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(6px)',
                  px: 1.1,
                  py: 0.5,
                  borderRadius: 999,
                }}
              >
                <Avatar
                  src={profile?.avatar_url ?? undefined}
                  sx={{ width: 18, height: 18, fontSize: 10 }}
                >
                  {username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography
                  component="span"
                  sx={{
                    fontSize: 13,
                    fontWeight: 800,
                    // Mod overrides chat-color so the gold MOD pill
                    // reads as moderation. Otherwise hash the
                    // username into the Twitch-style palette
                    // (USERNAME_COLORS) so the eye can track the
                    // same chatter between chat + auction status.
                    color: m.is_mod_action ? inkstashColors.gold : colorForUsername(username),
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.is_mod_action ? 'MOD' : username}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: 13,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {m.body}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Composer — pill input, transparent. Pinned to the bottom safe-area
          when keyboard is closed; lifts above the keyboard when it's open.
          Suppressed in readOnly mode (host overlay). */}
      {!readOnly && (
      <Box
        component="form"
        onSubmit={send}
        sx={{
          display: 'flex',
          gap: 1,
          px: 1.5,
          // Lift the composer above any reserved bottom space (e.g. the
          // MobileAuctionCard underneath). When the keyboard is open we
          // also collapse the safe-area + reserve into a flat 12px so the
          // input rides directly above the keyboard.
          pb: keyboardOffset > 0
            ? '12px'
            : `calc(max(env(safe-area-inset-bottom), 12px) + ${bottomReserve}px)`,
          pointerEvents: 'auto',
          transform: `translateY(${-keyboardOffset}px)`,
          transition: 'transform 180ms ease-out, padding-bottom 180ms ease-out',
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
          onFocus={() => {
            // iOS Safari sometimes scrolls the document up to "reveal" a
            // focused input even when it's already in view. Snap back to
            // the top after a tick so the camera stays anchored.
            requestAnimationFrame(() => window.scrollTo(0, 0));
          }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              fontSize: 13,
              borderRadius: 999,
              px: 1.5,
            },
            '& fieldset': { border: 'none' },
            '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
          }}
        />
        <IconButton
          type="submit"
          disabled={!draft.trim() || sending || isBanned}
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            width: 40,
            height: 40,
            flexShrink: 0,
            '&:hover': { bgcolor: inkstashColors.brandDeep },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' },
          }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
      )}
    </Box>
  );
}
