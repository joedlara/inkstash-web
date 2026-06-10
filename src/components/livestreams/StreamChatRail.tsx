// src/components/livestreams/StreamChatRail.tsx
//
// Desktop right rail. Dedicated light-themed chat list (avatar + username +
// message body on a single row, no pill backdrop) plus a composer pinned at
// the bottom. Distinct from the mobile overlay chat which uses dark pill
// bubbles for legibility ON the video.
//
// Header: gold giveaway banner (stubbed at 0 until L4) + Chat/Watching
// tab strip.

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Box, Typography, Avatar, TextField, IconButton } from '@mui/material';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../../api/livestreams';
import { useLivestreamChat } from './useLivestreamChat';
import { openProfileCard } from './ChatProfileCard';
import { userColor } from '../../utils/chatColors';
import {
  ChatBody,
  MentionAutocomplete,
  applySuggestion,
  computeSuggestion,
  type SuggestionState,
} from './chatMentions';
import { inkstashColors , inkstashFonts} from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
  /** Host username for the @-mention participant list. The host won't
   *  appear in `profiles` until they say something — passing it here
   *  lets viewers @ the host on first load. */
  hostUsername?: string | null;
  /** Host user_id for the profile card open event. */
  hostUserId?: string | null;
  /** Host avatar url (so the profile card opens with the right image
   *  before the users-table lookup fires). */
  hostAvatarUrl?: string | null;
}

export default function StreamChatRail({
  livestreamId,
  initialMessages,
  isBanned,
  hostUsername = null,
  hostUserId = null,
  hostAvatarUrl = null,
}: Props) {
  const { messages, profiles, sending, send } = useLivestreamChat(livestreamId, initialMessages);
  const [draft, setDraft] = useState('');
  const [sug, setSug] = useState<SuggestionState | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom when a new message arrives, but only if the user
  // is already near the bottom — don't yank them away from older messages
  // they're reading.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Build the participant list for @-mention autocomplete: unique
  // authors of loaded messages, plus the host (if known and not
  // already in chat). Stable string array so we can pass it to the
  // suggestion computer + the body renderer without churn.
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

  // Look up a user_id by username — needed so a click on a colored
  // username opens the profile card for the right user. Falls back to
  // the host's id when the click target is the host (who may not have
  // sent a message yet). Returns null if we still don't know.
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
    // Prefer the avatar from the click site; fall back to the host's
    // avatar prop when this is the host (the users-table lookup races
    // the first-time host message).
    const effectiveAvatar =
      avatarUrl
      ?? (hostUsername && username === hostUsername ? hostAvatarUrl : null);
    openProfileCard({ userId, username, avatarUrl: effectiveAvatar });
  }, [resolveUserId, hostUsername, hostAvatarUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || isBanned) return;
    setDraft('');
    setSug(null);
    const res = await send(body);
    if (!res.ok && res.reason === 'profanity_blocked') {
      setDraft(body); // restore so the user can edit
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
    // Re-focus + restore caret next paint so typing continues smoothly.
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
    // Enter without an open suggestion → form submit handles it.
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: 'inherit',
      }}
    >
      {/* Tab strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          px: 1.75,
          pt: 1.5,
          pb: 0,
          borderBottom: `1px solid ${inkstashColors.border}`,
        }}
      >
        <Tab label="Chat" active />
        <Tab label="Watching" disabled />
      </Box>

      {/* Message list */}
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          px: 1.5,
          py: 1,
          // Hide visible scrollbar — chat rails read cleaner without one
          scrollbarWidth: 'thin',
          scrollbarColor: `${inkstashColors.border} transparent`,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: inkstashColors.border, borderRadius: 999 },
        }}
      >
        {messages.length === 0 && (
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 12.5,
              color: inkstashColors.muted,
              textAlign: 'center',
              py: 4,
            }}
          >
            Be the first to say something.
          </Typography>
        )}
        {messages.map((m) => {
          const profile = profiles[m.user_id];
          const username = profile?.username ?? '...';
          const usernameColor = m.is_mod_action ? inkstashColors.brand : userColor(username);
          return (
            <Box
              key={m.id}
              sx={{
                display: 'flex',
                gap: 1,
                py: 0.75,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                src={profile?.avatar_url ?? undefined}
                sx={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}
              >
                {username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                {/* Username — clickable button when not a MOD action.
                    MOD label stays a plain bold crimson tag. */}
                {m.is_mod_action ? (
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: inkstashFonts.ui,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: inkstashColors.brand,
                      letterSpacing: '-0.005em',
                      mr: 0.6,
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
                      verticalAlign: 'baseline',
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      margin: 0,
                      mr: 0.6,
                      cursor: 'pointer',
                      fontFamily: inkstashFonts.ui,
                      fontSize: 12.5,
                      fontWeight: 800,
                      letterSpacing: '-0.005em',
                      color: usernameColor,
                      textDecoration: 'none',
                      // Long usernames wrap rather than overflow.
                      wordBreak: 'break-word',
                      '&:hover': { textDecoration: 'underline', textUnderlineOffset: '2px' },
                      '&:focus-visible': {
                        outline: `2px solid ${inkstashColors.brand}`,
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
                    fontFamily: inkstashFonts.ui,
                    fontSize: 13,
                    color: inkstashColors.ink2,
                    letterSpacing: '-0.005em',
                    wordBreak: 'break-word',
                  }}
                >
                  <ChatBody body={m.body} knownParticipants={knownSet} variant="panel" />
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Composer */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          position: 'relative',
          display: 'flex',
          gap: 1,
          p: 1.25,
          borderTop: `1px solid ${inkstashColors.border}`,
          bgcolor: inkstashColors.bgElev,
        }}
      >
        {sug && <MentionAutocomplete sug={sug} onPick={commitPick} variant="panel" />}
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
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              borderRadius: 999,
              px: 1.5,
            },
            '& fieldset': { border: 'none' },
            '& input::placeholder': { color: inkstashColors.muted, opacity: 1 },
          }}
        />
        <IconButton
          type="submit"
          disabled={!draft.trim() || sending || isBanned}
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            width: 38,
            height: 38,
            flexShrink: 0,
            transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
            '&:hover': { bgcolor: inkstashColors.brandDeep },
            '&:active': { transform: 'scale(0.96)' },
            '&.Mui-disabled': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.muted,
            },
          }}
        >
          <Send size={16} strokeWidth={2.4} />
        </IconButton>
      </Box>
    </Box>
  );
}

function Tab({ label, active = false, disabled = false }: { label: string; active?: boolean; disabled?: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pb: 0.85,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 14,
          fontWeight: 700,
          color: active ? inkstashColors.ink : inkstashColors.muted,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </Typography>
      {active && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 2,
            bgcolor: inkstashColors.ink,
            borderRadius: 1,
          }}
        />
      )}
    </Box>
  );
}
