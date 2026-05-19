// src/components/home/PackCard.tsx
import { Box } from '@mui/material';
import PackVisual from './PackVisual';
import RarityDots from './RarityDots';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface PackCardProps {
  pack: Pack;
  onClick?: () => void;
}

export default function PackCard({ pack, onClick }: PackCardProps) {
  const publisher = PUBLISHERS.find(p => p.id === pack.publisher);
  const filledDots = pack.premium ? 6 : pack.price >= 60 ? 5 : pack.price >= 30 ? 4 : 3;

  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: inkstashColors.borderStrong,
          '& .pv-thumb': { transform: 'rotate(-4deg) translateY(-6px) scale(1.04)' },
        },
      }}
    >
      <Box sx={{
        aspectRatio: '1 / 1',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box className="pv-thumb" sx={{
          width: '60%', height: '80%',
          transform: 'rotate(-4deg)',
          filter: 'drop-shadow(0 12px 24px rgba(22,17,14,0.25))',
          transition: 'transform 250ms ease',
        }}>
          <PackVisual pack={pack} />
        </Box>
      </Box>

      <Box sx={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 10.5,
            color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{publisher?.name}</Box>
          <RarityDots filled={filledDots} />
        </Box>
        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 19, lineHeight: 1.05,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
        }}>{pack.title}</Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 0.5 }}>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
            lineHeight: 1, color: inkstashColors.ink,
          }}>
            <Box component="span" sx={{
              fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 10.5,
              color: inkstashColors.muted, textTransform: 'uppercase', marginRight: 0.5,
            }}>FROM</Box>
            ${pack.price}
          </Box>
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 11,
            color: inkstashColors.muted, letterSpacing: '0.04em',
          }}>{pack.cards} cards · {pack.cardCount} left</Box>
        </Box>
      </Box>
    </Box>
  );
}
