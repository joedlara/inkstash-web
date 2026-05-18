import { Link } from 'react-router-dom';
import { Box } from '@mui/material';
import type { FeaturedAuction } from '../../api/home';
import { colors, easing, fonts } from '../../theme/conceptCTokens';

interface JustPulledGridProps {
  items: FeaturedAuction[];
  loading: boolean;
  error: boolean;
}

const GRADIENTS = [
  'linear-gradient(160deg,#e82c2c,#5a0606)',
  'linear-gradient(160deg,#1a4fc4,#0a1e54)',
  'linear-gradient(160deg,#f59e0b,#9a4d04)',
  'linear-gradient(160deg,#0a0a0a,#3a3a3a)',
];

export default function JustPulledGrid({ items, loading, error }: JustPulledGridProps) {
  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: colors.ink, m: 0,
        }}>Just Pulled</Box>
        <Box component={Link} to="/packs" sx={{
          color: colors.inkSoft, textDecoration: 'none',
          fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: colors.accent },
        }}>Grab a pack →</Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.75 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} data-testid="pull-skeleton" sx={{
            bgcolor: colors.bgElev, border: `1px solid ${colors.line}`,
            borderRadius: '12px', padding: 1.75, height: 240,
          }} />
        ))}

        {!loading && !error && items.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', color: colors.inkMute, py: 4 }}>
            No recent pulls yet — open a pack to start your collection.
          </Box>
        )}

        {!loading && items.slice(0, 4).map((item, i) => (
          <Box key={item.id} sx={{
            bgcolor: colors.bgElev, border: `1px solid ${colors.line}`,
            borderRadius: '12px', padding: 1.75,
            display: 'flex', flexDirection: 'column', gap: 1.5,
            cursor: 'pointer',
            transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
            '&:hover': { transform: 'translateY(-3px)', borderColor: colors.lineStrong, boxShadow: '0 14px 36px rgba(20,17,13,0.08)' },
            '&:active': { transform: 'translateY(-1px) scale(0.99)' },
          }}>
            <Box sx={{
              aspectRatio: '0.78', borderRadius: '8px', padding: 1.5,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              color: '#fff', position: 'relative', overflow: 'hidden',
              background: GRADIENTS[i % GRADIENTS.length],
              '&::after': {
                content: '""', position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), transparent 55%)',
              },
            }}>
              <Box sx={{
                alignSelf: 'flex-end',
                fontFamily: fonts.mono, fontWeight: 800, fontSize: '0.84rem',
                bgcolor: 'rgba(0,0,0,0.45)', px: 1, py: 0.4, borderRadius: '4px',
              }}>{item.condition || '9.8'}</Box>
              <Box sx={{
                fontFamily: fonts.display, fontWeight: 900, fontSize: '1.4rem',
                letterSpacing: '-0.025em', textShadow: '0 2px 6px rgba(0,0,0,0.5)',
              }}>{item.title.split(' ').slice(0, 3).join(' ')}</Box>
            </Box>
            <Box>
              <Box sx={{ color: colors.ink, fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3, mb: 0.5 }}>{item.title}</Box>
              <Box sx={{ color: colors.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem', letterSpacing: '0.02em' }}>
                {item.condition} · ${item.current_bid}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
