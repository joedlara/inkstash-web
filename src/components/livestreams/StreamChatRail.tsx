// src/components/livestreams/StreamChatRail.tsx
//
// Desktop right rail. Dedicated light-themed chat list (avatar + username +
// message body on a single row, no pill backdrop) plus a composer pinned at
// the bottom. Distinct from the mobile overlay chat which uses dark pill
// bubbles for legibility ON the video.
//
// Header: gold giveaway banner (stubbed at 0 until L4) + Chat/Watching
// tab strip.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Box, Typography, Avatar, TextField, IconButton } from '@mui/material';
import { Send } from 'lucide-react';
import type { ChatMessage } from '../../api/livestreams';
import { useLivestreamChat } from './useLivestreamChat';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
}

export default function StreamChatRail({ livestreamId, initialMessages, isBanned }: Props) {
  const { messages, profiles, sending, send } = useLivestreamChat(livestreamId, initialMessages);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when a new message arrives, but only if the user
  // is already near the bottom — don't yank them away from older messages
  // they're reading.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || isBanned) return;
    setDraft('');
    const res = await send(body);
    if (!res.ok && res.reason === 'profanity_blocked') {
      setDraft(body); // restore so the user can edit
    }
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
                <Typography
                  component="span"
                  sx={{
                    fontFamily: inkstashFonts.ui,
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: m.is_mod_action ? inkstashColors.brand : inkstashColors.ink,
                    letterSpacing: '-0.005em',
                    mr: 0.6,
                  }}
                >
                  {m.is_mod_action ? 'MOD' : username}
                </Typography>
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
                  {m.body}
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
          display: 'flex',
          gap: 1,
          p: 1.25,
          borderTop: `1px solid ${inkstashColors.border}`,
          bgcolor: inkstashColors.bgElev,
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
