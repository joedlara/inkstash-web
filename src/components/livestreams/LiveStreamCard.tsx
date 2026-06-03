// src/components/livestreams/LiveStreamCard.tsx
//
// Tile used by /live sections. Bold solid-color art tile with the title
// overlaid in display type, viewer count top-right, host pill at bottom.
// Matches the home "LIVE BREAKS" aesthetic — no photo thumbnail; the
// brand-tinted gradient IS the cover.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  /** Render the scheduled start-time pill instead of the Live pill. */
  scheduled?: boolean;
  /** Reserved for any chrome that wraps the tile (host pill is always
   *  dark since the tile itself is always a vivid color). */
  variant?: 'light' | 'dark';
}

/** Scheduled-start countdown: Xd Xh Xm. */
function formatTimeUntil(iso: string | null): string {
  if (!iso) return 'soon';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'starting';
  const totalMin = Math.max(1, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}

/** Brand-tinted gradient palette. Deterministic per stream so the same
 *  stream always gets the same color (no churn between renders). */
const TILE_PALETTES: Array<{ from: string; to: string }> = [
  { from: '#1F3A6E', to: '#0E1D3E' }, // navy
  { from: '#C2362F', to: '#5C1116' }, // crimson
  { from: '#B8893A', to: '#6B4E1E' }, // gold
  { from: '#3F6F4A', to: '#1B3024' }, // forest
  { from: '#7A1A21', to: '#2E0608' }, // brand-deep
  { from: '#16110E', to: '#000000' }, // ink
  { from: '#5A2A82', to: '#2A0F47' }, // purple
  { from: '#A14613', to: '#4A1F08' }, // burnt orange
];

function paletteFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return TILE_PALETTES[Math.abs(hash) % TILE_PALETTES.length];
}

export default function LiveStreamCard({ stream, scheduled = false }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);

  // Tick the countdown once a minute for scheduled tiles. Minutes only
  // means we don't need a per-second re-render.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [scheduled]);

  const liveCount = stream.viewer_peak || 0;

  const goToStream = () => navigate(`/live/${stream.id}`);
  const goToHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream.host?.username) navigate(`/@${stream.host.username}`);
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={goToStream}
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        p: 0,
        border: 'none',
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        aspectRatio: '3 / 4',
        background: `linear-gradient(155deg, ${palette.from} 0%, ${palette.to} 100%)`,
        boxShadow: '0 6px 18px rgba(22,17,14,0.18)',
        transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 28px rgba(22,17,14,0.28)',
        },
        '&:active': { transform: 'translateY(-1px)' },
      }}
    >
      {/* If the stream has a cover image, layer it under a darkening
          gradient so the title overlay stays legible. No image = the
          solid gradient alone. */}
      {stream.cover_image_url && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${stream.cover_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.45,
          }}
        />
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Top-left: LIVE pill (live tiles) or countdown pill (scheduled) */}
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
          bgcolor: scheduled ? 'rgba(0,0,0,0.55)' : inkstashColors.live,
          backdropFilter: scheduled ? 'blur(10px)' : undefined,
          border: scheduled ? '1px solid rgba(255,255,255,0.18)' : undefined,
          color: '#fff',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '-0.005em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      >
        {!scheduled && (
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: '#fff',
              animation: 'lscPulse 1.5s ease-in-out infinite',
              '@keyframes lscPulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
        )}
        {scheduled ? formatTimeUntil(stream.scheduled_start_at) : 'Live'}
      </Box>

      {/* Top-right: viewer count (live tiles only, when known) */}
      {!scheduled && liveCount > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            px: 0.85,
            py: 0.4,
            borderRadius: 1,
            bgcolor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '-0.005em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {liveCount}
        </Box>
      )}

      {/* Center: big title in display type */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.5,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: { xs: 18, sm: 20, md: 22 },
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
            textTransform: 'uppercase',
            textShadow: '0 2px 12px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {stream.title}
        </Typography>
      </Box>

      {/* Bottom: host pill (avatar + @username) on a glass backdrop */}
      <Box
        onClick={goToHost}
        sx={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          pl: 0.5,
          pr: 1,
          py: 0.4,
          borderRadius: 999,
          bgcolor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          maxWidth: 'calc(100% - 20px)',
          transition: 'background-color 160ms ease',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
        }}
      >
        <Box
          component="img"
          src={stream.host?.avatar_url || 'https://www.pikpng.com/pngl/b/80-805068_my-profile-icon-blank-profile-picture-circle-clipart.png'}
          alt={stream.host?.username ?? 'host'}
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1.5px solid rgba(255,255,255,0.4)',
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          @{stream.host?.username ?? 'host'}
        </Typography>
      </Box>
    </Box>
  );
}
