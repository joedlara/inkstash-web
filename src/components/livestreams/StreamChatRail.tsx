// src/components/livestreams/StreamChatRail.tsx
//
// Desktop right rail. Modern light theme matching the homepage. "Giveaway
// with N entries" banner pinned to the top (stub until L4), Chat/Watching
// tab strip beneath it, then the chat panel.

import { Box, Typography } from '@mui/material';
import { ChevronDown } from 'lucide-react';
import LiveStreamChat from './LiveStreamChat';
import type { ChatMessage } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
}

export default function StreamChatRail({ livestreamId, initialMessages, isBanned }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: inkstashColors.bgElev,
        borderLeft: `1px solid ${inkstashColors.border}`,
      }}
    >
      {/* Giveaway banner (stub — L4 raffles fill this with real entry counts) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1,
          bgcolor: inkstashColors.bgSunken,
          borderBottom: `1px solid ${inkstashColors.border}`,
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              bgcolor: inkstashColors.gold,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16110E',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: 10,
            }}
          >
            🎁
          </Box>
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: inkstashColors.ink,
              letterSpacing: '-0.005em',
            }}
          >
            Giveaway with 0 entries
          </Typography>
        </Box>
        <ChevronDown size={16} color={inkstashColors.muted} />
      </Box>

      {/* Tab strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          px: 1.75,
          pt: 1.25,
          pb: 0.5,
          borderBottom: `1px solid ${inkstashColors.border}`,
        }}
      >
        <Tab label="Chat" active />
        <Tab label="Watching" disabled />
      </Box>

      {/* Chat panel */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0, bgcolor: inkstashColors.bg }}>
        <LiveStreamChat
          livestreamId={livestreamId}
          initialMessages={initialMessages}
          isBanned={isBanned}
        />
      </Box>
    </Box>
  );
}

function Tab({ label, active = false, disabled = false }: { label: string; active?: boolean; disabled?: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        pb: 0.75,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: "'Outfit', sans-serif",
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
