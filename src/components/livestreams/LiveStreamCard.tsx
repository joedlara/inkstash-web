// src/components/livestreams/LiveStreamCard.tsx
//
// Tile used by /live sections. Click navigates to /live/:id when live, or
// to the same page for scheduled streams (where the page will show a
// "starts in X" countdown until status flips to live). Scheduled tiles
// render a gold "soon" badge with the relative start time instead of the
// red "Live" pill.

import { useEffect, useState } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashRadii } from '../../theme/inkstashTokens';
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
 *  the scheduled time has elapsed (cron will flip status soon). Live, not
 *  computed once — caller wraps in a 1s tick so the pill counts down on
 *  screen. */
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

  // Re-render once per second when scheduled so the countdown pill ticks
  // down live. Skipped for live streams (no countdown to update).
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [scheduled]);

  const pill = scheduled
    ? { bg: inkstashColors.brand, text: '#fff', label: formatTimeUntil(stream.scheduled_start_at) }
    : { bg: inkstashColors.live, text: '#fff', label: 'Live' };

  const isDark = variant === 'dark';
  const bodyBg = isDark ? 'rgba(255,255,255,0.04)' : inkstashColors.bgElev;
  const titleColor = isDark ? '#fff' : inkstashColors.ink;
  const hostColor = isDark ? 'rgba(255,255,255,0.6)' : inkstashColors.muted;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : inkstashColors.border;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(`/live/${stream.id}`)}
      sx={{
        display: 'block', width: '100%', p: 0, textAlign: 'left',
        border: `1px solid ${borderColor}`,
        borderRadius: inkstashRadii.lg,
        bgcolor: bodyBg,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: inkstashColors.brand,
          boxShadow: isDark
            ? '0 8px 20px rgba(0,0,0,0.35)'
            : '0 8px 20px rgba(22,17,14,0.12)',
        },
        '&:active': { transform: 'translateY(-1px)' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%', aspectRatio: '9 / 16',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          bgcolor: inkstashColors.bgSunken,
        }}
      >
        <Box sx={{
          position: 'absolute', top: 8, left: 8,
          px: 0.9, py: 0.35,
          borderRadius: 999,
          bgcolor: pill.bg, color: pill.text,
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '-0.005em',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        }}>
          {pill.label}
        </Box>
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Avatar src={stream.host?.avatar_url ?? undefined} sx={{ width: 20, height: 20, fontSize: 10 }}>
            {(stream.host?.username ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: hostColor,
              letterSpacing: '-0.005em',
            }}
          >
            @{stream.host?.username ?? 'host'}
          </Typography>
        </Box>
        <Typography sx={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: 13.5,
          color: titleColor,
          letterSpacing: '-0.01em',
          lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {stream.title}
        </Typography>
      </Box>
    </Box>
  );
}
