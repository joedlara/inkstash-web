// src/components/listings/ListingFeedCard.tsx
import { Box, Chip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Vault } from 'lucide-react';
import type { MarketplaceFeedCard } from '../../api/marketplace';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface Props {
  card: MarketplaceFeedCard;
}

export default function ListingFeedCard({ card }: Props) {
  const isAuction = card.source === 'auction';

  return (
    <Box
      component={RouterLink}
      to={`/item/${card.id}`}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        '&:hover': {
          borderColor: inkstashColors.borderStrong,
          transform: 'translateY(-2px)',
          boxShadow: inkstashShadows.md,
        },
      }}
    >
      {/* Cover */}
      <Box
        sx={{
          aspectRatio: '3 / 4',
          bgcolor: inkstashColors.bgSunken,
          backgroundImage: card.cover_url ? `url(${card.cover_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {card.is_vault_item && (
          <Chip
            icon={<Vault size={11} style={{ marginLeft: 6 }} />}
            label="Vault item"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              height: 20,
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
        )}
        {isAuction && (
          <Chip
            label="Auction"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: inkstashColors.gold,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              height: 20,
            }}
          />
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 1.5 }}>
        {card.comic_publisher && (
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              color: inkstashColors.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {card.comic_publisher}
          </Typography>
        )}

        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            color: inkstashColors.ink,
            lineHeight: 1.25,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mb: 1,
            minHeight: '2.5em',
          }}
        >
          {card.title}
          {card.comic_issue_number ? ` #${card.comic_issue_number}` : ''}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              color: inkstashColors.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {card.display_price_label}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 800,
              fontSize: 16,
              color: inkstashColors.ink,
            }}
          >
            ${Number(card.price).toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
