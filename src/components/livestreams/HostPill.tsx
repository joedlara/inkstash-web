// src/components/livestreams/HostPill.tsx
//
// Modern WhatNot-style host pill on top of the video. Avatar + username +
// star rating + Follow chip in a single rounded pill. Tight negative
// letter-spacing to match the home page's typographic system.

import { useState } from 'react';
import { Box, Avatar, Typography, ButtonBase } from '@mui/material';
import { Star } from 'lucide-react';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  avatarUrl?: string | null;
  rating?: number;
}

export default function HostPill({ username, avatarUrl, rating = 5.0 }: Props) {
  const [followed, setFollowed] = useState(false);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 999,
        pl: 0.5,
        pr: 0.5,
        py: 0.5,
        maxWidth: 'calc(100% - 100px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      }}
    >
      <Avatar src={avatarUrl ?? undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
        {(username ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1 }}>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 800,
            color: inkstashColors.ink,
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {username ?? 'host'}
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
          <Star size={10} fill={inkstashColors.gold} strokeWidth={0} />
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 10.5,
              fontWeight: 700,
              color: inkstashColors.ink2,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
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
          px: 1.4,
          py: 0.5,
          borderRadius: 999,
          bgcolor: followed ? inkstashColors.bgSunken : inkstashColors.gold,
          color: followed ? inkstashColors.ink : '#16110E',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1)',
          '&:hover': { bgcolor: followed ? inkstashColors.border : '#D6A555' },
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {followed ? '✓ Following' : 'Follow'}
      </ButtonBase>
    </Box>
  );
}
