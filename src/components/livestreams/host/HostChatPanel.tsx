// src/components/livestreams/host/HostChatPanel.tsx
//
// Reuses the useLivestreamChat hook for data, but adds host-side
// moderation actions (ban author). Light theme, mirrors the desktop
// StreamChatRail layout so the host sees roughly what their audience
// sees, just with the extra controls.

import { useEffect, useRef, useState, FormEvent } from 'react';
import { Box, Typography, Avatar, TextField, IconButton, Menu, MenuItem } from '@mui/material';
import { Send, MoreVertical } from 'lucide-react';
import type { ChatMessage } from '../../../api/livestreams';
import { livestreamsAPI } from '../../../api/livestreams';
import { useLivestreamChat } from '../useLivestreamChat';
import { inkstashColors } from '../../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages?: ChatMessage[];
}

export default function HostChatPanel({ livestreamId, initialMessages = [] }: Props) {
  const { messages, profiles, sending, send } = useLivestreamChat(livestreamId, initialMessages);
  const [draft, setDraft] = useState('');
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; userId: string } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const res = await send(body);
    if (!res.ok && res.reason === 'profanity_blocked') setDraft(body);
  }

  async function handleBan() {
    if (!menuFor) return;
    const { userId } = menuFor;
    setMenuFor(null);
    try {
      await livestreamsAPI.banChatter(livestreamId, userId);
    } catch (err) {
      console.warn('[HostChatPanel] ban failed', err);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          px: 1.5,
          py: 1,
          scrollbarWidth: 'thin',
        }}
      >
        {messages.length === 0 && (
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              color: inkstashColors.muted,
              textAlign: 'center',
              py: 4,
            }}
          >
            No messages yet.
          </Typography>
        )}
        {messages.map((m) => {
          const p = profiles[m.user_id];
          const username = p?.username ?? '...';
          return (
            <Box key={m.id} sx={{ display: 'flex', gap: 1, py: 0.75, alignItems: 'flex-start' }}>
              <Avatar src={p?.avatar_url ?? undefined} sx={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}>
                {username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
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
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    color: inkstashColors.ink2,
                    letterSpacing: '-0.005em',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.body}
                </Typography>
              </Box>
              {!m.is_mod_action && (
                <IconButton
                  size="small"
                  onClick={(e) => setMenuFor({ anchor: e.currentTarget, userId: m.user_id })}
                  sx={{ p: 0.25, color: inkstashColors.muted, flexShrink: 0 }}
                  aria-label="Message actions"
                >
                  <MoreVertical size={14} />
                </IconButton>
              )}
            </Box>
          );
        })}
      </Box>

      <Menu
        anchorEl={menuFor?.anchor}
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        PaperProps={{ sx: { borderRadius: 1.5 } }}
      >
        <MenuItem
          onClick={handleBan}
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: inkstashColors.brand,
            letterSpacing: '-0.005em',
          }}
        >
          Ban from stream
        </MenuItem>
      </Menu>

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
          placeholder="Say something to your viewers…"
          inputProps={{ maxLength: 280 }}
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
              fontFamily: "'Outfit', sans-serif",
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
          disabled={!draft.trim() || sending}
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            width: 38,
            height: 38,
            flexShrink: 0,
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
