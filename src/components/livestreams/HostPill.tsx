// src/components/livestreams/HostPill.tsx
//
// Editorial byline treatment: kicker ("LIVE FROM") + display-weight username
// + thin rule + Follow chip. Anchored top-left of the video card.
// Translucent dark backdrop so it reads on any video frame.

import { useState } from 'react';
import { Box, Avatar, Typography, ButtonBase } from '@mui/material';
import { Star } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

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
        bgcolor: 'rgba(10,10,10,0.72)',
        backdropFilter: 'blur(10px)',
        // Asymmetric corners give it a "stamped" feel, not a generic pill
        borderRadius: '4px 14px 14px 4px',
        pl: 0.5,
        pr: 0.75,
        py: 0.5,
        maxWidth: 'calc(100% - 100px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Avatar
        src={avatarUrl ?? undefined}
        sx={{
          width: 30,
          height: 30,
          fontSize: 13,
          // Gold ring like a newspaper byline portrait
          border: `2px solid ${inkstashColors.gold}`,
        }}
      >
        {(username ?? '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 8.5,
            fontWeight: 700,
            color: inkstashColors.gold,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            lineHeight: 1,
            mb: 0.25,
          }}
        >
          Live from
        </Typography>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontSize: 14,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            {username ?? 'host'}
          </Typography>
          <Star size={9} fill={inkstashColors.gold} strokeWidth={0} />
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 9,
              fontWeight: 700,
              color: inkstashColors.gold,
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
          px: 1.2,
          py: 0.55,
          // Square the corner toward the pill body, round the outer edge
          borderRadius: '4px 999px 999px 4px',
          bgcolor: followed ? 'rgba(255,255,255,0.12)' : inkstashColors.gold,
          color: followed ? '#fff' : '#16110E',
          fontFamily: inkstashFonts.ui,
          fontSize: 10.5,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          transition: 'background-color 160ms ease',
          '&:hover': { bgcolor: followed ? 'rgba(255,255,255,0.2)' : '#D6A555' },
        }}
      >
        {followed ? '✓ Following' : 'Follow'}
      </ButtonBase>
    </Box>
  );
}
