import { useState } from 'react';
import { Box, Container, Typography, Stack, Button, Chip } from '@mui/material';
import { X, Package, BookOpen } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Static pack data ──────────────────────────────────────────────────────────
interface Pack {
  id: string;
  name: string;
  partner: string;
  price: number;
  items: number;
  badge: string;
  legendaryOdds: string;
  rareOdds: string;
  commonOdds: string;
  image: string;
}

const PACKS: Pack[] = [
  { id: 'p1', name: 'DC Legends Pack',        partner: 'DC × InkStash',    price: 14.99, items: 5, badge: 'COLLAB',    legendaryOdds: '2%',  rareOdds: '18%', commonOdds: '80%', image: 'https://picsum.photos/seed/dc1/400/520' },
  { id: 'p2', name: 'Spider-Verse Keys',      partner: 'InkStash House',   price: 24.99, items: 3, badge: 'HOT',       legendaryOdds: '5%',  rareOdds: '25%', commonOdds: '70%', image: 'https://picsum.photos/seed/spider1/400/520' },
  { id: 'p3', name: 'Image Horror Bundle',    partner: 'Image × InkStash', price: 19.99, items: 4, badge: 'NEW',       legendaryOdds: '1%',  rareOdds: '14%', commonOdds: '85%', image: 'https://picsum.photos/seed/horror1/400/520' },
  { id: 'p4', name: 'Conan Keys Pack',        partner: 'BOOM! × InkStash', price: 0,     items: 5, badge: 'SOLD OUT',  legendaryOdds: '3%',  rareOdds: '22%', commonOdds: '75%', image: 'https://picsum.photos/seed/conan1/400/520' },
  { id: 'p5', name: 'Marvel Silver Age',      partner: 'InkStash House',   price: 34.99, items: 6, badge: 'HOT',       legendaryOdds: '8%',  rareOdds: '30%', commonOdds: '62%', image: 'https://picsum.photos/seed/marvel1/400/520' },
  { id: 'p6', name: 'Golden Age Mystery Box', partner: 'InkStash House',   price: 49.99, items: 4, badge: 'NEW',       legendaryOdds: '10%', rareOdds: '35%', commonOdds: '55%', image: 'https://picsum.photos/seed/golden1/400/520' },
];

const FILTERS = ['All', 'Comics', 'Keys', 'Graded', 'Limited'];

// ── Pack card ─────────────────────────────────────────────────────────────────
function PackCard({ pack }: { pack: Pack }) {
  const bm = BADGE_META[pack.badge] ?? { bg: T.blue, fg: '#fff' };
  const soldOut = pack.badge === 'SOLD OUT';

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: soldOut ? 'default' : 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': soldOut
          ? {}
          : {
              borderColor: T.borderLit,
              transform: 'translateY(-4px)',
            },
      }}
    >
      {/* Image area */}
      <Box sx={{ position: 'relative', aspectRatio: '400/520', overflow: 'hidden' }}>
        <Box
          component="img"
          src={pack.image}
          alt={pack.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: soldOut ? 'grayscale(60%) brightness(0.65)' : 'none',
            transition: 'transform 0.3s',
            '.MuiBox-root:hover &': soldOut ? {} : { transform: 'scale(1.03)' },
          }}
        />

        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '55%',
            background: `linear-gradient(to top, ${T.surface} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Status badge */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            px: 1,
            py: 0.35,
            bgcolor: bm.bg,
            color: bm.fg,
            fontFamily: T.mono,
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            borderRadius: 0.75,
          }}
        >
          {pack.badge}
        </Box>
      </Box>

      {/* Info section */}
      <Box sx={{ p: 2, pt: 1.75, display: 'flex', flexDirection: 'column', flex: 1, gap: 1 }}>
        {/* Pack name */}
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '0.95rem',
            color: T.white,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {pack.name}
        </Typography>

        {/* Partner */}
        <Typography
          sx={{
            fontFamily: T.mono,
            fontSize: '0.65rem',
            color: T.muted,
            letterSpacing: '0.04em',
          }}
        >
          {pack.partner}
        </Typography>

        {/* Item count */}
        <Stack direction="row" alignItems="center" gap={0.75}>
          <BookOpen size={11} strokeWidth={1.75} color={T.dimmed} />
          <Typography
            sx={{
              fontFamily: T.mono,
              fontSize: '0.65rem',
              color: T.dimmed,
            }}
          >
            {pack.items} comics per pack
          </Typography>
        </Stack>

        {/* Odds row */}
        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
          {/* Legendary */}
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.gold, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>
              LEG {pack.legendaryOdds}
            </Typography>
          </Stack>
          {/* Rare */}
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.blue, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>
              RARE {pack.rareOdds}
            </Typography>
          </Stack>
          {/* Common */}
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#374151', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.dimmed }}>
              COM {pack.commonOdds}
            </Typography>
          </Stack>
        </Stack>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Price + CTA */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
          <Typography
            sx={{
              fontFamily: T.mono,
              fontWeight: 700,
              fontSize: '1rem',
              color: soldOut ? T.dimmed : T.white,
            }}
          >
            {soldOut ? '—' : `$${pack.price.toFixed(2)}`}
          </Typography>

          <Button
            variant="contained"
            disabled={soldOut}
            size="small"
            sx={{
              fontFamily: T.mono,
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              px: 2,
              py: 0.75,
              bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : T.blue,
              color: soldOut ? '#6b7280' : '#fff',
              borderRadius: 1.25,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : '#005fcc',
                boxShadow: 'none',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(55,65,81,0.6)',
                color: '#6b7280',
              },
            }}
          >
            {soldOut ? 'Sold Out' : 'Open Pack'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Packs() {
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.bg }}>
      <DashboardHeader />

      <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

        {/* Notice bar */}
        {!noticeDismissed && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              mb: 3,
              bgcolor: 'rgba(217,119,6,0.1)',
              border: `1px solid rgba(217,119,6,0.25)`,
              borderRadius: 1.5,
              gap: 1,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <Package size={14} strokeWidth={1.75} color={T.gold} />
              <Typography
                sx={{
                  fontFamily: T.mono,
                  fontSize: '0.7rem',
                  color: T.gold,
                  letterSpacing: '0.02em',
                }}
              >
                Phase 2 — Pack purchasing goes live soon. These are preview cards.
              </Typography>
            </Stack>
            <Box
              onClick={() => setNoticeDismissed(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: 'rgba(217,119,6,0.6)',
                flexShrink: 0,
                '&:hover': { color: T.gold },
                transition: 'color 0.15s',
              }}
            >
              <X size={14} strokeWidth={2} />
            </Box>
          </Box>
        )}

        {/* Page header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          gap={2}
          mb={3.5}
        >
          {/* Title block */}
          <Box>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: { xs: '1.6rem', md: '2rem' },
                color: T.white,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              Packs
            </Typography>
            <Typography
              sx={{
                fontFamily: T.mono,
                fontSize: '0.72rem',
                color: T.muted,
                mt: 0.5,
                letterSpacing: '0.02em',
              }}
            >
              Blind bag comic packs — pull legendary keys, rare variants, and more
            </Typography>
          </Box>

          {/* Filter chips */}
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {FILTERS.map(f => {
              const active = f === activeFilter;
              return (
                <Chip
                  key={f}
                  label={f}
                  onClick={() => setActiveFilter(f)}
                  size="small"
                  sx={{
                    fontFamily: T.mono,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    height: 28,
                    bgcolor: active ? T.blue : T.surfaceB,
                    color: active ? '#fff' : T.muted,
                    border: `1px solid ${active ? T.blue : T.border}`,
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    '&:hover': {
                      bgcolor: active ? '#005fcc' : T.surface,
                      color: active ? '#fff' : T.white,
                    },
                    '& .MuiChip-label': { px: 1.25 },
                  }}
                />
              );
            })}
          </Stack>
        </Stack>

        {/* Pack grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: { xs: 1.5, md: 2.5 },
          }}
        >
          {PACKS.map(pack => (
            <PackCard key={pack.id} pack={pack} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
