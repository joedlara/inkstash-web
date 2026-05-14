import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Stack, Button, Avatar, LinearProgress, Chip, Skeleton } from '@mui/material';
import { Ticket, Clock, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { rafflesAPI, FALLBACK_RAFFLES } from '../api/dropsRaffles';
import type { Raffle } from '../api/dropsRaffles';

const T = {
  bg:        '#08080e',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.5)',
  dimmed:    'rgba(241,245,249,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

const STATUS_META: Record<Raffle['status'], { label: string; bg: string; fg: string }> = {
  live:     { label: 'LIVE',     bg: T.live,                 fg: '#fff' },
  upcoming: { label: 'UPCOMING', bg: 'rgba(217,119,6,0.15)', fg: T.gold },
  ended:    { label: 'ENDED',    bg: 'rgba(55,65,81,0.7)',   fg: '#6b7280' },
};

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
  const sm = STATUS_META[raffle.status];
  const isLive = raffle.status === 'live';
  const isEnded = raffle.status === 'ended';
  const spotsLeft = raffle.max_spots - raffle.spots_filled;

  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${isLive ? 'rgba(239,68,68,0.2)' : T.border}`, borderRadius: 2.5, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, transition: 'border-color 0.18s', '&:hover': { borderColor: isLive ? 'rgba(239,68,68,0.38)' : T.borderLit } }}>
      {/* Image */}
      <Box sx={{ position: 'relative', width: { xs: '100%', sm: 160 }, height: { xs: 160, sm: 'auto' }, flexShrink: 0, bgcolor: T.surfaceB, overflow: 'hidden' }}>
        {raffle.item_image_url && (
          <Box component="img" src={raffle.item_image_url} alt={raffle.item_title} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isEnded ? 'grayscale(60%) brightness(0.6)' : 'none' }} />
        )}
        <Box sx={{ position: 'absolute', top: 8, left: 8, px: 0.75, py: 0.3, borderRadius: 0.6, bgcolor: sm.bg, border: `1px solid ${isLive ? T.live : 'transparent'}`, color: sm.fg, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.07em' }}>
          {sm.label}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 2, md: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        <Box>
          <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: isEnded ? T.dimmed : T.white, lineHeight: 1.25, mb: 0.3 }} noWrap>
            {raffle.item_title}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <Avatar src={raffle.seller_avatar || undefined} sx={{ width: 18, height: 18, fontSize: '0.55rem', bgcolor: T.blue }}>
              {(raffle.seller_username?.[0] ?? 'I').toUpperCase()}
            </Avatar>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.63rem', color: T.dimmed }}>@{raffle.seller_username ?? 'inkstash'}</Typography>
            {raffle.estimated_value && (
              <Chip label={`Est. $${raffle.estimated_value.toLocaleString()}`} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.1)', color: T.green, '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Stack>
        </Box>

        {/* Progress */}
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.dimmed }}>{raffle.spots_filled} / {raffle.max_spots} spots filled</Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: pct >= 80 ? T.live : T.dimmed }}>{pct}% full</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: T.surfaceB, '& .MuiLinearProgress-bar': { bgcolor: pct >= 80 ? T.live : T.blue, borderRadius: 2 } }} />
        </Box>

        {/* Footer */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" gap={0.6}>
            <Clock size={12} strokeWidth={2} color={T.dimmed} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: isEnded ? T.dimmed : T.muted }}>
              {isEnded ? 'Ended' : timeLeft(raffle.ends_at)}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.dimmed, letterSpacing: '0.05em' }}>TICKET</Typography>
              <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.9rem', color: isEnded ? T.dimmed : T.white }}>${raffle.ticket_price.toFixed(2)}</Typography>
            </Box>
            <Button variant="contained" size="small" disabled={isEnded || raffle.spots_filled >= raffle.max_spots} sx={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', px: 2, py: 0.75, bgcolor: isEnded ? 'rgba(55,65,81,0.6)' : T.blue, color: isEnded ? '#6b7280' : '#fff', borderRadius: 1.25, boxShadow: 'none', '&:hover': { bgcolor: '#005fcc', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' } }}>
              {isEnded ? 'Ended' : raffle.spots_filled >= raffle.max_spots ? 'Full' : `Enter · ${spotsLeft} left`}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function RaffleSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden', display: 'flex', height: 160 }}>
      <Skeleton variant="rectangular" width={160} sx={{ bgcolor: T.surfaceB, flexShrink: 0 }} />
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="40%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: T.surfaceB, borderRadius: 2, mt: 'auto' }} />
      </Box>
    </Box>
  );
}

export default function Raffles() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

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

  const filtered = filter === 'all' ? raffles : raffles.filter(r => r.status === filter);
  const liveCount = raffles.filter(r => r.status === 'live').length;

  const FILTERS = [
    { key: 'all' as const,      label: 'All' },
    { key: 'live' as const,     label: 'Live' },
    { key: 'upcoming' as const, label: 'Upcoming' },
    { key: 'ended' as const,    label: 'Ended' },
  ];

  return (
    <>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg }}>
        <DashboardHeader />
        <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

          {/* Header */}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={3.5}>
            <Box>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Raffles</Typography>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mt: 0.5 }}>Win rare comics from live stream hosts — one ticket gets you in</Typography>
            </Box>
            {liveCount > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: T.live, fontSize: '0.75rem', fontWeight: 700, px: 1.5, py: 0.7, borderRadius: 999 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
                {liveCount} raffle{liveCount !== 1 ? 's' : ''} live
              </Box>
            )}
          </Stack>

          {/* Filter chips */}
          <Stack direction="row" gap={0.75} mb={3.5} flexWrap="wrap">
            {FILTERS.map(f => (
              <Box key={f.key} onClick={() => setFilter(f.key)} sx={{ px: 1.5, py: 0.6, borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', color: filter === f.key ? T.white : T.muted, bgcolor: filter === f.key ? 'rgba(255,255,255,0.09)' : 'transparent', border: `1px solid ${filter === f.key ? T.borderLit : 'transparent'}`, '&:hover': { color: T.white, bgcolor: 'rgba(255,255,255,0.05)' } }}>
                {f.label}
              </Box>
            ))}
          </Stack>

          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
              <AlertCircle size={13} color={T.live} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.68rem', color: T.live }}>{error}</Typography>
            </Box>
          )}

          {/* List */}
          <Stack gap={2}>
            {loading
              ? [1,2,3,4].map(i => <RaffleSkeleton key={i} />)
              : filtered.length === 0
              ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 1.5 }}>
                  <Ticket size={28} strokeWidth={1.25} color={T.dimmed} />
                  <Typography sx={{ fontFamily: T.mono, fontSize: '0.8rem', color: T.dimmed }}>No {filter === 'all' ? '' : filter} raffles right now</Typography>
                </Box>
              )
              : filtered.map(r => <RaffleCard key={r.id} raffle={r} />)
            }
          </Stack>
        </Container>
      </Box>
    </>
  );
}
