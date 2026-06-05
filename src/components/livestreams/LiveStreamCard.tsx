// src/components/livestreams/LiveStreamCard.tsx
//
// "Break card" — the canonical Live Now tile, per the Claude Design spec
// (docs/design-system/claude-design/styles.css :: .break-card / .break-thumb).
// Used by /live and the home Live Streams widget.
//
//   - 9:16 portrait card on an ink (#16110E) background
//   - Cover image fills the thumb (object-fit: cover); brand-tinted gradient
//     is the fallback when no cover is set
//   - Decorative layers: radial highlight at top + bottom darken via the
//     :before pseudo, and a halftone dot overlay via :after — both rendered
//     here as absolutely-positioned <Box>es
//   - Overlays inside the thumb: LIVE pill top-left (red, pulsing dot, mono),
//     "N watching" glass chip top-right (mono), then the info overlay at
//     the bottom: host row (initial-based gradient avatar + @username) then
//     a 2-line title in white
//
// `scheduled` swaps the LIVE pill for a glass countdown pill and hides the
// watching chip. The horizontal "Coming Up" sched-card layout is a separate
// component (TBD).

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import HostAvatar from './HostAvatar';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  /** Render the scheduled-start countdown pill instead of LIVE. */
  scheduled?: boolean;
  /** Reserved for parent-section theming. The thumb itself is unchanged in
   *  both modes; the title lives INSIDE the thumb now, so this prop is a
   *  no-op visually but kept to preserve the component API. */
  variant?: 'light' | 'dark';
}

/** Scheduled-start countdown: Xd Xh / Xh Xm / Xm Xs. Mirrors the prototype's
 *  formatCountdown in breaks-view.jsx. */
function formatCountdown(iso: string | null): string {
  if (!iso) return 'soon';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'starting';
  let s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600);  s -= h * 3600;
  const m = Math.floor(s / 60);    s -= m * 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
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

export default function LiveStreamCard({ stream, scheduled = false }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);

  // Tick the countdown every second for scheduled tiles — the format includes
  // seconds when under 1h, so a coarser interval would visibly stall.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!scheduled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [scheduled]);

  const liveCount = stream.viewer_peak || 0;
  const hostName = stream.host?.username ?? 'host';

  const goToStream = () => navigate(`/live/${stream.id}`);
  const goToHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stream.host?.username) navigate(`/@${stream.host.username}`);
  };

  return (
    <Box
      onClick={goToStream}
      sx={{
        position: 'relative',
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        bgcolor: inkstashColors.ink,
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.lg,
        },
        '&:active': { transform: 'translateY(-1px)' },
      }}
    >
      {/* Thumbnail surface (9:16). All overlays + decorative layers live
          inside this box, so the gradient + image always frame correctly. */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '9 / 16',
          overflow: 'hidden',
          color: '#fff',
          display: 'flex',
          alignItems: 'flex-end',
          background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
        }}
      >
        {/* Cover image — sits between the gradient and the decorative layers. */}
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
              zIndex: 0,
            }}
          />
        )}

        {/* ::before — radial top highlight + bottom darken gradient. Lifts
            white overlays off the background and grounds the info overlay. */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.14), transparent 50%), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)',
            zIndex: 1,
          }}
        />
        {/* ::after — halftone dot texture, overlay blend. Subtle, but it's the
            difference between "flat tile" and "designed surface". */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1.2px)',
            backgroundSize: '10px 10px',
            mixBlendMode: 'overlay',
            zIndex: 1,
          }}
        />

        {/* LIVE pill top-left (or countdown pill when scheduled) */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            px: scheduled ? '8px' : '8px',
            pr: scheduled ? '10px' : '10px',
            py: '4px',
            borderRadius: 999,
            bgcolor: scheduled ? 'rgba(0,0,0,0.55)' : inkstashColors.live,
            backdropFilter: scheduled ? 'blur(6px)' : undefined,
            WebkitBackdropFilter: scheduled ? 'blur(6px)' : undefined,
            border: scheduled ? '1px solid rgba(255,255,255,0.18)' : 'none',
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: scheduled ? '0.04em' : '0.08em',
            lineHeight: 1,
            boxShadow: scheduled ? 'none' : '0 2px 8px rgba(220,38,38,0.4)',
            textTransform: scheduled ? 'none' : 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {!scheduled && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#fff',
                animation: 'lsLivePulse 1.4s ease-in-out infinite',
                '@keyframes lsLivePulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.35 },
                },
              }}
            />
          )}
          {scheduled ? formatCountdown(stream.scheduled_start_at) : 'Live'}
        </Box>

        {/* Watching chip top-right (live only). Always visible for live
         *  streams now — was gated on liveCount>0 but viewers asked to
         *  see "0 watching" too so the badge reliably reads as a Live
         *  cue. viewer_peak isn't real-time; it updates when streams
         *  end + on heartbeat from join-livestream. */}
        {!scheduled && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: '10px',
              py: '5px',
              borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              fontFamily: inkstashFonts.mono,
            }}
          >
            <Box sx={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
              {liveCount}
            </Box>
            <Box sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
              watching
            </Box>
          </Box>
        )}

        {/* Info overlay at the bottom of the thumb — host row + title.
            Sits on top of the bottom-darken gradient from ::before. */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            padding: { xs: '12px 12px 14px', sm: '16px 16px 18px' },
          }}
        >
          {/* Host row */}
          <Box
            onClick={goToHost}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.9,
              fontFamily: inkstashFonts.mono,
              fontSize: { xs: 10.5, sm: 11.5 },
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
              mb: 1,
              cursor: 'pointer',
              transition: 'color 140ms ease',
              '&:hover': { color: '#fff' },
            }}
          >
            <HostAvatar
              username={stream.host?.username ?? null}
              avatarUrl={stream.host?.avatar_url ?? null}
              size={22}
              ring="soft"
            />
            <Box component="span">@{hostName}</Box>
          </Box>

          {/* Title */}
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: { xs: 13, sm: 14 },
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1.3,
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {stream.title}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
