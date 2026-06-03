// src/components/livestreams/HostPill.tsx
//
// Top-left of the video card. Avatar sits OUTSIDE the white pill so the
// pill background doesn't extend behind it as a "white bar". The pill
// holds the username stacked above the Follow chip.

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
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 0.4,
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderRadius: 2,
          px: 1.25,
          py: 0.65,
          maxWidth: 'calc(100% - 60px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 800,
            color: inkstashColors.ink,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {displayName}
        </Typography>
        <ButtonBase
          onClick={() => setFollowed((v) => !v)}
          sx={{
            px: 1.1,
            py: 0.3,
            borderRadius: 999,
            bgcolor: followed ? inkstashColors.bgSunken : inkstashColors.brand,
            color: followed ? inkstashColors.ink : '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '-0.005em',
            lineHeight: 1,
            transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
            '&:hover': { bgcolor: followed ? inkstashColors.border : inkstashColors.brandDeep },
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          {followed ? '✓ Following' : 'Follow'}
        </ButtonBase>
      </Box>
    </Box>
  );
}
