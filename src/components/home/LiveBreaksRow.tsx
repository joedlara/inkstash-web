import { Link, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import type { LiveStream } from '../../api/home';
import { colors, easing, fonts } from '../../theme/conceptCTokens';

interface LiveBreaksRowProps {
  streams: LiveStream[];
  loading: boolean;
  error: boolean;
}

const GRADIENTS = [
  'linear-gradient(165deg,#1a4fc4,#0a1e54)',
  'linear-gradient(165deg,#e82c2c,#5a0606)',
  'linear-gradient(165deg,#0a0a0a,#3a3a3a)',
  'linear-gradient(165deg,#f59e0b,#9a4d04)',
];

export default function LiveBreaksRow({ streams, loading, error }: LiveBreaksRowProps) {
  const navigate = useNavigate();

  return (
    <Box component="section" sx={{ mt: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Box component="h2" sx={{
          fontFamily: fonts.display, fontSize: '1.5rem', fontWeight: 800,
          letterSpacing: '-0.02em', color: colors.ink, m: 0,
        }}>Live Breaks</Box>
        <Box component={Link} to="/live" sx={{
          color: colors.inkSoft, textDecoration: 'none', fontSize: '0.84rem', fontWeight: 600,
          transition: `color 180ms ${easing.out}`,
          '&:hover': { color: colors.accent },
        }}>See all streams →</Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.75 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ bgcolor: colors.bgElev, border: `1px solid ${colors.line}`, borderRadius: '12px', height: 220 }} />
        ))}

        {!loading && !error && streams.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', color: colors.inkMute, py: 4 }}>
            No live streams right now — check back soon.
          </Box>
        )}

        {!loading && streams.slice(0, 4).map((s, i) => (
          <Box
            key={s.id}
            onClick={() => navigate(`/live/${s.id}`)}
            sx={{
              bgcolor: colors.bgElev, border: `1px solid ${colors.line}`,
              borderRadius: '12px', overflow: 'hidden',
              cursor: 'pointer',
              transition: `transform 220ms ${easing.out}, border-color 220ms ${easing.out}, box-shadow 220ms ${easing.out}`,
              '&:hover': { transform: 'translateY(-3px)', borderColor: colors.lineStrong, boxShadow: '0 14px 36px rgba(20,17,13,0.08)' },
            }}
          >
            <Box sx={{
              aspectRatio: '9 / 16', maxHeight: 200,
              background: GRADIENTS[i % GRADIENTS.length],
              position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              padding: 1.25, color: '#fff',
            }}>
              {s.is_live && (
                <Box sx={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  bgcolor: colors.accent, color: '#fff',
                  px: 1, py: 0.3, borderRadius: '999px',
                  fontFamily: fonts.mono, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
                }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#fff', animation: 'cd-pulse 1.6s ease-in-out infinite' }} />
                  LIVE
                </Box>
              )}
              <Box sx={{
                alignSelf: 'flex-end',
                bgcolor: 'rgba(0,0,0,0.5)', fontFamily: fonts.mono,
                fontSize: '0.72rem', fontWeight: 700,
                px: 0.85, py: 0.3, borderRadius: '4px',
              }}>{s.current_viewers.toLocaleString()} watching</Box>
            </Box>
            <Box sx={{ padding: 1.5 }}>
              <Box sx={{ color: colors.ink, fontWeight: 700, fontSize: '0.86rem', lineHeight: 1.3, mb: 0.5 }}>{s.title}</Box>
              <Box sx={{ color: colors.inkMute, fontFamily: fonts.mono, fontSize: '0.7rem' }}>
                @{s.seller_username || 'unknown'}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
