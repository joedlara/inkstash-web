// src/components/livestreams/StreamChatRail.tsx
//
// Desktop-only right rail. Wraps LiveStreamChat in an editorial card:
// magazine-style table-of-contents tab strip, kicker + display header,
// ink shelf shadow matching the shop rail.

import { Box, Typography } from '@mui/material';
import LiveStreamChat from './LiveStreamChat';
import type { ChatMessage } from '../../api/livestreams';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  initialMessages: ChatMessage[];
  isBanned: boolean;
}

export default function StreamChatRail({ livestreamId, initialMessages, isBanned }: Props) {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: inkstashColors.bgElev,
        boxShadow: `0 6px 0 ${inkstashColors.ink}`,
        border: `1.5px solid ${inkstashColors.ink}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
      }}
    >
      {/* Header: kicker + header + tabs */}
      <Box sx={{ px: 2, pt: 2, pb: 0, borderBottom: `1.5px solid ${inkstashColors.ink}` }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 9,
            fontWeight: 700,
            color: inkstashColors.brand,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            mb: 0.5,
          }}
        >
          The floor
        </Typography>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 26,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            lineHeight: 1,
            mb: 1.5,
          }}
        >
          Chat
        </Typography>

        <Box sx={{ display: 'flex', gap: 0 }}>
          <Tab label="Chat" active />
          <Tab label="Watching" disabled />
        </Box>
      </Box>

      {/* Chat panel — slight cream sunken bg so the dark chat bubbles still
          read against it (they keep their existing rgba(0,0,0,0.55) backdrop). */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0, bgcolor: inkstashColors.bgSunken }}>
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
        px: 1,
        py: 0.85,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5,
          fontWeight: 800,
          color: active ? inkstashColors.ink : inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
        {disabled && (
          <Box
            component="span"
            sx={{
              ml: 0.6,
              fontFamily: inkstashFonts.mono,
              fontSize: 8,
              fontWeight: 700,
              color: inkstashColors.muted,
              letterSpacing: '0.1em',
            }}
          >
            · SOON
          </Box>
        )}
      </Typography>
      {active && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            left: 4,
            right: 4,
            height: 2,
            bgcolor: inkstashColors.brand,
          }}
        />
      )}
    </Box>
  );
}
