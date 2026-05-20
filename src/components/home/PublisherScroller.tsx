// src/components/home/PublisherScroller.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PublisherCard from './PublisherCard';
import { PUBLISHERS } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

export default function PublisherScroller() {
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
          }}>Shop by Publisher</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Major imprints to small press — all sealed and vaulted
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/packs')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            transition: 'color 120ms ease',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See all publishers →
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: '220px', md: '260px' },
        gap: 2,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        paddingBottom: 1,
        '& > *': { scrollSnapAlign: 'start' },
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': {
          background: inkstashColors.borderStrong, borderRadius: 999,
        },
      }}>
        {PUBLISHERS.map(p => (
          <PublisherCard
            key={p.id}
            publisher={p}
            onClick={() => navigate('/packs')}
          />
        ))}
      </Box>
    </Box>
  );
}
