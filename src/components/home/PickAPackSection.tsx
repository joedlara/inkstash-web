// src/components/home/PickAPackSection.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PackCard from './PackCard';
import { type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashShadows } from '../../theme/inkstashTokens';

type Tab = 'trending' | 'new' | 'premium';

interface PickAPackSectionProps {
  packs: Pack[];
}

export default function PickAPackSection({ packs }: PickAPackSectionProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('trending');

  const visible =
    tab === 'trending' ? packs.slice(0, 4) :
    tab === 'new'      ? packs.slice(4, 8) :
                         packs.filter(p => p.premium);

  return (
    <Box component="section" sx={{ mb: 5.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        mb: 2, gap: 2,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
      }}>
        <Box>
          <Box component="h2" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(22px, 3vw, 30px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>Pick a Pack</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Odds are transparent. Every card is real, graded, and shippable.
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken, borderRadius: 999,
        }}>
          {(['trending','new','premium'] as Tab[]).map(t => (
            <Box
              key={t}
              component="button"
              type="button"
              onClick={() => setTab(t)}
              sx={{
                padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                bgcolor: tab === t ? inkstashColors.bgElev : 'transparent',
                color: tab === t ? inkstashColors.ink : inkstashColors.ink2,
                boxShadow: tab === t ? inkstashShadows.sm : 'none',
                transition: 'all 140ms ease',
              }}
            >
              {t === 'trending' ? 'Trending' : t === 'new' ? 'New drops' : 'Premium'}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridAutoFlow: 'column',
        gridAutoColumns: { xs: '220px', md: '280px' },
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
        {visible.map(p => <PackCard key={p.id} pack={p} onClick={() => navigate(`/packs#${p.id}`)} />)}
      </Box>
    </Box>
  );
}
