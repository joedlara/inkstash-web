// src/components/livestreams/HostPill.tsx
//
// Top-left of the video card. Light pill containing avatar + username, with
// a stacked Follow button beneath the username. Crimson Follow chip ties
// the cluster to the rest of the app's brand language.

import { useState } from 'react';
import { Box, Avatar, Typography, ButtonBase } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  avatarUrl?: string | null;
}

export default function HostPill({ username, avatarUrl }: Props) {
  const [followed, setFollowed] = useState(false);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 999,
        pl: 0.5,
        pr: 1.25,
        py: 0.5,
        maxWidth: 'calc(100% - 100px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      }}
    >
      <Avatar src={avatarUrl ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>
        {(username ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 0.3 }}>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13.5,
            fontWeight: 800,
            color: inkstashColors.ink,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {username ?? 'host'}
        </Typography>
        <ButtonBase
          onClick={() => setFollowed((v) => !v)}
          sx={{
            alignSelf: 'flex-start',
            px: 1.25,
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
