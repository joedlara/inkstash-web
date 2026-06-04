// src/components/livestreams/HostPill.tsx
//
// Top-left of the video card / fullscreen surface. Per the design spec at
// docs/design-system/claude-design/live_stream/stream.css :: .vf-host,
// the pill is a single horizontal glass capsule:
//
//   [gradient initial avatar] [ name + verified check     ] [Follow]
//                             [ rating row (4.9 + star)   ]
//
// The avatar gets a brand gradient (no external image fetch) so the pill
// always renders, including when there's no avatar_url. The verified blue
// check and the rating row are optional — they only render when the
// corresponding props are set.

import { useState } from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { Star } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  /** Reserved — currently unused because the design uses the initial-only
   *  gradient avatar. Kept so existing call sites don't break. */
  avatarUrl?: string | null;
  /** Show the blue verified check next to the username. */
  verified?: boolean;
  /** Show the rating row (e.g. 4.9) under the username. */
  rating?: number | null;
}

function VerifiedCheck() {
  // Twitter/whatnot-style blue check. Sized to ride the username baseline.
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ width: 15, height: 15, display: 'inline-block', flexShrink: 0 }}
      aria-label="Verified"
    >
      <path
        d="M12 2 L14.5 4.5 L18 4 L18.5 7.5 L21.5 9 L20 12 L21.5 15 L18.5 16.5 L18 20 L14.5 19.5 L12 22 L9.5 19.5 L6 20 L5.5 16.5 L2.5 15 L4 12 L2.5 9 L5.5 7.5 L6 4 L9.5 4.5 Z"
        fill="#1D9BF0"
      />
      <path
        d="M8 12.5 L11 15 L16.5 9.5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Box>
  );
}

export default function HostPill({
  username, verified = false, rating = null,
}: Props) {
  const [followed, setFollowed] = useState(false);
  const displayName = username ?? 'host';
  const initial = displayName.charAt(0).toUpperCase();
  const showRating = rating != null && rating > 0;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        bgcolor: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderRadius: 999,
        pl: '6px',
        pr: '12px',
        py: '6px',
        // Inner top highlight + drop shadow lift the pill off the video
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -6px rgba(0,0,0,0.4)',
      }}
    >
      {/* Gradient initial avatar (no external image fetch) */}
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 14,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {initial}
      </Box>

      {/* Name + rating column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            fontFamily: inkstashFonts.ui,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <Box
            component="span"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            @{displayName}
          </Box>
          {verified && <VerifiedCheck />}
        </Box>
        {showRating && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              mt: 0.3,
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1,
            }}
          >
            <Star size={11} fill="#FFC53D" stroke="none" />
            <Box component="span">{rating.toFixed(1)}</Box>
          </Box>
        )}
      </Box>

      {/* Follow button — brand-red pill, separate from the name block */}
      <ButtonBase
        onClick={() => setFollowed((v) => !v)}
        sx={{
          ml: 0.5,
          px: 1.5,
          py: 0.7,
          borderRadius: 999,
          bgcolor: followed ? 'rgba(255,255,255,0.18)' : inkstashColors.brand,
          color: '#fff',
          fontFamily: inkstashFonts.ui,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          transition: 'background-color 160ms ease, transform 120ms ease',
          '&:hover': {
            bgcolor: followed ? 'rgba(255,255,255,0.26)' : inkstashColors.brandDeep,
          },
          '&:active': { transform: 'scale(0.97)' },
        }}
        aria-pressed={followed}
      >
        {followed ? 'Following' : 'Follow'}
      </ButtonBase>
    </Box>
  );
}
