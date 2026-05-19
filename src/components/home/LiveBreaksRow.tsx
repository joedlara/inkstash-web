// src/components/home/LiveBreaksRow.tsx
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { LIVE_BREAKS, type LiveBreak } from '../../data/handoffSeed';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface LiveBreaksRowProps {
  breaks?: LiveBreak[];
}

export default function LiveBreaksRow({ breaks = LIVE_BREAKS }: LiveBreaksRowProps) {
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
          }}>Live Breaks</Box>
          <Box sx={{ color: inkstashColors.muted, fontSize: 13, mt: 0.5 }}>
            Watch collectors rip in real time and chat along
          </Box>
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/live')}
          sx={{
            bgcolor: 'transparent', border: 'none', cursor: 'pointer',
            color: inkstashColors.muted, fontSize: 13, fontWeight: 500,
            fontFamily: inkstashFonts.ui, padding: '6px 0',
            transition: 'color 120ms ease',
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          See all streams →
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: { xs: '10px', md: 2 },
      }}>
        {breaks.map(b => (
          <Box
            key={b.id}
            onClick={() => navigate('/live')}
            sx={{
              borderRadius: inkstashRadii.lg,
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: inkstashColors.ink,
              transition: 'transform 140ms ease, box-shadow 140ms ease',
              '&:hover': { transform: 'translateY(-3px)', boxShadow: inkstashShadows.lg },
            }}
          >
            <Box sx={{
              position: 'relative',
              aspectRatio: '9 / 16',
              overflow: 'hidden',
              color: '#fff',
              display: 'flex', alignItems: 'flex-end',
              background: `linear-gradient(160deg, ${b.gradient[0]} 0%, ${b.gradient[1]} 100%)`,
              '&::before': {
                content: '""',
                position: 'absolute', inset: 0,
                background:
                  'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.14), transparent 50%),' +
                  'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)',
                pointerEvents: 'none',
              },
              '&::after': {
                content: '""',
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1.2px)',
                backgroundSize: '10px 10px',
                pointerEvents: 'none',
                mixBlendMode: 'overlay',
              },
            }}>
              {/* LIVE pill */}
              <Box sx={{
                position: 'absolute', top: 12, left: 12, zIndex: 3,
                display: 'inline-flex', alignItems: 'center', gap: 0.65,
                bgcolor: inkstashColors.live, color: '#fff',
                fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '4px 10px 4px 8px', borderRadius: 999,
                boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
              }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
                  animation: 'inkstashLivePulse 1.4s ease-in-out infinite',
                }} />
                LIVE
              </Box>

              {/* Watcher count */}
              <Box sx={{
                position: 'absolute', top: 12, right: 12, zIndex: 3,
                bgcolor: 'rgba(0,0,0,0.55)',
                borderRadius: 999,
                padding: '5px 10px',
                fontFamily: inkstashFonts.mono,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}>
                <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{b.viewers}</Box>
                <Box component="span" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>watching</Box>
              </Box>

              {/* Pack name overlay */}
              <Box sx={{
                position: 'absolute', top: '38%', left: '50%',
                transform: 'translate(-50%, -50%) rotate(-3deg)',
                fontFamily: inkstashFonts.display, fontWeight: 900,
                fontSize: 'clamp(20px, 1.7vw, 26px)',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '0.01em', textAlign: 'center',
                padding: '0 16px',
                lineHeight: 0.95,
                textShadow: '0 2px 12px rgba(0,0,0,0.55)',
                zIndex: 1,
                maxWidth: '92%',
              }}>{b.packLabel}</Box>

              {/* Info overlay */}
              <Box sx={{ position: 'relative', padding: '16px 16px 18px', zIndex: 2, width: '100%' }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.85,
                  fontFamily: inkstashFonts.mono, fontSize: 11.5,
                  color: 'rgba(255,255,255,0.85)',
                  mb: 1, fontWeight: 500,
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: inkstashFonts.display,
                    fontWeight: 800, fontSize: 11,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    flexShrink: 0,
                  }}>{b.host[0].toUpperCase()}</Box>
                  @{b.host}
                </Box>
                <Box sx={{
                  fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                }}>{b.title}</Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      <style>{`
        @keyframes inkstashLivePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </Box>
  );
}
