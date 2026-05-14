import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Chip,
  LinearProgress,
} from '@mui/material';
import { X, Bell, Zap, Clock, Package } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';

// ── Design tokens ──────────────────────────────────────────────────────────────
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

// ── Keyframes ─────────────────────────────────────────────────────────────────
const livePulseKeyframes = `
@keyframes livePulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.25; transform: scale(0.6); }
}
`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Drop {
  id: string;
  name: string;
  partner: string;
  description: string;
  dropAt: string;
  price: number;
  quantity: number;
  remaining: number;
  status: 'live' | 'upcoming' | 'ended';
  image: string;
  tags: string[];
}

// ── Static drops data ─────────────────────────────────────────────────────────
const DROPS: Drop[] = [
  {
    id: 'd1',
    name: 'Spawn Origins Pack',
    partner: 'Image Comics × InkStash',
    description:
      'First 300 issues distilled into a 6-card blind bag. Legendary pulls include graded #1 slabs.',
    dropAt: new Date(Date.now() + 2 * 3600000 + 34 * 60000).toISOString(),
    price: 29.99,
    quantity: 500,
    remaining: 347,
    status: 'upcoming',
    image: 'https://picsum.photos/seed/spawn1/800/420',
    tags: ['Comics', 'Keys', 'Graded'],
  },
  {
    id: 'd2',
    name: 'Marvel Keys Collab',
    partner: 'Marvel × InkStash',
    description:
      'Verified key issue packs featuring 1st appearances from the Bronze and Modern age.',
    dropAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    price: 49.99,
    quantity: 250,
    remaining: 250,
    status: 'upcoming',
    image: 'https://picsum.photos/seed/marvel2/800/420',
    tags: ['Comics', 'Keys', 'Marvel'],
  },
  {
    id: 'd3',
    name: 'BOOM! Vault Drop',
    partner: 'BOOM! Studios × InkStash',
    description:
      'Limited run of Conan, Something is Killing the Children, and Power Rangers rarities.',
    dropAt: new Date(Date.now() + 3 * 24 * 3600000).toISOString(),
    price: 19.99,
    quantity: 1000,
    remaining: 1000,
    status: 'upcoming',
    image: 'https://picsum.photos/seed/boom1/800/420',
    tags: ['Comics', 'Limited'],
  },
  {
    id: 'd4',
    name: 'DC Black Label Pack',
    partner: 'DC Comics × InkStash',
    description:
      'Mature readers Black Label titles in a curated blind bag — Batman, Joker, Wonder Woman.',
    dropAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    price: 24.99,
    quantity: 400,
    remaining: 0,
    status: 'ended',
    image: 'https://picsum.photos/seed/dc2/800/420',
    tags: ['Comics', 'DC', 'Sold Out'],
  },
];

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(targetIso: string) {
  const [diff, setDiff] = useState(() =>
    Math.max(0, new Date(targetIso).getTime() - Date.now())
  );
  useEffect(() => {
    const id = setInterval(() => setDiff(d => Math.max(0, d - 1000)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return [h, m, s] as const;
}

// ── Countdown display unit ─────────────────────────────────────────────────────
function CountUnit({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        sx={{
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: { xs: '2rem', md: '2.75rem' },
          color: T.white,
          lineHeight: 1,
          letterSpacing: '-0.03em',
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontFamily: T.mono,
          fontSize: '0.58rem',
          color: T.dimmed,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function CountSep() {
  return (
    <Typography
      sx={{
        fontFamily: T.mono,
        fontWeight: 700,
        fontSize: { xs: '1.75rem', md: '2.4rem' },
        color: T.dimmed,
        lineHeight: 1,
        alignSelf: 'flex-start',
        mt: { xs: 0.1, md: 0 },
        userSelect: 'none',
      }}
    >
      :
    </Typography>
  );
}

// ── Hero banner ────────────────────────────────────────────────────────────────
function HeroBanner({ drop }: { drop: Drop }) {
  const [h, m, s] = useCountdown(drop.dropAt);
  const soldPct = Math.round(
    ((drop.quantity - drop.remaining) / drop.quantity) * 100
  );

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        mb: 5,
        border: `1px solid ${T.borderLit}`,
        minHeight: { xs: 320, md: 400 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Background image */}
      <Box
        component="img"
        src={drop.image}
        alt={drop.name}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          filter: 'brightness(0.35) saturate(0.6)',
        }}
      />

      {/* Gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(160deg, rgba(8,8,14,0.2) 0%, rgba(8,8,14,0.85) 60%, ${T.bg} 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', p: { xs: 2.5, md: 4 } }}>
        {/* Upcoming label */}
        <Stack direction="row" alignItems="center" gap={1} mb={1.75}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: T.gold,
              flexShrink: 0,
              animation: 'livePulse 1.8s ease-in-out infinite',
            }}
          />
          <Typography
            sx={{
              fontFamily: T.mono,
              fontSize: '0.62rem',
              fontWeight: 700,
              color: T.gold,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Upcoming Drop
          </Typography>
        </Stack>

        {/* Drop name */}
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: { xs: '1.75rem', md: '2.6rem' },
            color: T.white,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            mb: 0.5,
          }}
        >
          {drop.name}
        </Typography>

        {/* Partner */}
        <Typography
          sx={{
            fontFamily: T.mono,
            fontSize: '0.7rem',
            color: T.muted,
            letterSpacing: '0.04em',
            mb: 1.5,
          }}
        >
          {drop.partner}
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: { xs: '0.82rem', md: '0.92rem' },
            color: T.muted,
            maxWidth: 520,
            lineHeight: 1.55,
            mb: 2.5,
          }}
        >
          {drop.description}
        </Typography>

        {/* Countdown */}
        <Stack direction="row" alignItems="flex-start" gap={1} mb={3}>
          <CountUnit value={h} label="Hours" />
          <CountSep />
          <CountUnit value={m} label="Min" />
          <CountSep />
          <CountUnit value={s} label="Sec" />
        </Stack>

        {/* Bottom row: price + progress + CTA */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={{ xs: 2, sm: 3 }}
        >
          {/* Price */}
          <Box>
            <Typography
              sx={{
                fontFamily: T.mono,
                fontSize: '0.58rem',
                color: T.dimmed,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                mb: 0.25,
              }}
            >
              Price
            </Typography>
            <Typography
              sx={{
                fontFamily: T.mono,
                fontWeight: 700,
                fontSize: '1.35rem',
                color: T.white,
              }}
            >
              ${drop.price.toFixed(2)}
            </Typography>
          </Box>

          {/* Quantity progress */}
          <Box sx={{ flex: 1, maxWidth: 260 }}>
            <Stack direction="row" justifyContent="space-between" mb={0.75}>
              <Typography
                sx={{
                  fontFamily: T.mono,
                  fontSize: '0.6rem',
                  color: T.dimmed,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Claimed
              </Typography>
              <Typography
                sx={{
                  fontFamily: T.mono,
                  fontSize: '0.6rem',
                  color: T.muted,
                }}
              >
                {drop.quantity - drop.remaining} / {drop.quantity}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={soldPct}
              sx={{
                height: 5,
                borderRadius: 99,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: T.gold,
                  borderRadius: 99,
                },
              }}
            />
          </Box>

          {/* Notify Me button */}
          <Button
            variant="outlined"
            startIcon={<Bell size={14} strokeWidth={2} />}
            sx={{
              fontFamily: T.mono,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              px: 2.5,
              py: 1,
              color: T.white,
              borderColor: T.borderLit,
              borderRadius: 1.5,
              whiteSpace: 'nowrap',
              '&:hover': {
                borderColor: T.white,
                bgcolor: 'rgba(255,255,255,0.05)',
              },
            }}
          >
            Notify Me
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Drop card ─────────────────────────────────────────────────────────────────
function DropCard({ drop }: { drop: Drop }) {
  const [h, m, s] = useCountdown(drop.dropAt);
  const ended = drop.status === 'ended';

  // Format drop date for ended/far-future drops
  const dropDate = new Date(drop.dropAt);
  const formattedDate = dropDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${ended ? T.border : T.blue + '55'}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: ended ? 'default' : 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': ended
          ? {}
          : {
              borderColor: T.blue,
              transform: 'translateY(-4px)',
            },
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', aspectRatio: '2 / 1', overflow: 'hidden' }}>
        <Box
          component="img"
          src={drop.image}
          alt={drop.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: ended ? 'grayscale(80%) brightness(0.5)' : 'none',
            transition: 'transform 0.3s',
            '.MuiBox-root:hover &': ended ? {} : { transform: 'scale(1.04)' },
          }}
        />

        {/* Gradient */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
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
            py: 0.4,
            bgcolor: ended ? 'rgba(55,65,81,0.85)' : `${T.blue}cc`,
            backdropFilter: 'blur(4px)',
            color: ended ? '#6b7280' : '#fff',
            fontFamily: T.mono,
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            borderRadius: 0.75,
            textTransform: 'uppercase',
          }}
        >
          {ended ? 'Ended' : 'Upcoming'}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2, pt: 1.75, display: 'flex', flexDirection: 'column', flex: 1, gap: 1.25 }}>
        {/* Name */}
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '0.97rem',
            color: ended ? T.muted : T.white,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {drop.name}
        </Typography>

        {/* Partner */}
        <Typography
          sx={{
            fontFamily: T.mono,
            fontSize: '0.63rem',
            color: T.dimmed,
            letterSpacing: '0.04em',
          }}
        >
          {drop.partner}
        </Typography>

        {/* Date / countdown */}
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Clock size={11} strokeWidth={1.75} color={ended ? T.dimmed : T.muted} />
          {ended ? (
            <Typography
              sx={{ fontFamily: T.mono, fontSize: '0.63rem', color: T.dimmed }}
            >
              {formattedDate}
            </Typography>
          ) : (
            <Typography
              sx={{ fontFamily: T.mono, fontSize: '0.63rem', color: T.muted }}
            >
              {h}:{m}:{s}
            </Typography>
          )}
        </Stack>

        {/* Tags */}
        <Stack direction="row" gap={0.5} flexWrap="wrap">
          {drop.tags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                height: 20,
                fontFamily: T.mono,
                fontSize: '0.55rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                bgcolor: T.surfaceB,
                color: ended ? T.dimmed : T.muted,
                border: `1px solid ${T.border}`,
                borderRadius: 0.75,
                '& .MuiChip-label': { px: 0.9 },
              }}
            />
          ))}
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
              color: ended ? T.dimmed : T.white,
            }}
          >
            {ended ? '—' : `$${drop.price.toFixed(2)}`}
          </Typography>

          {ended ? (
            <Button
              variant="contained"
              disabled
              size="small"
              sx={{
                fontFamily: T.mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                px: 2,
                py: 0.75,
                borderRadius: 1.25,
                boxShadow: 'none',
                '&.Mui-disabled': {
                  bgcolor: 'rgba(55,65,81,0.5)',
                  color: '#6b7280',
                },
              }}
            >
              Sold Out
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Bell size={12} strokeWidth={2} />}
              sx={{
                fontFamily: T.mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                px: 1.75,
                py: 0.65,
                color: T.blue,
                borderColor: T.blue + '88',
                borderRadius: 1.25,
                boxShadow: 'none',
                '&:hover': {
                  borderColor: T.blue,
                  bgcolor: T.blue + '18',
                },
                '& .MuiButton-startIcon': { mr: 0.5 },
              }}
            >
              Notify Me
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Drops() {
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const heroDrop = DROPS.find(d => d.status === 'upcoming') ?? null;
  const gridDrops = DROPS.filter(d => d !== heroDrop);

  return (
    <>
      {/* Inject keyframes */}
      <style>{livePulseKeyframes}</style>

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
                bgcolor: 'rgba(0,120,255,0.08)',
                border: `1px solid rgba(0,120,255,0.2)`,
                borderRadius: 1.5,
                gap: 1,
              }}
            >
              <Stack direction="row" alignItems="center" gap={1}>
                <Zap size={13} strokeWidth={2} color={T.blue} />
                <Typography
                  sx={{
                    fontFamily: T.mono,
                    fontSize: '0.68rem',
                    color: 'rgba(0,120,255,0.85)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Drops are powered by publisher partnerships — Phase 4 feature, notifications coming soon.
                </Typography>
              </Stack>
              <Box
                onClick={() => setNoticeDismissed(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'rgba(0,120,255,0.4)',
                  flexShrink: 0,
                  '&:hover': { color: T.blue },
                  transition: 'color 0.15s',
                }}
              >
                <X size={14} strokeWidth={2} />
              </Box>
            </Box>
          )}

          {/* Page header */}
          <Stack mb={3}>
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
              Publisher Drops
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
              Limited releases from top publishers — countdown clocks, live inventory
            </Typography>
          </Stack>

          {/* Hero banner */}
          {heroDrop && <HeroBanner drop={heroDrop} />}

          {/* Section label */}
          <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
            <Package size={15} strokeWidth={1.75} color={T.dimmed} />
            <Typography
              sx={{
                fontFamily: T.mono,
                fontSize: '0.65rem',
                fontWeight: 700,
                color: T.dimmed,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              All Drops
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: T.border }} />
          </Stack>

          {/* Drops grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: { xs: 2, md: 3 },
            }}
          >
            {gridDrops.map(drop => (
              <DropCard key={drop.id} drop={drop} />
            ))}
          </Box>
        </Container>
      </Box>
    </>
  );
}
