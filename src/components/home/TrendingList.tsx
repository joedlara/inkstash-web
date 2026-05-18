import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { TrendingAuction } from '../../api/home';
import { colors, easing, fonts } from '../../theme/conceptCTokens';

interface TrendingListProps {
  items: TrendingAuction[];
  loading: boolean;
  error: boolean;
}

export default function TrendingList({ items, loading, error }: TrendingListProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: colors.ink, m: 0,
        }}>Trending This Week</Box>
        <Box component={Link} to="/marketplace" sx={{
          color: colors.inkSoft, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: colors.accent },
        }}>See marketplace →</Box>
      </Box>

      <Box sx={{
        bgcolor: colors.bgElev, border: `1px solid ${colors.line}`,
        borderRadius: '12px', overflow: 'hidden',
      }}>
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ height: 56, borderBottom: i < 4 ? `1px solid ${colors.line}` : 'none' }} />
        ))}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ textAlign: 'center', color: colors.inkMute, py: 4 }}>
            No trending data yet.
          </Box>
        )}

        {!loading && items.slice(0, 6).map((item, idx) => {
          const visibleCount = Math.min(items.length, 6);
          return (
            <Box
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                padding: '14px 18px',
                cursor: 'pointer',
                borderBottom: idx < visibleCount - 1 ? `1px solid ${colors.line}` : 'none',
                transition: `background 180ms ${easing.out}`,
                '&:hover': { background: colors.bgSub },
              }}
            >
              <Box sx={{
                fontFamily: fonts.mono, fontSize: '0.72rem', fontWeight: 700,
                color: colors.inkMute, width: 24,
              }}>{String(idx + 1).padStart(2, '0')}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{
                  color: colors.ink, fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{item.title}</Box>
                <Box sx={{ color: colors.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                  {item.bid_count} bids · @{item.seller_username || 'unknown'}
                </Box>
              </Box>
              <Box sx={{
                fontFamily: fonts.mono, fontWeight: 800, fontSize: '0.92rem',
                color: colors.accent,
              }}>${item.current_bid.toLocaleString()}</Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
