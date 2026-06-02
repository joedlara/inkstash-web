// src/components/drops/DropCard.tsx
//
// Tile used in the /drops grid. State-aware:
//   upcoming → countdown next to price
//   live     → "N / M sold" + progress bar
//   sold_out → grey "SOLD OUT" stamp over the cover
//
// Click → /drop/:id. The detail page is where buying happens.

import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Drop } from '../../api/drops';
import DropCountdown from './DropCountdown';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';
import PublisherBadge from '../listings/PublisherBadge';

interface Props {
  drop: Drop;
}

export default function DropCard({ drop }: Props) {
  const navigate = useNavigate();
  const cover = drop.hero_image_url ?? drop.cover_url ?? PLACEHOLDER_IMAGE_URL;
  const isLive = drop.state === 'live';
  const isUpcoming = drop.state === 'upcoming';
  const isSoldOut = drop.state === 'sold_out';

  const soldPct = drop.quantity_total > 0
    ? Math.min(100, Math.round((drop.quantity_sold / drop.quantity_total) * 100))
    : 0;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => navigate(`/drop/${drop.id}`)}
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        p: 0,
        textAlign: 'left',
        border: `1.5px solid ${isLive ? inkstashColors.brand : inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.bgElev,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: inkstashColors.brand,
          boxShadow: inkstashShadows.md,
        },
        '&:active': { transform: 'scale(0.98)' },
        opacity: isSoldOut ? 0.7 : 1,
      }}
    >
      <Box
        sx={{
          width: '100%',
          aspectRatio: '4 / 3',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          bgcolor: inkstashColors.bgSunken,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            px: 1,
            py: 0.4,
            borderRadius: 999,
            bgcolor: isLive ? inkstashColors.brand : isUpcoming ? inkstashColors.ink : inkstashColors.muted,
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {isLive && 'Live now'}
          {isUpcoming && 'Soon'}
          {isSoldOut && 'Sold out'}
        </Box>
        {isSoldOut && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.45)',
            }}
          >
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 28,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                transform: 'rotate(-6deg)',
                border: '3px solid #fff',
                px: 2,
                py: 0.5,
              }}
            >
              Sold out
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 2 } }}>
        {drop.linked_publisher && (
          <Box sx={{ mb: 0.75 }}>
            <PublisherBadge publisher={drop.linked_publisher} />
          </Box>
        )}
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 15,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: 36,
            mb: 0.75,
          }}
        >
          {drop.title ?? 'Untitled drop'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 18,
              color: inkstashColors.ink,
            }}
          >
            ${Number(drop.price).toFixed(2)}
          </Typography>
          {isUpcoming && <DropCountdown targetDate={drop.go_live_at} compact />}
          {isLive && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 11,
                fontWeight: 700,
                color: inkstashColors.brand,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {drop.quantity_sold}/{drop.quantity_total}
            </Typography>
          )}
        </Box>

        {isLive && (
          <Box
            sx={{
              mt: 1,
              height: 4,
              bgcolor: inkstashColors.bgSunken,
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${soldPct}%`,
                height: '100%',
                bgcolor: inkstashColors.brand,
                transition: 'width 400ms ease',
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
