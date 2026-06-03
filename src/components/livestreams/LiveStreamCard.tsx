// src/components/livestreams/LiveStreamCard.tsx
//
// Tile used by /live sections. Layout:
//   - Tall thumbnail card (9:16 ratio). Cover image fills it; if no
//     cover, falls back to a brand-tinted gradient. Soft dark gradient
//     fade rises from the bottom for legibility on the LIVE / host /
//     viewer-count overlays.
//   - LIVE pill top-left, viewer count top-right, host pill bottom-left
//     of the thumbnail — all on glass backdrops over the gradient fade.
//   - Below the thumbnail: title typography (2-line clamp). This is
//     where stream titles live now — not overlaid on the cover.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  /** Render the scheduled start-time pill instead of the Live pill. */
  scheduled?: boolean;
  /** Inverts the title color (used when the tile sits on a charcoal
   *  section background like Featured streams). The thumbnail itself
   *  stays the same in both contexts. */
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

/** Brand-tinted gradient fallback when no cover image is set. Deterministic
 *  per stream id so the same stream always renders the same color. */
const TILE_PALETTES: Array<{ from: string; to: string }> = [
  { from: '#1F3A6E', to: '#0E1D3E' },
  { from: '#C2362F', to: '#5C1116' },
  { from: '#B8893A', to: '#6B4E1E' },
  { from: '#3F6F4A', to: '#1B3024' },
  { from: '#7A1A21', to: '#2E0608' },
  { from: '#16110E', to: '#000000' },
  { from: '#5A2A82', to: '#2A0F47' },
  { from: '#A14613', to: '#4A1F08' },
];

function paletteFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return TILE_PALETTES[Math.abs(hash) % TILE_PALETTES.length];
}

export default function LiveStreamCard({ stream, scheduled = false, variant = 'light' }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);

  // Tick the countdown every 30s for scheduled tiles. Minutes only.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [scheduled]);

  const liveCount = stream.viewer_peak || 0;
  const titleColor = variant === 'dark' ? '#fff' : inkstashColors.ink;

  const goToStream = () => navigate(`/live/${stream.id}`);
  const goToHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream.host?.username) navigate(`/@${stream.host.username}`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Thumbnail (taller, 9:16 portrait). Cover image is the centerpiece;
          gradient fallback when no cover. */}
      <Box
        onClick={goToStream}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9 / 16',
          borderRadius: 2.5,
          overflow: 'hidden',
          cursor: 'pointer',
          // Brand-tinted gradient sits underneath as the fallback.
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
        {/* Cover image fills the thumbnail when present. Zooms inside the
            fixed frame on hover so the thumbnail itself doesn't grow. */}
        {stream.cover_image_url && (
          <Box
            component="img"
            src={stream.cover_image_url}
            alt={stream.title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 300ms ease',
              '.MuiBox-root:hover > &': { transform: 'scale(1.04)' },
            }}
          />
        )}

        {/* Bottom-up dark gradient fade for legibility behind the overlays */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top-left: LIVE / countdown pill */}
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

        {/* Top-right: viewer count (live tiles only) */}
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

        {/* Bottom-left: host pill on the gradient fade */}
        <Box
          onClick={goToHost}
          sx={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            pl: 0.4,
            pr: 1,
            py: 0.35,
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
              width: 20,
              height: 20,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid rgba(255,255,255,0.4)',
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 11.5,
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

      {/* Title below the thumbnail (home-page layout) */}
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
