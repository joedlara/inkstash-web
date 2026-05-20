import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Stack, Avatar, LinearProgress, Skeleton } from '@mui/material';
import { Ticket, Clock, AlertCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { rafflesAPI, FALLBACK_RAFFLES } from '../api/dropsRaffles';
import type { Raffle } from '../api/dropsRaffles';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

const STATUS_STYLES: Record<Raffle['status'], { label: string; bg: string; fg: string }> = {
  live:     { label: 'LIVE',     bg: inkstashColors.live,      fg: '#fff' },
  upcoming: { label: 'UPCOMING', bg: inkstashColors.goldSoft,  fg: inkstashColors.gold },
  ended:    { label: 'ENDED',    bg: inkstashColors.bgSunken,  fg: inkstashColors.muted },
};

type Filter = 'all' | 'live' | 'upcoming' | 'ended';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'live',     label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ended',    label: 'Ended' },
];

function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function RaffleCard({ raffle }: { raffle: Raffle }) {
  const pct = Math.round((raffle.spots_filled / raffle.max_spots) * 100);
  const sm = STATUS_STYLES[raffle.status];
  const isLive = raffle.status === 'live';
  const isEnded = raffle.status === 'ended';
  const spotsLeft = raffle.max_spots - raffle.spots_filled;
  const isFull = raffle.spots_filled >= raffle.max_spots;

  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${isLive ? `${inkstashColors.brand}33` : inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
      '&:hover': isEnded ? {} : {
        transform: 'translateY(-2px)',
        boxShadow: inkstashShadows.md,
        borderColor: isLive ? `${inkstashColors.brand}66` : inkstashColors.borderStrong,
      },
    }}>
      <Box sx={{
        position: 'relative',
        width: { xs: '100%', sm: 200 },
        height: { xs: 180, sm: 'auto' },
        flexShrink: 0,
        bgcolor: inkstashColors.bgSunken,
        overflow: 'hidden',
      }}>
        {raffle.item_image_url && (
          <Box
            component="img"
            src={raffle.item_image_url}
            alt={raffle.item_title}
            sx={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: isEnded ? 'grayscale(60%) brightness(0.85)' : 'none',
            }}
          />
        )}
        <Box sx={{
          position: 'absolute', top: 12, left: 12,
          bgcolor: sm.bg,
          color: sm.fg,
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
          padding: '4px 10px', borderRadius: 999,
          border: raffle.status === 'upcoming' ? `1px solid ${inkstashColors.gold}55` : 'none',
        }}>
          {sm.label}
        </Box>
      </Box>

      <Box sx={{
        padding: { xs: '16px 18px', md: '20px 22px' },
        flex: 1,
        display: 'flex', flexDirection: 'column', gap: 1.5,
        minWidth: 0,
      }}>
        <Box>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 18, lineHeight: 1.2,
            textTransform: 'uppercase', letterSpacing: '0.005em',
            color: isEnded ? inkstashColors.muted : inkstashColors.ink,
            mb: 0.75,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {raffle.item_title}
          </Box>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Avatar
              src={raffle.seller_avatar || undefined}
              sx={{
                width: 22, height: 22,
                fontSize: 11, fontWeight: 700,
                bgcolor: inkstashColors.brand,
                fontFamily: inkstashFonts.display,
              }}
            >
              {(raffle.seller_username?.[0] ?? 'I').toUpperCase()}
            </Avatar>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 12,
              color: inkstashColors.muted,
            }}>
              @{raffle.seller_username ?? 'inkstash'}
            </Box>
            {raffle.estimated_value != null && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center',
                bgcolor: inkstashColors.goldSoft,
                color: inkstashColors.gold,
                border: `1px solid ${inkstashColors.gold}33`,
                fontFamily: inkstashFonts.mono,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
                padding: '2px 8px', borderRadius: 999,
              }}>
                Est. ${raffle.estimated_value.toLocaleString()}
              </Box>
            )}
          </Stack>
        </Box>

        {/* Progress */}
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted }}>
              {raffle.spots_filled} / {raffle.max_spots} spots filled
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11,
              color: pct >= 80 ? inkstashColors.brand : inkstashColors.muted,
              fontWeight: 600,
            }}>
              {pct}% full
            </Box>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 4, borderRadius: 2,
              bgcolor: inkstashColors.bgSunken,
              '& .MuiLinearProgress-bar': {
                bgcolor: pct >= 80 ? inkstashColors.brand : inkstashColors.ink,
                borderRadius: 2,
              },
            }}
          />
        </Box>

        <Stack
          direction="row"
          alignItems="flex-end"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.25}
          sx={{ mt: 'auto' }}
        >
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Clock size={13} color={isEnded ? inkstashColors.muted2 : inkstashColors.muted} />
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 12,
              color: isEnded ? inkstashColors.muted2 : inkstashColors.muted,
            }}>
              {isEnded ? 'Ended' : timeLeft(raffle.ends_at)}
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box>
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 10,
                color: inkstashColors.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Ticket
              </Box>
              <Box sx={{
                fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 18,
                color: isEnded ? inkstashColors.muted : inkstashColors.ink,
                lineHeight: 1,
              }}>
                ${raffle.ticket_price.toFixed(2)}
              </Box>
            </Box>
            <Box
              component="button"
              type="button"
              disabled={isEnded || isFull}
              sx={{
                bgcolor: (isEnded || isFull) ? inkstashColors.bgSunken : inkstashColors.brand,
                color: (isEnded || isFull) ? inkstashColors.muted : '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 1.25,
                fontFamily: inkstashFonts.ui,
                fontWeight: 600, fontSize: 13,
                cursor: (isEnded || isFull) ? 'not-allowed' : 'pointer',
                transition: 'background 140ms ease, transform 100ms ease',
                whiteSpace: 'nowrap',
                '&:hover': (isEnded || isFull) ? {} : { bgcolor: inkstashColors.brandDeep },
                '&:active': (isEnded || isFull) ? {} : { transform: 'scale(0.97)' },
                '&:disabled': { opacity: 0.65 },
              }}
            >
              {isEnded ? 'Ended' : isFull ? 'Full' : `Enter · ${spotsLeft} left`}
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function RaffleSkeleton() {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
    }}>
      <Skeleton
        variant="rectangular"
        sx={{
          width: { xs: '100%', sm: 200 },
          height: { xs: 180, sm: 'auto' },
          aspectRatio: { xs: 'auto', sm: 'auto' },
          minHeight: { sm: 180 },
          bgcolor: inkstashColors.bgSunken,
          flexShrink: 0,
        }}
      />
      <Box sx={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" height={28} sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 2, mt: 'auto' }} />
        <Skeleton variant="rectangular" height={36} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 1.25, mt: 0.5 }} />
      </Box>
    </Box>
  );
}

export default function Raffles() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rafflesAPI.list();
      setRaffles(data);
    } catch {
      setRaffles(FALLBACK_RAFFLES);
      setError('Using preview data — DB unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered  = filter === 'all' ? raffles : raffles.filter(r => r.status === filter);
  const liveCount = raffles.filter(r => r.status === 'live').length;

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        {/* Page header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 3.5 }}
        >
          <Box>
            <Box component="h1" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              Raffles
            </Box>
            <Box sx={{
              color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
            }}>
              Win rare comics from live stream hosts — one ticket gets you in.
            </Box>
          </Box>
          {liveCount > 0 && (
            <Stack direction="row" alignItems="center" gap={0.85} sx={{
              bgcolor: inkstashColors.brandSoft,
              border: `1px solid ${inkstashColors.brand}33`,
              color: inkstashColors.brandDeep,
              fontSize: 12, fontWeight: 700,
              padding: '6px 12px', borderRadius: 999,
              fontFamily: inkstashFonts.mono, letterSpacing: '0.04em',
            }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: inkstashColors.live,
                animation: 'inkstashLivePulseRaffles 1.6s ease-in-out infinite',
              }} />
              {liveCount} raffle{liveCount !== 1 ? 's' : ''} live
            </Stack>
          )}
        </Stack>

        {/* Filter pills (segmented control) */}
        <Box sx={{
          display: 'inline-flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken, borderRadius: 999,
          mb: 3.5,
        }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <Box
                key={f.key}
                component="button"
                type="button"
                onClick={() => setFilter(f.key)}
                sx={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                  bgcolor: active ? inkstashColors.bgElev : 'transparent',
                  color: active ? inkstashColors.ink : inkstashColors.ink2,
                  boxShadow: active ? inkstashShadows.sm : 'none',
                  transition: 'all 140ms ease',
                }}
              >
                {f.label}
              </Box>
            );
          })}
        </Box>

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

        <Stack gap={2}>
          {loading
            ? [1, 2, 3, 4].map(i => <RaffleSkeleton key={i} />)
            : filtered.length === 0
              ? (
                <Box sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '64px 0', gap: 1.5,
                  bgcolor: inkstashColors.bgElev,
                  border: `1px solid ${inkstashColors.border}`,
                  borderRadius: inkstashRadii.lg,
                }}>
                  <Ticket size={30} strokeWidth={1.25} color={inkstashColors.muted2} />
                  <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 13, color: inkstashColors.muted }}>
                    No {filter === 'all' ? '' : filter} raffles right now
                  </Box>
                </Box>
              )
              : filtered.map(r => <RaffleCard key={r.id} raffle={r} />)
          }
        </Stack>

        <style>{`
          @keyframes inkstashLivePulseRaffles {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.25; transform: scale(0.6); }
          }
        `}</style>
      </Container>
    </AppShell>
  );
}
