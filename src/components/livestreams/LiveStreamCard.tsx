// src/components/livestreams/LiveStreamCard.tsx
//
// Tile used by /live sections. Click navigates to /live/:id when live, or
// to the same page for scheduled streams (where the page will show a
// "starts in X" countdown until status flips to live). Scheduled tiles
// render a gold "soon" badge with the relative start time instead of the
// red "Live" pill.

import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashRadii } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props {
  stream: Livestream;
  /** Render the scheduled start-time pill instead of the Live pill. */
  scheduled?: boolean;
}

/** "in 5m", "in 2h", "tomorrow" — short, scannable. Negative diffs (already
 *  past) render as "starting" since the cron should have flipped status by
 *  then but hasn't (acceptable race for v1). */
function formatTimeUntil(iso: string | null): string {
  if (!iso) return 'soon';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'starting';
  const min = Math.round(ms / 60000);
  if (min < 60) return `in ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `in ${hr}h`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'tomorrow';
  return `in ${day}d`;
}

export default function LiveStreamCard({ stream, scheduled = false }: Props) {
  const navigate = useNavigate();
  const cover = stream.cover_image_url ?? PLACEHOLDER_IMAGE_URL;
  const pill = scheduled
    ? { bg: inkstashColors.gold, text: '#16110E', label: formatTimeUntil(stream.scheduled_start_at) }
    : { bg: inkstashColors.live, text: '#fff', label: 'Live' };

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(`/live/${stream.id}`)}
      sx={{
        display: 'block', width: '100%', p: 0, textAlign: 'left',
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.bgElev,
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: inkstashColors.brand,
          boxShadow: '0 8px 20px rgba(22,17,14,0.12)',
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
              color: inkstashColors.muted,
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
          color: inkstashColors.ink,
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
