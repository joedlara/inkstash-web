import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack, Skeleton, LinearProgress } from '@mui/material';
import { Zap, Clock, Package, Bell, AlertCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { dropsAPI, FALLBACK_DROPS } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

function useCountdownTo(isoTarget: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(isoTarget).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(isoTarget).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [isoTarget]);
  const h = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return { h, m, s, done: remaining === 0 };
}

function DropCountdown({ drop_at }: { drop_at: string }) {
  const { h, m, s, done } = useCountdownTo(drop_at);
  if (done) {
    return (
      <Stack direction="row" alignItems="center" gap={0.75}>
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%',
          bgcolor: inkstashColors.live,
          animation: 'inkstashLivePulseDrops 1.6s ease-in-out infinite',
        }} />
        <Box sx={{
          fontFamily: inkstashFonts.mono, fontWeight: 700, fontSize: 12,
          color: inkstashColors.live, letterSpacing: '0.06em',
        }}>
          LIVE NOW
        </Box>
      </Stack>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {[h, m, s].map((unit, i) => (
        <Stack key={i} direction="row" alignItems="center" gap={0.5}>
          <Box sx={{
            bgcolor: inkstashColors.goldSoft,
            border: `1px solid ${inkstashColors.gold}33`,
            color: inkstashColors.gold,
            borderRadius: '6px',
            padding: '3px 8px',
            fontWeight: 700, fontSize: 12,
            fontFamily: inkstashFonts.mono,
            minWidth: 30, textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {unit}
          </Box>
          {i < 2 && (
            <Box sx={{ color: inkstashColors.gold, fontSize: 12, opacity: 0.5 }}>:</Box>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function DropCard({ drop }: { drop: Drop }) {
  const navigate = useNavigate();
  const soldPct = Math.round(((drop.quantity - drop.remaining) / drop.quantity) * 100);
  const isLive = drop.status === 'live';

  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${isLive ? `${inkstashColors.brand}33` : inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: inkstashShadows.md,
        borderColor: isLive ? `${inkstashColors.brand}66` : inkstashColors.borderStrong,
      },
    }}>
      <Box sx={{
        position: 'relative',
        aspectRatio: '16 / 10',
        overflow: 'hidden',
        bgcolor: inkstashColors.bgSunken,
      }}>
        {drop.image_url && (
          <Box
            component="img"
            src={drop.image_url}
            alt={drop.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(22,17,14,0.45) 0%, transparent 55%)',
        }} />

        {/* Status badge */}
        <Box sx={{
          position: 'absolute', top: 12, left: 12,
          display: 'inline-flex', alignItems: 'center', gap: 0.6,
          bgcolor: isLive ? inkstashColors.live : inkstashColors.goldSoft,
          border: isLive ? 'none' : `1px solid ${inkstashColors.gold}55`,
          color: isLive ? '#fff' : inkstashColors.gold,
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
          padding: '4px 10px', borderRadius: 999,
        }}>
          <Zap size={10} strokeWidth={2.5} />
          {isLive ? 'LIVE' : 'UPCOMING'}
        </Box>

        {/* Tag chips */}
        {drop.tags.length > 0 && (
          <Stack direction="row" gap={0.5} sx={{ position: 'absolute', bottom: 12, left: 12 }}>
            {drop.tags.slice(0, 3).map(tag => (
              <Box key={tag} sx={{
                padding: '2px 8px',
                borderRadius: '4px',
                bgcolor: 'rgba(22,17,14,0.7)',
                color: '#fff',
                fontFamily: inkstashFonts.mono,
                fontSize: 9.5, fontWeight: 600,
                letterSpacing: '0.05em',
              }}>{tag}</Box>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1 }}>
        <Box>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 20, lineHeight: 1.05,
            textTransform: 'uppercase', letterSpacing: '0.005em',
            color: inkstashColors.ink,
          }}>
            {drop.name}
          </Box>
          <Box sx={{
            fontFamily: inkstashFonts.mono, fontSize: 11,
            color: inkstashColors.muted,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            mt: 0.5,
          }}>
            {drop.partner}
          </Box>
        </Box>

        {drop.description && (
          <Box sx={{
            fontSize: 13.5,
            color: inkstashColors.ink2,
            lineHeight: 1.5,
            overflow: 'hidden', textOverflow: 'ellipsis',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {drop.description}
          </Box>
        )}

        {/* Progress bar */}
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted }}>
              {drop.quantity - drop.remaining} / {drop.quantity} claimed
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              color: soldPct > 80 ? inkstashColors.brand : inkstashColors.muted,
              fontWeight: 600,
            }}>
              {soldPct}%
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={soldPct}
            sx={{
              height: 4, borderRadius: 2,
              bgcolor: inkstashColors.bgSunken,
              '& .MuiLinearProgress-bar': {
                bgcolor: soldPct > 80 ? inkstashColors.brand : inkstashColors.ink,
                borderRadius: 2,
              },
            }}
          />
        </Box>

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" flexWrap="wrap" gap={1.5} sx={{ mt: 'auto' }}>
          <Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 10,
              color: inkstashColors.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', mb: 0.5,
            }}>
              {isLive ? 'LIVE NOW' : 'DROPS IN'}
            </Box>
            {isLive
              ? (
                <Box sx={{
                  fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 16,
                  color: inkstashColors.live,
                }}>
                  Open now
                </Box>
              )
              : <DropCountdown drop_at={drop.drop_at} />
            }
          </Box>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 20,
              color: inkstashColors.ink, lineHeight: 1,
            }}>
              ${drop.price.toFixed(2)}
            </Box>
            <Box
              component="button"
              type="button"
              disabled={!isLive}
              onClick={() => navigate('/packs')}
              sx={{
                bgcolor: isLive ? inkstashColors.brand : inkstashColors.bgSunken,
                color: isLive ? '#fff' : inkstashColors.muted,
                border: 'none',
                padding: '8px 16px',
                borderRadius: 1.25,
                fontFamily: inkstashFonts.ui,
                fontWeight: 600, fontSize: 13,
                cursor: isLive ? 'pointer' : 'not-allowed',
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': isLive ? { bgcolor: inkstashColors.brandDeep } : {},
                '&:active': isLive ? { transform: 'scale(0.97)' } : {},
                '&:disabled': { opacity: 0.65 },
              }}
            >
              {isLive ? 'Buy Now' : 'Notify Me'}
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function DropSkeleton() {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
    }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 10', bgcolor: inkstashColors.bgSunken }} />
      <Box sx={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="65%" height={24} sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 2, mt: 0.5 }} />
        <Skeleton variant="rectangular" height={36} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 1.25, mt: 0.5 }} />
      </Box>
    </Box>
  );
}

function SectionHeader({ icon, title, accent }: { icon: React.ReactNode; title: string; accent?: 'live' | 'gold' }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
      {icon}
      <Box sx={{
        fontFamily: inkstashFonts.display, fontWeight: 800,
        fontSize: 'clamp(16px, 2vw, 20px)',
        color: inkstashColors.ink,
        textTransform: 'uppercase',
        letterSpacing: '0.005em',
        lineHeight: 1,
      }}>
        {title}
      </Box>
      {accent === 'live' && (
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%',
          bgcolor: inkstashColors.live,
          animation: 'inkstashLivePulseDrops 1.6s ease-in-out infinite',
          ml: 0.5,
        }} />
      )}
    </Stack>
  );
}

export default function Drops() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dropsAPI.list();
      setDrops(data);
    } catch {
      setDrops(FALLBACK_DROPS);
      setError('Using preview data — DB unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const liveDrops     = drops.filter(d => d.status === 'live');
  const upcomingDrops = drops.filter(d => d.status === 'upcoming');

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        {/* Page header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Box component="h1" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              Drops
            </Box>
            <Box sx={{
              color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
            }}>
              Publisher collabs and InkStash house drops — first come, first served.
            </Box>
          </Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Bell size={14} color={inkstashColors.muted} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted }}>
              {drops.length} drop{drops.length !== 1 ? 's' : ''} scheduled
            </Box>
          </Stack>
        </Stack>

        {/* Error banner */}
        {error && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            padding: '10px 16px', mb: 3,
            bgcolor: inkstashColors.brandSoft,
            border: `1px solid ${inkstashColors.brand}33`,
            borderRadius: inkstashRadii.md,
          }}>
            <AlertCircle size={14} color={inkstashColors.brand} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.brandDeep }}>
              {error}
            </Box>
          </Box>
        )}

        {/* Live drops */}
        {(loading || liveDrops.length > 0) && (
          <Box sx={{ mb: { xs: 5, md: 6 } }}>
            <SectionHeader icon={null} title="Live Now" accent="live" />
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
              gap: { xs: 2, md: 2.5 },
            }}>
              {loading
                ? [1, 2].map(i => <DropSkeleton key={i} />)
                : liveDrops.map(d => <DropCard key={d.id} drop={d} />)
              }
            </Box>
          </Box>
        )}

        {/* Upcoming drops */}
        <Box>
          <SectionHeader
            icon={<Clock size={15} color={inkstashColors.gold} />}
            title="Upcoming"
            accent="gold"
          />
          {loading ? (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
              gap: { xs: 2, md: 2.5 },
            }}>
              {[1, 2, 3].map(i => <DropSkeleton key={i} />)}
            </Box>
          ) : upcomingDrops.length === 0 ? (
            <Box sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '64px 0', gap: 1.5,
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
            }}>
              <Package size={30} strokeWidth={1.25} color={inkstashColors.muted2} />
              <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 13, color: inkstashColors.muted }}>
                No upcoming drops scheduled
              </Box>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
              gap: { xs: 2, md: 2.5 },
            }}>
              {upcomingDrops.map(d => <DropCard key={d.id} drop={d} />)}
            </Box>
          )}
        </Box>

        <style>{`
          @keyframes inkstashLivePulseDrops {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(0.6); }
          }
        `}</style>
      </Container>
    </AppShell>
  );
}
