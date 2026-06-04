// src/components/livestreams/MomentumCard.tsx
//
// "Momentum" card — used only inside FeaturedBreaksBand. Different from
// LiveStreamCard:
//   - Host row sits ABOVE the thumb (not inside it)
//   - Thumb is 4:5 (not 9:16)
//   - Title + tag row live BELOW the thumb in cream text on the band's
//     warm-charcoal background
//   - LIVE pill on the thumb reads "Live · <viewers>" together
//
// Per docs/design-system/claude-design/live_breaks/breaks.css :: .mcard

import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  /** 'dark' (default) for the Featured band; 'light' for the cream Explore
   *  More rail. Switches host-name color, title color, and tag-row muted
   *  color so the card legibility holds against either background. */
  variant?: 'dark' | 'light';
}

const TILE_PALETTES: Array<{ from: string; to: string }> = [
  { from: '#1F3A6E', to: '#0E1D3E' },
  { from: '#C2362F', to: '#5C1116' },
  { from: '#B8893A', to: '#6B4E1E' },
  { from: '#3F6F4A', to: '#1B3024' },
  { from: '#7A1A21', to: '#2E0608' },
  { from: '#5A2A82', to: '#2A0F47' },
  { from: '#A14613', to: '#4A1F08' },
];
function paletteFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return TILE_PALETTES[Math.abs(hash) % TILE_PALETTES.length];
}

export default function MomentumCard({ stream, variant = 'dark' }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);
  const hostName = stream.host?.username ?? 'host';
  const initial = hostName.charAt(0).toUpperCase();
  const viewers = stream.viewer_peak || 0;
  const isLight = variant === 'light';

  // Per-variant text colors.
  const hostColor = isLight ? inkstashColors.ink2 : '#EDE3D6';
  const titleColor = isLight ? inkstashColors.ink : '#FAF7F2';
  const tagMutedColor = isLight ? inkstashColors.muted : '#8A7F73';

  return (
    <Box
      onClick={() => navigate(`/live/${stream.id}`)}
      sx={{ cursor: 'pointer' }}
    >
      {/* Host row ABOVE the thumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 11,
            flexShrink: 0,
          }}
        >
          {initial}
        </Box>
        <Typography
          sx={{
            color: hostColor,
            fontFamily: inkstashFonts.ui,
            fontSize: 13,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          @{hostName}
        </Typography>
      </Box>

      {/* 4:5 thumb */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 5',
          borderRadius: inkstashRadii.lg,
          overflow: 'hidden',
          mb: 1.5,
          transition: 'transform 140ms ease, box-shadow 140ms ease',
          background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 16px 30px -12px rgba(0,0,0,0.6)',
          },
        }}
      >
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
        {/* Halftone overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.13) 1px, transparent 1.4px)',
            backgroundSize: '8px 8px',
            zIndex: 1,
          }}
        />
        {/* "Live · N" pill (top-left, single chip — different from break-card) */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            px: '8px',
            py: '4px',
            borderRadius: 1,
            bgcolor: inkstashColors.live,
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: '#fff',
              animation: 'mcLivePulse 1.4s ease-in-out infinite',
              '@keyframes mcLivePulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.35 },
              },
            }}
          />
          Live · {viewers.toLocaleString()}
        </Box>
      </Box>

      {/* Title */}
      <Typography
        sx={{
          color: titleColor,
          fontFamily: inkstashFonts.ui,
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.3,
          mb: 0.75,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {stream.title}
      </Typography>

      {/* Tag row — host's category lives in stream metadata later; for now
          show a single accent tag derived from the host name length to give
          some variety. When a real `category` field lands, wire that here. */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          fontFamily: inkstashFonts.ui,
          fontSize: 12,
          color: tagMutedColor,
        }}
      >
        <Box component="span" sx={{ color: isLight ? inkstashColors.brand : '#E07A82', fontWeight: 600 }}>
          Featured
        </Box>
        <Box component="span">·</Box>
        <Box component="span">{viewers.toLocaleString()} watching</Box>
      </Box>
    </Box>
  );
}
