// src/components/livestreams/HostPill.tsx
//
// Top-left of the video card. Avatar sits OUTSIDE a glassmorphic pill that
// holds @username + Follow chip. Pill width follows the content (no truncation
// up to the safety cap) so the username is always fully visible.

import { useState } from 'react';
import { Box, Avatar, Typography, ButtonBase } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  avatarUrl?: string | null;
}

export default function HostPill({ username, avatarUrl }: Props) {
  const [followed, setFollowed] = useState(false);
  const displayName = username ?? 'host';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Avatar
        src={avatarUrl ?? undefined}
        sx={{
          width: 40,
          height: 40,
          fontSize: 16,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          bgcolor: inkstashColors.brand,
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.95)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>

      {/* Glassmorphism pill — translucent dark with heavy blur so the
          video shows through. Width hugs the content (no width cap besides
          the safety max so very long names still fit). */}
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 0.4,
          bgcolor: 'rgba(20,16,12,0.42)',
          backdropFilter: 'blur(14px) saturate(160%)',
          WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 2,
          px: 1.25,
          py: 0.65,
          maxWidth: 320,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          @{displayName}
        </Typography>
        <ButtonBase
          onClick={() => setFollowed((v) => !v)}
          sx={{
            px: 1.1,
            py: 0.3,
            borderRadius: 999,
            bgcolor: followed ? 'rgba(255,255,255,0.18)' : inkstashColors.brand,
            color: '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '-0.005em',
            lineHeight: 1,
            transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
            '&:hover': { bgcolor: followed ? 'rgba(255,255,255,0.26)' : inkstashColors.brandDeep },
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          {followed ? '✓ Following' : 'Follow'}
        </ButtonBase>
      </Box>
    </Box>
  );
}
