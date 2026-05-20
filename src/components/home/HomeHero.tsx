// src/components/home/HomeHero.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import PackVisual from './PackVisual';
import { PUBLISHERS, type Pack } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface HomeHeroProps {
  packs: Pack[]; // expect 3 heroes (passed in order)
}

export default function HomeHero({ packs }: HomeHeroProps) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const hero = packs[idx];
  const publisher = PUBLISHERS.find(p => p.id === hero.publisher);
  const titleSuffix = hero.title.split(':').slice(-1)[0].trim();

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Box sx={{
        position: 'relative',
        borderRadius: inkstashRadii.xl,
        overflow: 'hidden',
        background:
          `radial-gradient(900px 500px at 88% 50%, rgba(161,35,44,0.13), transparent 60%),` +
          `linear-gradient(180deg, #FFFCF6 0%, #FAF1E5 100%)`,
        border: `1px solid ${inkstashColors.border}`,
        padding: { xs: '32px 28px', md: '44px 48px' },
        minHeight: { xs: 0, md: 380 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
        gap: 4,
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(22,17,14,0.06) 1px, transparent 1.3px)',
          backgroundSize: '8px 8px',
          maskImage: 'linear-gradient(135deg, transparent 50%, black 100%)',
          WebkitMaskImage: 'linear-gradient(135deg, transparent 50%, black 100%)',
          pointerEvents: 'none',
        },
      }}>
        {/* Left: copy */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            fontFamily: inkstashFonts.mono, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: inkstashColors.brand, fontWeight: 600, mb: 2.25,
          }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: inkstashColors.brand,
              animation: 'inkstashPulse 2s infinite',
            }} />
            {publisher?.name} · This Week
          </Box>

          <Box component="h1" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 900,
            fontSize: 'clamp(40px, 5.4vw, 72px)', lineHeight: 0.95,
            letterSpacing: '-0.005em', m: 0, mb: 2.75,
            textTransform: 'uppercase', color: inkstashColors.ink,
          }}>
            Rip the <Box component="span" sx={{ color: inkstashColors.brand }}>comic vault.</Box>
          </Box>

          <Box component="p" sx={{
            fontSize: 'clamp(14px, 1.6vw, 16px)',
            color: inkstashColors.ink2,
            maxWidth: 460, m: 0, mb: 3.5, lineHeight: 1.5,
          }}>
            Sealed mystery packs from indie presses and major publishers. Transparent odds. Real graded slabs. The rush of the rip — straight to your vault.
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/packs')}
              sx={{
                bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
                padding: '14px 22px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14.5,
                cursor: 'pointer',
                boxShadow: inkstashShadows.sm,
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Rip {titleSuffix} · ${hero.price}
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate(`/packs#${hero.id}`)}
              sx={{
                bgcolor: 'transparent', color: inkstashColors.ink,
                border: `1px solid ${inkstashColors.borderStrong}`,
                padding: '14px 22px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 14.5,
                cursor: 'pointer',
                transition: 'background 140ms ease, border-color 140ms ease',
                '&:hover': { bgcolor: inkstashColors.bgSunken },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              See odds
            </Box>
          </Box>

          <Box sx={{
            display: 'flex', gap: 3.5, mt: 3.5, pt: 2.75,
            borderTop: `1px solid ${inkstashColors.border}`,
          }}>
            {[
              { v: '128,402', l: 'Packs Ripped' },
              { v: '$4.2M',   l: 'In Vault' },
              { v: '24/7',    l: 'Live Ripping' },
            ].map(stat => (
              <Box key={stat.l} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{
                  fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 28,
                  lineHeight: 1, color: inkstashColors.ink,
                }}>{stat.v}</Box>
                <Box sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 10.5,
                  textTransform: 'uppercase', color: inkstashColors.muted,
                  letterSpacing: '0.08em', mt: 0.5,
                }}>{stat.l}</Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: pack stage */}
        <Box sx={{
          position: 'relative',
          height: { xs: 280, md: 380 },
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Two card placeholders fanned behind */}
          <Box sx={{
            position: 'absolute',
            width: 200, height: 280, borderRadius: '12px',
            border: `1px solid ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgElev,
            boxShadow: inkstashShadows.md,
            transform: 'translate(-115px, -10px) rotate(-12deg)',
          }} />
          <Box sx={{
            position: 'absolute',
            width: 200, height: 280, borderRadius: '12px',
            border: `1px solid ${inkstashColors.border}`,
            bgcolor: inkstashColors.bgElev,
            boxShadow: inkstashShadows.md,
            transform: 'translate(115px, -10px) rotate(12deg)',
          }} />
          {/* Main pack */}
          <Box sx={{
            position: 'relative', zIndex: 2,
            width: 230, height: 320,
            borderRadius: '14px',
            boxShadow: '0 30px 60px -20px rgba(22,17,14,0.4), 0 0 0 1px rgba(0,0,0,0.05)',
            transform: 'rotate(-4deg)',
            animation: 'inkstashFloaty 5s ease-in-out infinite',
            cursor: 'pointer',
          }}>
            <PackVisual pack={hero} big />
          </Box>
        </Box>

        {/* Carousel dots */}
        <Box sx={{
          position: 'absolute', bottom: 22, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', gap: 0.75,
          zIndex: 3,
        }}>
          {packs.map((_, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)}
              sx={{
                width: i === idx ? 22 : 6, height: 6,
                borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                bgcolor: i === idx ? inkstashColors.ink : inkstashColors.muted2,
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </Box>
      </Box>

      <style>{`
        @keyframes inkstashPulse {
          0% { box-shadow: 0 0 0 0 rgba(161,35,44,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(161,35,44,0); }
          100% { box-shadow: 0 0 0 0 rgba(161,35,44,0); }
        }
        @keyframes inkstashFloaty {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50% { transform: rotate(-4deg) translateY(-8px); }
        }
      `}</style>
    </Box>
  );
}
