import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack, Button, Skeleton, LinearProgress } from '@mui/material';
import { Zap, Clock, Package, Bell, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { dropsAPI, FALLBACK_DROPS } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';

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
  if (done) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
      <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.78rem', color: T.live }}>LIVE NOW</Typography>
    </Box>
  );
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {[h, m, s].map((unit, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ bgcolor: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 0.75, px: 1, py: 0.4, fontWeight: 800, fontSize: '0.8rem', color: '#fbbf24', fontFamily: T.mono, minWidth: 30, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {unit}
          </Box>
          {i < 2 && <Typography sx={{ color: 'rgba(217,119,6,0.4)', fontSize: '0.75rem' }}>:</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

function DropCard({ drop }: { drop: Drop }) {
  const navigate = useNavigate();
  const soldPct = Math.round(((drop.quantity - drop.remaining) / drop.quantity) * 100);
  const isLive = drop.status === 'live';

  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${isLive ? 'rgba(239,68,68,0.25)' : T.border}`, borderRadius: 3, overflow: 'hidden', transition: 'border-color 0.18s, transform 0.18s', '&:hover': { borderColor: isLive ? 'rgba(239,68,68,0.45)' : T.borderLit, transform: 'translateY(-3px)' } }}>
      {/* Image */}
      <Box sx={{ position: 'relative', height: { xs: 160, md: 200 }, overflow: 'hidden', bgcolor: T.surfaceB }}>
        {drop.image_url && (
          <Box component="img" src={drop.image_url} alt={drop.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,0.9) 0%, transparent 55%)' }} />
        {/* Status badge */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: isLive ? T.live : 'rgba(217,119,6,0.15)', border: `1px solid ${isLive ? T.live : 'rgba(217,119,6,0.35)'}`, color: isLive ? '#fff' : T.gold, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', px: 0.9, py: 0.4, borderRadius: 0.75 }}>
          <Zap size={8} strokeWidth={2.5} />
          {isLive ? 'LIVE' : 'UPCOMING'}
        </Box>
        {/* Tag chips */}
        <Stack direction="row" gap={0.5} sx={{ position: 'absolute', bottom: 10, left: 10 }}>
          {drop.tags.slice(0, 3).map(tag => (
            <Box key={tag} sx={{ px: 0.7, py: 0.2, borderRadius: 0.5, bgcolor: 'rgba(8,8,14,0.75)', color: T.muted, fontSize: '0.52rem', fontWeight: 600, fontFamily: T.mono }}>{tag}</Box>
          ))}
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 1.75, md: 2 } }}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', color: T.white, lineHeight: 1.2, mb: 0.5 }}>{drop.name}</Typography>
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mb: 1.25 }}>{drop.partner}</Typography>
        {drop.description && (
          <Typography sx={{ fontSize: '0.85rem', color: T.muted, lineHeight: 1.55, mb: 1.5 }} noWrap>{drop.description}</Typography>
        )}

        {/* Progress bar */}
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted }}>{drop.quantity - drop.remaining} / {drop.quantity} claimed</Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: soldPct > 80 ? T.live : T.muted }}>{soldPct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={soldPct} sx={{ height: 4, borderRadius: 2, bgcolor: T.surfaceB, '& .MuiLinearProgress-bar': { bgcolor: soldPct > 80 ? T.live : T.blue, borderRadius: 2 } }} />
        </Box>

        {/* Footer */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, letterSpacing: '0.05em', mb: 0.25 }}>
              {isLive ? 'LIVE NOW' : 'DROPS IN'}
            </Typography>
            {isLive
              ? <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.95rem', color: T.live }}>Open now</Typography>
              : <DropCountdown drop_at={drop.drop_at} />
            }
          </Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '1.1rem', color: T.white }}>${drop.price.toFixed(2)}</Typography>
            <Button variant="contained" size="small" onClick={() => navigate('/packs')} disabled={!isLive} sx={{ fontFamily: T.mono, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', px: 2, py: 0.75, bgcolor: isLive ? T.blue : 'rgba(55,65,81,0.6)', color: isLive ? '#fff' : '#6b7280', borderRadius: 1.25, boxShadow: 'none', '&:hover': { bgcolor: isLive ? '#005fcc' : 'rgba(55,65,81,0.6)', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' } }}>
              {isLive ? 'Buy Now' : 'Notify Me'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function DropSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={200} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="65%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: T.surfaceB, borderRadius: 2, mt: 0.5 }} />
        <Skeleton variant="rectangular" height={32} sx={{ bgcolor: T.surfaceB, borderRadius: 1.25, mt: 0.5 }} />
      </Box>
    </Box>
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

  const liveDrops      = drops.filter(d => d.status === 'live');
  const upcomingDrops  = drops.filter(d => d.status === 'upcoming');

  return (
    <>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg }}>
        <DashboardHeader />
        <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

          {/* Header */}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={4}>
            <Box>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '2rem', md: '2.6rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Drops</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: T.muted, mt: 0.75, lineHeight: 1.5 }}>Publisher collabs and InkStash house drops — first come, first served</Typography>
            </Box>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <Bell size={14} strokeWidth={2} color={T.muted} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.muted }}>{drops.length} drop{drops.length !== 1 ? 's' : ''} scheduled</Typography>
            </Stack>
          </Stack>

          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
              <AlertCircle size={14} color={T.live} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.live }}>{error}</Typography>
            </Box>
          )}

          {/* Live drops */}
          {(loading || liveDrops.length > 0) && (
            <Box sx={{ mb: { xs: 5, md: 6 } }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
                <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
                <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: T.white }}>Live Now</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {loading ? [1,2].map(i => <DropSkeleton key={i} />) : liveDrops.map(d => <DropCard key={d.id} drop={d} />)}
              </Box>
            </Box>
          )}

          {/* Upcoming drops */}
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
              <Clock size={15} strokeWidth={2} color={T.gold} />
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: T.white }}>Upcoming</Typography>
            </Stack>
            {loading ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {[1,2,3].map(i => <DropSkeleton key={i} />)}
              </Box>
            ) : upcomingDrops.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1.5 }}>
                <Package size={30} strokeWidth={1.25} color={T.dimmed} />
                <Typography sx={{ fontFamily: T.mono, fontSize: '0.9rem', color: T.muted }}>No upcoming drops scheduled</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {upcomingDrops.map(d => <DropCard key={d.id} drop={d} />)}
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
}
