import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack, Button, Chip, Skeleton } from '@mui/material';
import { X, Package, BookOpen, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { packsAPI, FALLBACK_PACKS } from '../api/packs';
import type { Pack } from '../api/packs';

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

const BADGE_META: Record<string, { bg: string; fg: string }> = {
  COLLAB:     { bg: T.gold,                fg: '#000' },
  HOT:        { bg: T.live,               fg: '#fff' },
  NEW:        { bg: T.blue,               fg: '#fff' },
  'SOLD OUT': { bg: 'rgba(55,65,81,0.9)', fg: '#6b7280' },
};

const FILTERS = ['All', 'Comics', 'Keys', 'Graded', 'Limited'];

function rarityLabel(tiers: Pack['rarity_tiers']): string {
  return `${Math.round(tiers.legendary * 100)}%`;
}

function PackCard({ pack, onOpen, opening }: { pack: Pack; onOpen: (id: string) => void; opening: boolean }) {
  const badge = pack.badge ?? (pack.status === 'sold_out' ? 'SOLD OUT' : 'NEW');
  const bm = BADGE_META[badge] ?? { bg: T.blue, fg: '#fff' };
  const soldOut = pack.status === 'sold_out';

  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: soldOut ? 'default' : 'pointer', transition: 'border-color 0.18s, transform 0.18s', '&:hover': soldOut ? {} : { borderColor: T.borderLit, transform: 'translateY(-4px)' } }}>
      <Box sx={{ position: 'relative', height: { xs: 160, md: 200 }, overflow: 'hidden' }}>
        {pack.cover_image ? (
          <Box component="img" src={pack.cover_image} alt={pack.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: soldOut ? 'grayscale(60%) brightness(0.65)' : 'none', transition: 'transform 0.3s', '.MuiBox-root:hover &': soldOut ? {} : { transform: 'scale(1.03)' } }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: T.surfaceB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={40} color={T.dimmed} />
          </Box>
        )}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: `linear-gradient(to top, ${T.surface} 0%, transparent 100%)`, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 10, left: 10, px: 1, py: 0.35, bgcolor: bm.bg, color: bm.fg, fontFamily: T.mono, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', borderRadius: 0.75 }}>
          {badge}
        </Box>
      </Box>
      <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1, gap: 1 }}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', color: T.white, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{pack.name}</Typography>
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, letterSpacing: '0.04em' }}>{pack.partner}</Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <BookOpen size={12} strokeWidth={1.75} color={T.muted} />
          <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted }}>{pack.item_count} comics per pack</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.gold, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted }}>LEG {rarityLabel(pack.rarity_tiers)}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.blue, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted }}>RARE {Math.round(pack.rarity_tiers.rare * 100)}%</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#374151', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted }}>COM {Math.round(pack.rarity_tiers.common * 100)}%</Typography>
          </Stack>
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
          <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '1.1rem', color: soldOut ? T.dimmed : T.white }}>{soldOut ? '—' : `$${pack.price.toFixed(2)}`}</Typography>
          <Button variant="contained" disabled={soldOut || opening} size="small" onClick={(e) => { e.stopPropagation(); onOpen(pack.id); }} sx={{ fontFamily: T.mono, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', px: 2, py: 0.75, bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : T.blue, color: soldOut ? '#6b7280' : '#fff', borderRadius: 1.25, boxShadow: 'none', '&:hover': { bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : '#005fcc', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' } }}>
            {opening ? 'Opening...' : soldOut ? 'Sold Out' : 'Open Pack'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function PackCardSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" sx={{ height: { xs: 160, md: 200 }, width: '100%', bgcolor: T.surfaceB }} />
      <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="50%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={28} sx={{ bgcolor: T.surfaceB, borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

export default function Packs() {
  const navigate = useNavigate();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);

  useEffect(() => {
    packsAPI.list()
      .then(setPacks)
      .catch(() => { setPacks(FALLBACK_PACKS); setError('Using preview data — DB unavailable'); })
      .finally(() => setLoading(false));
  }, []);

  async function handleOpenPack(packId: string) {
    setOpeningPackId(packId);
    try {
      const result = await packsAPI.openPack(packId);
      navigate(`/pack-reveal/${result.purchase_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
      setOpeningPackId(null);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.bg }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>
        {!noticeDismissed && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, mb: 3, bgcolor: 'rgba(217,119,6,0.1)', border: `1px solid rgba(217,119,6,0.25)`, borderRadius: 1.5, gap: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Package size={14} strokeWidth={1.75} color={T.gold} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.gold, letterSpacing: '0.02em' }}>Phase 2 — Pack purchasing goes live soon. These are preview cards.</Typography>
            </Stack>
            <Box onClick={() => setNoticeDismissed(true)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'rgba(217,119,6,0.6)', flexShrink: 0, '&:hover': { color: T.gold }, transition: 'color 0.15s' }}>
              <X size={14} strokeWidth={2} />
            </Box>
          </Box>
        )}
        {error && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 2, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
            <AlertCircle size={14} color={T.live} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.75rem', color: T.live }}>{error}</Typography>
          </Box>
        )}
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={3.5}>
          <Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '2rem', md: '2.6rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Packs</Typography>
            <Typography sx={{ fontSize: '0.85rem', color: T.muted, mt: 0.75, lineHeight: 1.5 }}>Blind bag comic packs — pull legendary keys, rare variants, and more</Typography>
          </Box>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {FILTERS.map(f => {
              const active = f === activeFilter;
              return <Chip key={f} label={f} onClick={() => setActiveFilter(f)} size="small" sx={{ fontFamily: T.mono, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', height: 30, bgcolor: active ? T.blue : T.surfaceB, color: active ? '#fff' : T.muted, border: `1px solid ${active ? T.blue : T.border}`, borderRadius: 1, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: active ? '#005fcc' : T.surface, color: active ? '#fff' : T.white }, '& .MuiChip-label': { px: 1.5 } }} />;
            })}
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2.5 } }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <PackCardSkeleton key={i} />)
            : packs.map(pack => <PackCard key={pack.id} pack={pack} onOpen={handleOpenPack} opening={openingPackId === pack.id} />)
          }
        </Box>
      </Container>
    </Box>
  );
}
