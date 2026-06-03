// src/components/livestreams/LiveStreamCard.tsx
//
// Tile used by /live sections. Layout matches the home page Live Streams
// widget: host row on top (avatar + @username), then rounded thumbnail
// with a Live/scheduled pill, then title beneath. No card border or body
// background — the thumbnail IS the card visually; everything else is
// stacked typography.
//
// Click anywhere on the tile navigates to /live/:id. The host row alone
// routes to the host's profile so people can follow direct from here.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props {
  stream: Livestream;
  /** Render the scheduled start-time pill instead of the Live pill. */
  scheduled?: boolean;
  /** Render the card on a dark surface (used by the Featured row).
   *  Inverts the body text colors so the title + host name stay legible. */
  variant?: 'light' | 'dark';
}

/** Compact start-time pill: 1d 4h, 2h 15m, 12m, 45s, or "starting" when
 *  the scheduled time has elapsed (cron will flip status soon). */
function formatTimeUntil(iso: string | null): string {
  if (!iso) return 'soon';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'starting';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    const rs = s % 60;
    return rs === 0 ? `${m}m` : `${m}m ${rs}s`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    const rm = m % 60;
    return rm === 0 ? `${h}h` : `${h}h ${rm}m`;
  }
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh === 0 ? `${d}d` : `${d}d ${rh}h`;
}

export default function LiveStreamCard({ stream, scheduled = false, variant = 'light' }: Props) {
  const navigate = useNavigate();
  const cover = stream.cover_image_url ?? PLACEHOLDER_IMAGE_URL;

  // 1s tick so the scheduled countdown updates live. Cheap — scoped to
  // this single tile and only when it's actually a scheduled card.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [scheduled]);

  const pill = scheduled
    ? { bg: inkstashColors.brand, text: '#fff', label: formatTimeUntil(stream.scheduled_start_at) }
    : { bg: inkstashColors.live, text: '#fff', label: 'Live', dot: true as const };

  const isDark = variant === 'dark';
  const titleColor = isDark ? '#fff' : inkstashColors.ink;
  const hostColor = isDark ? 'rgba(255,255,255,0.85)' : inkstashColors.ink;
  const hostBorderColor = isDark ? 'rgba(255,255,255,0.18)' : inkstashColors.border;

  const goToStream = () => navigate(`/live/${stream.id}`);
  const goToHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream.host?.username) navigate(`/@${stream.host.username}`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Host row */}
      <Box
        onClick={goToHost}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          cursor: 'pointer',
          transition: 'opacity 160ms ease',
          '&:hover': { opacity: 0.7 },
        }}
      >
        <Box
          component="img"
          src={stream.host?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
          alt={stream.host?.username ?? 'host'}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            objectFit: 'cover',
            border: `2px solid ${hostBorderColor}`,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13.5,
            fontWeight: 700,
            color: hostColor,
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {stream.host?.username ?? 'host'}
        </Typography>
      </Box>

      {/* Thumbnail (rounded card with badge) */}
      <Box
        onClick={goToStream}
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '133.33%', // 3:4 ratio, matches home widget
          overflow: 'hidden',
          bgcolor: '#000',
          borderRadius: 3,
          cursor: 'pointer',
        }}
      >
        <Box
          component="img"
          src={cover}
          alt={stream.title}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 300ms ease',
            '.MuiBox-root:hover > &': { transform: 'scale(1.05)' },
          }}
        />

        {/* Pill: red Live with pulsing dot, or crimson countdown for scheduled */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.9,
            py: 0.4,
            borderRadius: 1,
            bgcolor: pill.bg,
            color: pill.text,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '-0.005em',
            lineHeight: 1,
            zIndex: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          {pill.dot && (
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: '#fff',
                animation: 'pulse-live-dot 1.5s ease-in-out infinite',
                '@keyframes pulse-live-dot': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
          {pill.label}
        </Box>
      </Box>

      {/* Title under thumbnail */}
      <Box onClick={goToStream} sx={{ pt: 1.5, cursor: 'pointer' }}>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: titleColor,
            letterSpacing: '-0.005em',
            lineHeight: 1.35,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {stream.title}
        </Typography>
      </Box>
    </Box>
  );
}
