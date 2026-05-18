import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { colors, easing, fonts } from '../../theme/conceptCTokens';

interface Countdown { h: string; m: string; s: string; }
interface HeroCarouselProps { countdown: Countdown; }

type SlabSpec = { grade: string; cover: string; issue: string; gradient: string; gold?: boolean };

type Slide = {
  eyebrow: string;
  eyebrowColor: 'red' | 'amber' | 'cobalt';
  title: string;
  titleEm: string;
  sub: string;
  primaryCta: string;
  primaryRoute: string;
  ghostCta: string;
  ghostRoute: string;
  slabs: SlabSpec[];
};

const buildSlides = (cd: Countdown): Slide[] => [
  {
    eyebrow: `Monday Drop · Live in ${cd.h}:${cd.m}:${cd.s}`,
    eyebrowColor: 'red',
    title: 'Modern', titleEm: 'Keys',
    sub: 'Slabbed first appearances from the 2010s — every pack guarantees a CGC 9.6+ key. $69 a rip.',
    primaryCta: 'Rip a pack', primaryRoute: '/packs',
    ghostCta: 'See odds', ghostRoute: '/packs',
    slabs: [
      { grade: '9.8', cover: 'VENOM',     issue: '#1',   gradient: 'linear-gradient(160deg,#1a4fc4 0%,#0a1e54 65%,#000 100%)' },
      { grade: '9.9', cover: 'DAREDEVIL', issue: '#181', gradient: 'linear-gradient(155deg,#e82c2c 0%,#7a0f0f 60%,#1a0606 100%)', gold: true },
      { grade: '9.6', cover: 'X-MEN',     issue: '#266', gradient: 'linear-gradient(165deg,#f59e0b 0%,#9a4d04 55%,#1a0d02 100%)' },
    ],
  },
  {
    eyebrow: 'Live now · 412 watching',
    eyebrowColor: 'amber',
    title: 'Golden Age', titleEm: 'Break',
    sub: 'Pre-code horror, Atlas weirds, Timely capes. One box, twelve buyers, no reserves.',
    primaryCta: 'Watch live', primaryRoute: '/live',
    ghostCta: 'Open slot', ghostRoute: '/live',
    slabs: [
      { grade: '7.0', cover: 'TALES',     issue: '#27', gradient: 'linear-gradient(160deg,#c46f1b,#5a2d05)' },
      { grade: '8.5', cover: 'DETECTIVE', issue: '#38', gradient: 'linear-gradient(155deg,#1a4fc4,#0a1e54)', gold: true },
      { grade: '6.5', cover: 'CAPTAIN',   issue: '#1',  gradient: 'linear-gradient(165deg,#e82c2c,#5a0606)' },
    ],
  },
  {
    eyebrow: 'Friday raffle · 248 entries',
    eyebrowColor: 'cobalt',
    title: 'Spider-Verse', titleEm: 'Vault',
    sub: 'Win an ASM #300 CGC 9.8 plus a slab of every 1st Spider villain. Tickets $5.',
    primaryCta: 'Enter raffle', primaryRoute: '/raffles',
    ghostCta: 'View prizes', ghostRoute: '/raffles',
    slabs: [
      { grade: '9.4', cover: 'ASM',   issue: '#252', gradient: 'linear-gradient(160deg,#1a4fc4,#0a1e54)' },
      { grade: '9.8', cover: 'ASM',   issue: '#300', gradient: 'linear-gradient(155deg,#e82c2c,#5a0606)', gold: true },
      { grade: '9.6', cover: 'VENOM', issue: '#1',   gradient: 'linear-gradient(165deg,#0a0a0a,#3a3a3a)' },
    ],
  },
];

const eyebrowColors = {
  red:    { bg: 'rgba(232,44,44,0.10)', border: 'rgba(232,44,44,0.22)', ink: colors.accent },
  amber:  { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', ink: colors.amber  },
  cobalt: { bg: 'rgba(26,79,196,0.10)',  border: 'rgba(26,79,196,0.25)',  ink: colors.cobalt },
} as const;

export default function HeroCarousel({ countdown }: HeroCarouselProps) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);

  const slides = buildSlides(countdown);

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setIdx(i => (i + 1) % slides.length);
    }, 5200);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <Box
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${colors.line}`,
        background: `
          radial-gradient(ellipse 70% 60% at 85% 50%, rgba(26,79,196,0.12) 0%, transparent 60%),
          linear-gradient(135deg, ${colors.bgElev} 0%, ${colors.bgSub} 100%)
        `,
        aspectRatio: '2.6 / 1',
        minHeight: 280,
      }}
    >
      {slides.map((slide, i) => {
        const active = i === idx;
        const eb = eyebrowColors[slide.eyebrowColor];
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute', inset: 0,
              display: { xs: 'flex', md: 'grid' },
              flexDirection: { xs: 'column', md: 'unset' },
              gridTemplateColumns: { md: 'minmax(0, 1fr) minmax(0, 1.05fr)' },
              alignItems: 'center',
              padding: { xs: '22px', md: '36px 44px' },
              opacity: active ? 1 : 0,
              transform: active ? 'scale(1)' : 'scale(0.985)',
              filter: active ? 'blur(0)' : 'blur(4px)',
              pointerEvents: active ? 'auto' : 'none',
              transition: `opacity 420ms ${easing.outSoft}, transform 520ms ${easing.outSoft}, filter 420ms ${easing.outSoft}`,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: 380 }}>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.9,
                alignSelf: 'flex-start',
                bgcolor: eb.bg, border: `1px solid ${eb.border}`, color: eb.ink,
                px: 1.4, py: 0.6, borderRadius: '999px',
                fontFamily: fonts.mono, fontSize: '0.66rem', fontWeight: 600,
                letterSpacing: '0.04em', mb: 2.25,
              }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: eb.ink, animation: 'cd-pulse 1.6s ease-in-out infinite' }} />
                {slide.eyebrow}
              </Box>

              <Box sx={{
                fontFamily: fonts.display, fontWeight: 800,
                fontSize: 'clamp(2.4rem, 4.4vw, 3.6rem)',
                lineHeight: 0.96, letterSpacing: '-0.035em',
                color: colors.ink, mb: 1.75,
              }}>
                {slide.title}{' '}
                <Box component="em" sx={{ fontStyle: 'italic', color: colors.accent, fontWeight: 800 }}>{slide.titleEm}</Box>
              </Box>

              <Box sx={{ color: colors.inkSoft, fontSize: '0.94rem', lineHeight: 1.55, mb: 2.75, maxWidth: 340 }}>
                {slide.sub}
              </Box>

              <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                <Button
                  onClick={() => navigate(slide.primaryRoute)}
                  sx={{
                    bgcolor: colors.ink, color: colors.bg, textTransform: 'none',
                    px: 2.75, py: 1.5, borderRadius: '10px',
                    fontFamily: fonts.display, fontWeight: 700, fontSize: '0.88rem',
                    transition: `transform 160ms ${easing.out}`,
                    '&:hover': { bgcolor: colors.ink, boxShadow: '0 8px 22px rgba(20,17,13,0.18)' },
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >{slide.primaryCta}</Button>
                <Button
                  onClick={() => navigate(slide.ghostRoute)}
                  sx={{
                    bgcolor: 'transparent', color: colors.ink,
                    border: `1px solid ${colors.lineStrong}`,
                    textTransform: 'none',
                    px: 2.75, py: 1.5, borderRadius: '10px',
                    fontFamily: fonts.display, fontWeight: 600, fontSize: '0.88rem',
                    '&:hover': { bgcolor: colors.bgSub, borderColor: colors.inkMute },
                    '&:active': { transform: 'scale(0.97)' },
                  }}
                >{slide.ghostCta}</Button>
              </Box>
            </Box>

            <Box sx={{ position: 'relative', height: '100%', display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center' }}>
              {slide.slabs.map((slab, si) => {
                const isBack   = si === 0;
                const isCenter = si === 1;
                const transform =
                  isBack   ? 'translateX(-110px) translateY(8px) rotate(-9deg)' :
                  isCenter ? 'translateY(-4px) rotate(-1.5deg)' :
                             'translateX(110px) translateY(8px) rotate(9deg)';
                return (
                  <Box key={si} sx={{
                    position: 'absolute',
                    width: 130, aspectRatio: '0.72',
                    borderRadius: '8px',
                    bgcolor: colors.bgElev,
                    border: `1px solid ${colors.lineStrong}`,
                    padding: '8px 8px 6px',
                    boxShadow: isCenter
                      ? '0 28px 60px rgba(0,0,0,0.28), 0 6px 18px rgba(232,44,44,0.18)'
                      : '0 20px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column', gap: 0.6,
                    zIndex: isCenter ? 3 : 1,
                    opacity: isBack ? 0.85 : isCenter ? 1 : 0.95,
                    transform,
                    transition: `transform 480ms ${easing.outSoft}`,
                  }}>
                    <Box sx={{
                      fontFamily: fonts.mono, fontSize: '0.6rem',
                      color: slab.gold ? colors.amber : colors.inkSoft,
                      textAlign: 'center', letterSpacing: '0.06em', padding: '2px 0',
                      background: slab.gold ? 'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)' : 'transparent',
                      borderRadius: '4px',
                    }}>
                      CGC <Box component="b" sx={{ color: slab.gold ? colors.amber : colors.ink, fontWeight: 700 }}>{slab.grade}</Box>
                    </Box>
                    <Box sx={{
                      flex: 1, borderRadius: '4px',
                      padding: '12px 10px',
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      color: '#fff', position: 'relative', overflow: 'hidden',
                      background: slab.gradient,
                      '&::after': {
                        content: '""', position: 'absolute', inset: 0,
                        background: 'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), transparent 55%)',
                      },
                    }}>
                      <Box sx={{
                        fontFamily: fonts.display, fontWeight: 900,
                        fontSize: '0.88rem', letterSpacing: '-0.02em', lineHeight: 1,
                        textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                      }}>{slab.cover}</Box>
                      <Box sx={{
                        fontFamily: fonts.mono, fontSize: '1.4rem', fontWeight: 800,
                        letterSpacing: '-0.02em', alignSelf: 'flex-end',
                        textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                      }}>{slab.issue}</Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      <Box sx={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 0.9,
        zIndex: 5,
      }}>
        {slides.map((_, i) => (
          <Box
            key={i}
            component="button"
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => setIdx(i)}
            sx={{
              width: i === idx ? 22 : 7, height: 7,
              borderRadius: i === idx ? '4px' : '50%',
              bgcolor: i === idx ? colors.accent : colors.inkMute,
              border: 'none', cursor: 'pointer', padding: 0,
              transition: `width 240ms ${easing.out}, background 200ms ${easing.out}`,
              '&:hover': { bgcolor: i === idx ? colors.accent : colors.inkSoft },
            }}
          />
        ))}
      </Box>

      <style>{`@keyframes cd-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
    </Box>
  );
}
