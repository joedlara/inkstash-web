import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { packsAPI } from '../api/packs';
import type { PackItem, PackPurchase } from '../api/packs';

const T = {
  bg:        '#07070d',
  surface:   '#0f0f1a',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.45)',
  mono:      "'DM Mono', 'Courier New', monospace",
  gold:      '#f59e0b',
};

const RARITY_GLOW: Record<string, string> = {
  common:    '0 0 20px rgba(255,255,255,0.08)',
  rare:      '0 0 32px rgba(124,58,237,0.5), 0 0 8px rgba(124,58,237,0.3)',
  legendary: '0 0 48px rgba(245,158,11,0.7), 0 0 16px rgba(245,158,11,0.4)',
};

const RARITY_BORDER: Record<string, string> = {
  common:    'rgba(255,255,255,0.12)',
  rare:      'rgba(124,58,237,0.6)',
  legendary: '#f59e0b',
};

const RARITY_LABEL_COLOR: Record<string, string> = {
  common:    'rgba(255,255,255,0.5)',
  rare:      '#a78bfa',
  legendary: '#f59e0b',
};

const RARITY_ORDER: Record<string, number> = { legendary: 0, rare: 1, common: 2 };

function FlipCard({ item, flipped }: { item: PackItem; flipped: boolean }) {
  const glow = RARITY_GLOW[item.rarity] ?? RARITY_GLOW.common;
  const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
  const labelColor = RARITY_LABEL_COLOR[item.rarity] ?? RARITY_LABEL_COLOR.common;

  return (
    <Box sx={{ perspective: '1000px', width: { xs: 130, sm: 160 }, aspectRatio: '0.65', cursor: 'default' }}>
      <Box sx={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
        <Box sx={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 2, background: 'linear-gradient(135deg, #1a1035, #0d1525)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0078FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            <Sparkles size={24} color="#fff" />
          </Box>
        </Box>
        <Box sx={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderRadius: 2, background: T.surface, border: `1px solid ${borderColor}`, boxShadow: flipped ? glow : 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'box-shadow 0.3s ease' }}>
          <Box sx={{ flex: 1, background: item.image_url ? `url(${item.image_url}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1035, #0d2845)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!item.image_url && <Typography sx={{ fontSize: '2rem' }}>{item.rarity === 'legendary' ? '★' : item.rarity === 'rare' ? '◆' : '●'}</Typography>}
          </Box>
          <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.6)' }}>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.65rem', color: T.white, lineHeight: 1.2, mb: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.comic_title}</Typography>
            {item.issue_number && <Typography sx={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted, mb: 0.4 }}>{item.issue_number}</Typography>}
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.58rem', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.rarity}{item.grade && ` · ${item.grade}`}</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function SummaryRow({ item }: { item: PackItem }) {
  const labelColor = RARITY_LABEL_COLOR[item.rarity] ?? RARITY_LABEL_COLOR.common;
  const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, bgcolor: T.surface, border: `1px solid ${borderColor}`, borderRadius: 1.5 }}>
      <Box sx={{ width: 40, height: 52, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)', flexShrink: 0, backgroundImage: item.image_url ? `url(${item.image_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <Box flex={1} minWidth={0}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.comic_title}
          {item.issue_number && <Box component="span" sx={{ color: T.muted, fontWeight: 400 }}> {item.issue_number}</Box>}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center" mt={0.3}>
          <Typography sx={{ fontFamily: T.mono, fontSize: '0.62rem', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.rarity}</Typography>
          {item.grade && <Typography sx={{ fontFamily: T.mono, fontSize: '0.62rem', color: T.muted }}>{item.grade}</Typography>}
        </Stack>
      </Box>
      {item.estimated_value && <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.82rem', color: T.white, flexShrink: 0 }}>~${item.estimated_value.toFixed(2)}</Typography>}
    </Box>
  );
}

export default function PackReveal() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<PackPurchase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flippedCount, setFlippedCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!purchaseId) { setLoadError('Invalid purchase ID'); return; }
    let cancelled = false;

    (async () => {
      try {
        const existing = await packsAPI.getPurchase(purchaseId);
        if (cancelled) return;
        if (!existing) { setLoadError('Purchase not found'); return; }

        // Webhook may have created the row empty (Stripe path). If so, call
        // open-pack to roll items now and re-fetch.
        if (!existing.items_received || existing.items_received.length === 0) {
          await packsAPI.openPack(existing.pack_id, existing.stripe_payment_intent_id ?? undefined);
          if (cancelled) return;
          const refreshed = await packsAPI.getPurchase(purchaseId);
          if (cancelled) return;
          if (!refreshed) { setLoadError('Could not load opened pack'); return; }
          setPurchase(refreshed);
          return;
        }

        setPurchase(existing);
      } catch {
        if (!cancelled) setLoadError('Failed to load purchase');
      }
    })();

    return () => { cancelled = true; };
  }, [purchaseId]);

  const items: PackItem[] = purchase?.items_received ?? [];

  useEffect(() => {
    if (!purchase || items.length === 0 || flippedCount >= items.length) return;
    const timer = setTimeout(() => setFlippedCount(c => c + 1), flippedCount === 0 ? 800 : 1500);
    return () => clearTimeout(timer);
  }, [purchase, flippedCount, items.length]);

  useEffect(() => {
    if (flippedCount === items.length && items.length > 0 && !showSummary) {
      const timer = setTimeout(() => setShowSummary(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [flippedCount, items.length, showSummary]);

  const sortedItems = [...items].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 2) - (RARITY_ORDER[b.rarity] ?? 2));
  const hasLegendary = items.some(i => i.rarity === 'legendary');

  if (loadError) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ color: T.muted, fontFamily: T.mono, fontSize: '0.85rem' }}>{loadError}</Typography>
        <Button onClick={() => navigate('/packs')} sx={{ color: '#0078FF', fontFamily: T.mono, fontSize: '0.75rem' }}>Back to Packs</Button>
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: '#0078FF' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: { xs: 4, md: 6 }, pb: 8, px: 2, position: 'relative', overflow: 'hidden' }}>
      {hasLegendary && flippedCount === items.length && (
        <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.12) 0%, transparent 70%)', zIndex: 0 }} />
      )}
      <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '1.3rem', md: '1.7rem' }, color: T.white, letterSpacing: '-0.02em', mb: 0.5, textAlign: 'center', zIndex: 1 }}>
        {purchase.pack?.name ?? 'Pack Opening'}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted, mb: { xs: 3, md: 4 }, zIndex: 1 }}>
        {purchase.pack?.partner ?? ''}
      </Typography>
      {!showSummary && (
        <Stack direction="row" gap={{ xs: 1, sm: 1.5, md: 2 }} flexWrap="wrap" justifyContent="center" sx={{ zIndex: 1, mb: 2 }}>
          {items.map((item, idx) => (
            <FlipCard key={item.id + idx} item={item} flipped={idx < flippedCount} />
          ))}
        </Stack>
      )}
      {showSummary && (
        <Box sx={{ width: '100%', maxWidth: 560, zIndex: 1, animation: 'fadeUp 0.4s ease both', '@keyframes fadeUp': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } } }}>
          {hasLegendary && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.1rem', color: T.gold, letterSpacing: '-0.01em' }}>LEGENDARY PULL</Typography>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: 'rgba(245,158,11,0.6)', mt: 0.25 }}>Top 2–10% drop — exceptional find</Typography>
            </Box>
          )}
          <Stack gap={1} mb={3}>
            {sortedItems.map((item, idx) => <SummaryRow key={item.id + idx} item={item} />)}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} justifyContent="center">
            <Button variant="contained" endIcon={<ArrowRight size={16} />} onClick={() => navigate('/my-stash')} sx={{ bgcolor: '#0078FF', color: '#fff', fontFamily: T.mono, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em', px: 3, py: 1.25, borderRadius: 1.5, boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#005fcc', boxShadow: 'none' } }}>View in My Stash</Button>
            <Button variant="outlined" startIcon={<RotateCcw size={15} />} onClick={() => navigate('/packs')} sx={{ borderColor: 'rgba(255,255,255,0.15)', color: T.muted, fontFamily: T.mono, fontWeight: 600, fontSize: '0.78rem', px: 3, py: 1.25, borderRadius: 1.5, textTransform: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.3)', color: T.white, bgcolor: 'transparent' } }}>Open Another Pack</Button>
          </Stack>
        </Box>
      )}
      {!showSummary && flippedCount < items.length && (
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, mt: 2, zIndex: 1 }}>{flippedCount} / {items.length} revealed</Typography>
      )}
    </Box>
  );
}
