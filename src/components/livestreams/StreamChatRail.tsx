// src/components/livestreams/StreamChatRail.tsx
//
// Desktop-only right rail. Wraps the existing LiveStreamChat in a dedicated
// dark panel with a Chat/Watching tab strip at the top. Watching tab is
// disabled in this pass; ships when L4 ports the participant list over.
//
// Mobile keeps the overlay-style LiveStreamChat (rendered directly on top
// of the video) so this component is purely an md+ surface.

import { Box, Typography } from '@mui/material';
import LiveStreamChat from './LiveStreamChat';
import type { ChatMessage } from '../../api/livestreams';
import { inkstashFonts } from '../../theme/inkstashTokens';

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
        bgcolor: '#0f0f0f',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Tab strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          px: 2,
          pt: 1.5,
          pb: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Tab label="Chat" active />
        <Tab label="Watching" disabled />
      </Box>

      {/* Chat fills the rest of the rail. LiveStreamChat is internally
          absolutely positioned for the overlay use case; wrapping it in a
          relative container of explicit height makes it behave like a normal
          flex child here. */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
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
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 13,
          fontWeight: 700,
          color: active ? '#fff' : 'rgba(255,255,255,0.7)',
        }}
      >
        {label}
        {disabled && (
          <Box
            component="span"
            sx={{
              ml: 0.75,
              fontFamily: inkstashFonts.mono,
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              bgcolor: 'rgba(255,255,255,0.08)',
              px: 0.6,
              py: 0.2,
              borderRadius: 4,
            }}
          >
            Soon
          </Box>
        )}
      </Typography>
      {active && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 2,
            bgcolor: '#fff',
            borderRadius: 1,
          }}
        />
      )}
    </Box>
  );
}
