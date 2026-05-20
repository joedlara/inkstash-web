// src/components/home/PackVisual.tsx
import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';

interface PackVisualProps {
  pack: Pack;
  big?: boolean;
}

export default function PackVisual({ pack, big = false }: PackVisualProps) {
  const titleParts = pack.title.split(':');
  const mainTitle = titleParts[titleParts.length - 1].trim();
  const publisher = PUBLISHERS.find(p => p.id === pack.publisher);
  const fontSize = big ? 36 : 24;

  return (
    <Box sx={{
      position: 'relative',
      width: '100%', height: '100%',
      borderRadius: '10px',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg, ${pack.gradient[0]}, ${pack.gradient[1]})`,
      border: '1px solid rgba(0,0,0,0.2)',
      '&::before': {
        content: '""',
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.25), transparent 50%),' +
          'radial-gradient(60% 40% at 50% 110%, rgba(0,0,0,0.4), transparent 60%)',
        pointerEvents: 'none',
      },
      '&::after': {
        content: '""',
        position: 'absolute', top: '12%', left: 0, right: 0, height: '4px',
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0 6px, transparent 6px 10px)',
        opacity: 0.5,
      },
    }}>
      {/* Publisher */}
      <Box sx={{
        position: 'absolute', top: '10%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 11,
        color: '#fff', letterSpacing: '0.15em', textTransform: 'uppercase',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        zIndex: 2,
      }}>
        {publisher?.name}
      </Box>

      {/* Title */}
      <Box sx={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        transform: 'translateY(-50%)',
        textAlign: 'center',
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize,
        color: '#fff', letterSpacing: '0.01em', textTransform: 'uppercase',
        lineHeight: 0.9, textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        padding: '0 12px',
        zIndex: 2,
      }}>
        {mainTitle}
      </Box>

      {/* Seal */}
      <Box sx={{
        position: 'absolute', bottom: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 32, height: 32, borderRadius: '50%',
        bgcolor: inkstashColors.gold,
        border: '2px solid rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 12,
        zIndex: 2,
      }}>
        {pack.seal}
      </Box>

      {/* Foot label */}
      <Box sx={{
        position: 'absolute', bottom: '8%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: inkstashFonts.mono, fontSize: 9,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: '0.15em', textTransform: 'uppercase',
        zIndex: 2,
      }}>
        {pack.footLabel}
      </Box>
    </Box>
  );
}
