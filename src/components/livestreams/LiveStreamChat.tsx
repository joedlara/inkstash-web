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

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Box, TextField, IconButton, Avatar, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI, type ChatMessage } from '../../api/livestreams';
import { openProfileCard } from './ChatProfileCard';
import { userColor } from '../../utils/chatColors';
import {
  ChatBody,
  MentionAutocomplete,
  applySuggestion,
  computeSuggestion,
  type SuggestionState,
} from './chatMentions';
import { inkstashColors } from '../../theme/inkstashTokens';

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
  /** Host identity passthroughs so the host appears in the @-mention
   *  participant list and clicking the host's message opens the profile
   *  card even on first-load (before the host has spoken). */
  hostUsername?: string | null;
  hostUserId?: string | null;
  hostAvatarUrl?: string | null;
}

export default function LiveStreamChat({
  livestreamId,
  initialMessages,
  isBanned,
  readOnly = false,
  bottomReserve = 0,
  hostUsername = null,
  hostUserId = null,
  hostAvatarUrl = null,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, { username: string; avatar_url: string | null }>>({});
  const [sug, setSug] = useState<SuggestionState | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  // Participants for @-mention autocomplete + body rendering.
  const participants = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const m of messages) {
      const p = profiles[m.user_id];
      if (p?.username) set.add(p.username);
    }
    if (hostUsername) set.add(hostUsername);
    return [...set];
  }, [messages, profiles, hostUsername]);

  const knownSet = useMemo(() => new Set(participants), [participants]);

  const resolveUserId = useCallback((username: string): string | null => {
    if (hostUsername && username === hostUsername && hostUserId) return hostUserId;
    for (const [uid, p] of Object.entries(profiles)) {
      if (p.username === username) return uid;
    }
    return null;
  }, [profiles, hostUsername, hostUserId]);

  const openProfile = useCallback((username: string, avatarUrl: string | null) => {
    const userId = resolveUserId(username);
    if (!userId) return;
    const effectiveAvatar =
      avatarUrl
      ?? (hostUsername && username === hostUsername ? hostAvatarUrl : null);
    openProfileCard({ userId, username, avatarUrl: effectiveAvatar });
  }, [resolveUserId, hostUsername, hostAvatarUrl]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || isBanned) return;
    setSending(true);
    setDraft('');
    setSug(null);
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

  function onDraftChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const text = e.target.value;
    setDraft(text);
    const caret = e.target.selectionStart ?? text.length;
    setSug(computeSuggestion(text, caret, participants));
  }

  function commitPick(name: string) {
    if (!sug) return;
    const { text, caret } = applySuggestion(draft, sug, name);
    setDraft(text);
    setSug(null);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      try { el.setSelectionRange(caret, caret); } catch { /* noop */ }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (sug) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSug((s) => s ? { ...s, active: (s.active + 1) % s.items.length } : s);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSug((s) => s ? { ...s, active: (s.active - 1 + s.items.length) % s.items.length } : s);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        commitPick(sug.items[sug.active]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSug(null);
        return;
      }
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
          const usernameTone = m.is_mod_action ? inkstashColors.brand : userColor(username);
          return (
            <Box key={m.id} sx={{ display: 'block', mb: 0.6 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  // Allow the pill to wrap so long usernames or long
                  // bodies don't overflow.
                  flexWrap: 'wrap',
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
                {m.is_mod_action ? (
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: inkstashColors.brand,
                      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    MOD
                  </Typography>
                ) : (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => openProfile(username, profile?.avatar_url ?? null)}
                    sx={{
                      display: 'inline',
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 800,
                      color: usernameTone,
                      // Per spec: keep the legibility shadow on the
                      // overlay chat. Hover underline matches the
                      // prototype's affordance.
                      textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                      wordBreak: 'break-word',
                      textAlign: 'left',
                      '&:hover': { textDecoration: 'underline', textUnderlineOffset: '2px' },
                      '&:focus-visible': {
                        outline: '2px solid rgba(255,255,255,0.7)',
                        outlineOffset: 2,
                        borderRadius: 2,
                      },
                    }}
                  >
                    {username}
                  </Box>
                )}
                <Typography
                  component="span"
                  sx={{
                    fontSize: 13,
                    color: '#fff',
                    // Allow wrap so the body doesn't ellipsis away on
                    // long messages.
                    wordBreak: 'break-word',
                    minWidth: 0,
                  }}
                >
                  <ChatBody body={m.body} knownParticipants={knownSet} variant="immersive" />
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
          position: 'relative',
          display: 'block',
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
        {sug && (
          // The autocomplete pops above the row. Wrap so it inherits
          // the row's left/right padding.
          <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: '100%' }}>
            <MentionAutocomplete sug={sug} onPick={commitPick} variant="immersive" />
          </Box>
        )}
        <TextField
          fullWidth
          size="small"
          value={draft}
          onChange={onDraftChange}
          onKeyDown={onKeyDown}
          inputRef={inputRef}
          disabled={isBanned}
          placeholder={isBanned ? 'You were banned from this stream.' : 'Say something…'}
          inputProps={{ maxLength: 280 }}
          InputProps={{
            // Send button lives INSIDE the input pill on the right side.
            // Hidden when the draft is empty so the placeholder reads
            // clean; appears with a fade once the user types.
            endAdornment: (
              <IconButton
                type="submit"
                disabled={!draft.trim() || sending || isBanned}
                aria-label="Send message"
                sx={{
                  bgcolor: inkstashColors.brand,
                  color: '#fff',
                  width: 30,
                  height: 30,
                  // -4px so the pill kisses the inner edge of the input
                  // padding without growing the pill height.
                  mr: '-4px',
                  flexShrink: 0,
                  opacity: draft.trim() ? 1 : 0,
                  pointerEvents: draft.trim() ? 'auto' : 'none',
                  transition: 'opacity 140ms ease, background-color 160ms ease',
                  '&:hover': { bgcolor: inkstashColors.brandDeep },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.4)',
                  },
                }}
              >
                <Send sx={{ fontSize: 16 }} />
              </IconButton>
            ),
          }}
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
              // Right padding tightens so the inner Send button doesn't
              // double up with the field's normal right pad.
              pl: 1.75,
              pr: 0.5,
            },
            '& fieldset': { border: 'none' },
            '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
          }}
        />
      </Box>
      )}
    </Box>
  );
}
