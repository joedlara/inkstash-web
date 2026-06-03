// src/components/livestreams/HostPill.tsx
//
// Top-left cluster: host avatar + @username + star rating placeholder +
// Follow chip. WhatNot-style density without the noise. Follow is a no-op
// in this visual pass; real follow infra ships with raffles in L4.

import { useState } from 'react';
import { Box, Avatar, Typography, ButtonBase } from '@mui/material';
import { Star } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  avatarUrl?: string | null;
  /** Star rating (0-5). Placeholder until reviews ship. */
  rating?: number;
}

export default function HostPill({ username, avatarUrl, rating = 5.0 }: Props) {
  const [followed, setFollowed] = useState(false);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        pl: 0.5,
        pr: 0.5,
        py: 0.5,
        borderRadius: 999,
        maxWidth: 'calc(100vw - 100px)',
      }}
    >
      <Avatar src={avatarUrl ?? undefined} sx={{ width: 26, height: 26, fontSize: 12 }}>
        {(username ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {username ?? 'host'}
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
          <Star size={10} fill={inkstashColors.gold} strokeWidth={0} />
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              fontWeight: 700,
              color: inkstashColors.gold,
              lineHeight: 1,
            }}
          >
            {rating.toFixed(1)}
          </Typography>
        </Box>
      </Box>
      <ButtonBase
        onClick={() => setFollowed((v) => !v)}
        sx={{
          ml: 0.5,
          px: 1.1,
          py: 0.45,
          borderRadius: 999,
          bgcolor: followed ? 'rgba(255,255,255,0.15)' : inkstashColors.gold,
          color: followed ? '#fff' : '#16110E',
          fontFamily: inkstashFonts.ui,
          fontSize: 10.5,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          transition: 'background-color 160ms ease',
        }}
      >
        {followed ? 'Following' : 'Follow'}
      </ButtonBase>
    </Box>
  );
}
