// src/components/livestreams/LiveStreamCard.tsx
//
// Tile for the /live grid. Click navigates to /live/:id.

import { Box, Typography, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props { stream: Livestream; }

export default function LiveStreamCard({ stream }: Props) {
  const navigate = useNavigate();
  const cover = stream.cover_image_url ?? PLACEHOLDER_IMAGE_URL;
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
        transition: 'transform 160ms ease, border-color 160ms ease',
        '&:hover': { transform: 'translateY(-3px)', borderColor: inkstashColors.brand },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%', aspectRatio: '9 / 16',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}
      >
        <Box sx={{
          position: 'absolute', top: 8, left: 8, px: 1, py: 0.3,
          borderRadius: 999, bgcolor: inkstashColors.live, color: '#fff',
          fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Live
        </Box>
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Avatar src={stream.host?.avatar_url ?? undefined} sx={{ width: 20, height: 20 }} />
          <Typography sx={{ fontSize: 11, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            @{stream.host?.username ?? 'host'}
          </Typography>
        </Box>
        <Typography sx={{
          fontFamily: inkstashFonts.display, fontWeight: 700, fontSize: 14,
          color: inkstashColors.ink, lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {stream.title}
        </Typography>
      </Box>
    </Box>
  );
}
