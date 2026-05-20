// src/components/home/TrendingList.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { TRENDING_WEEK, type TrendingItem } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface TrendingListProps {
  items?: TrendingItem[];
}

export default function TrendingList({ items = TRENDING_WEEK }: TrendingListProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Trending This Week</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Hot single-card auctions across the community
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/marketplace')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See marketplace →
        </Box>
      </Box>

      <Box sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
      }}>
        {items.map((t, i) => (
          <Box
            key={t.rank}
            onClick={() => navigate('/marketplace')}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '36px 1fr auto', md: '56px 1fr auto' },
              alignItems: 'center',
              gap: { xs: 1.5, md: 2.25 },
              padding: { xs: '14px 16px', md: '18px 24px' },
              borderBottom: i < items.length - 1 ? `1px solid ${inkstashColors.border}` : 'none',
              cursor: 'pointer',
              transition: 'background 120ms ease',
              '&:hover': { background: inkstashColors.bgSunken },
            }}
          >
            <Box sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: { xs: 11, md: 12 },
              color: inkstashColors.muted2,
              letterSpacing: '0.06em', fontWeight: 500,
            }}>{String(t.rank).padStart(2, '0')}</Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{
                fontWeight: 600,
                fontSize: { xs: 13.5, md: 14.5 },
                color: inkstashColors.ink, lineHeight: 1.25, mb: 0.4,
                textWrap: 'balance' as unknown as 'normal',
              }}>{t.title}</Box>
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11.5,
                color: inkstashColors.muted,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
              }}>
                <Box component="span">{t.bids} bids</Box>
                <Box component="span" sx={{ color: inkstashColors.muted2 }}>·</Box>
                <Box component="span">{t.seller}</Box>
              </Box>
            </Box>

            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: { xs: 17, md: 20 },
              color: inkstashColors.brand,
              letterSpacing: '0.005em', whiteSpace: 'nowrap',
            }}>${t.price.toLocaleString()}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
