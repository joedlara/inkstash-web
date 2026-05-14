import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Avatar,
  Button,
  IconButton,
  Grid,
} from '@mui/material';
import { Clock, X, Ticket, Radio } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#08080e',
  surface: '#0f0f18',
  surfaceB: '#141420',
  border: 'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue: '#0078FF',
  live: '#ef4444',
  gold: '#d97706',
  green: '#10b981',
  white: '#f1f5f9',
  muted: 'rgba(241,245,249,0.5)',
  dimmed: 'rgba(241,245,249,0.22)',
  mono: "'DM Mono', 'Courier New', monospace",
};

// ─── Static placeholder data ──────────────────────────────────────────────────
const RAFFLES = [
  {
    id: 'r1',
    item: 'ASM #300 CGC 9.8 — 1st Venom',
    host: 'comicvaultpdx',
    hostAvatar: null,
    ticketPrice: 15,
    maxSpots: 100,
    spotsFilled: 73,
    status: 'live' as const,
    endsAt: new Date(Date.now() + 45 * 60000).toISOString(),
    image: 'https://picsum.photos/seed/asm300/480/480',
    streamId: 'b2abdd5b',
    prize: '$1,200 estimated value',
  },
  {
    id: 'r2',
    item: 'Wolverine #1 CGC 9.4 — 1982 Limited Series',
    host: 'slabkingPDX',
    hostAvatar: null,
    ticketPrice: 25,
    maxSpots: 50,
    spotsFilled: 50,
    status: 'ended' as const,
    endsAt: new Date(Date.now() - 30 * 60000).toISOString(),
    image: 'https://picsum.photos/seed/wolv1/480/480',
    streamId: null,
    prize: '$3,800 estimated value',
  },
  {
    id: 'r3',
    item: 'X-Men #1 FN/VF — 1963 Silver Age',
    host: 'silveragedan',
    hostAvatar: null,
    ticketPrice: 50,
    maxSpots: 40,
    spotsFilled: 12,
    status: 'upcoming' as const,
    endsAt: new Date(Date.now() + 3 * 3600000).toISOString(),
    image: 'https://picsum.photos/seed/xmen1/480/480',
    streamId: null,
    prize: '$1,800 estimated value',
  },
  {
    id: 'r4',
    item: 'Spawn #1 Raw NM — Todd McFarlane Signed',
    host: 'imagecollect',
    hostAvatar: null,
    ticketPrice: 10,
    maxSpots: 200,
    spotsFilled: 118,
    status: 'live' as const,
    endsAt: new Date(Date.now() + 22 * 60000).toISOString(),
    image: 'https://picsum.photos/seed/spawn300/480/480',
    streamId: null,
    prize: '$450 estimated value',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'live' | 'upcoming' | 'ended' }) {
  if (status === 'live') {
    return (
      <Stack direction="row" alignItems="center" spacing={0.75}
        sx={{
          px: 1.25, py: 0.4, borderRadius: 999,
          bgcolor: 'rgba(239,68,68,0.15)',
          border: `1px solid rgba(239,68,68,0.3)`,
          display: 'inline-flex',
        }}
      >
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%',
          bgcolor: T.live,
          animation: 'livePulse 1.5s ease-in-out infinite',
        }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.live, letterSpacing: '0.06em', fontFamily: T.mono }}>
          LIVE
        </Typography>
      </Stack>
    );
  }
  if (status === 'upcoming') {
    return (
      <Box sx={{
        px: 1.25, py: 0.4, borderRadius: 999,
        bgcolor: 'rgba(0,120,255,0.15)',
        border: `1px solid rgba(0,120,255,0.3)`,
        display: 'inline-flex',
      }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.blue, letterSpacing: '0.06em', fontFamily: T.mono }}>
          UPCOMING
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{
      px: 1.25, py: 0.4, borderRadius: 999,
      bgcolor: 'rgba(255,255,255,0.06)',
      border: `1px solid ${T.border}`,
      display: 'inline-flex',
    }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.dimmed, letterSpacing: '0.06em', fontFamily: T.mono }}>
        ENDED
      </Typography>
    </Box>
  );
}

// ─── Raffle card ──────────────────────────────────────────────────────────────
type Raffle = (typeof RAFFLES)[number];

function RaffleCard({ raffle }: { raffle: Raffle }) {
  const isEnded = raffle.status === 'ended';
  const fillPct = (raffle.spotsFilled / raffle.maxSpots) * 100;
  const remaining = timeLeft(raffle.endsAt);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      bgcolor: T.surface,
      border: `1px solid ${raffle.status === 'live' ? 'rgba(239,68,68,0.22)' : T.border}`,
      borderRadius: 2,
      overflow: 'hidden',
      opacity: isEnded ? 0.65 : 1,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      ...(!isEnded && {
        '&:hover': {
          borderColor: T.borderLit,
          boxShadow: raffle.status === 'live'
            ? '0 0 0 1px rgba(239,68,68,0.18), 0 4px 24px rgba(0,0,0,0.5)'
            : `0 0 0 1px rgba(0,120,255,0.15), 0 4px 24px rgba(0,0,0,0.5)`,
        },
      }),
    }}>
      {/* Image */}
      <Box sx={{
        flexShrink: 0,
        width: { xs: '100%', sm: 200 },
        height: { xs: 220, sm: 'auto' },
        minHeight: { sm: 220 },
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box
          component="img"
          src={raffle.image}
          alt={raffle.item}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            filter: isEnded ? 'grayscale(1)' : 'none',
            transition: 'transform 0.3s',
            ...(!isEnded && { '&:hover': { transform: 'scale(1.03)' } }),
          }}
        />
        {/* Status badge overlay on mobile */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: { sm: 'none' } }}>
          <StatusBadge status={raffle.status} />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Top row: status + prize */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <StatusBadge status={raffle.status} />
          </Box>
          <Typography sx={{ fontSize: 12, color: T.gold, fontFamily: T.mono, fontWeight: 600 }}>
            {raffle.prize}
          </Typography>
        </Stack>

        {/* Item name */}
        <Typography sx={{
          fontSize: { xs: 15, sm: 16 },
          fontWeight: 700,
          color: T.white,
          fontFamily: "'Outfit', sans-serif",
          lineHeight: 1.3,
        }}>
          {raffle.item}
        </Typography>

        {/* Host */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{
            width: 22, height: 22,
            fontSize: 9, fontWeight: 700,
            bgcolor: T.blue,
            color: '#fff',
          }}>
            {raffle.hostAvatar ? (
              <Box component="img" src={raffle.hostAvatar} alt={raffle.host} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials(raffle.host)}
          </Avatar>
          <Typography sx={{ fontSize: 12, color: T.muted }}>
            hosted by{' '}
            <Box component="span" sx={{ color: T.white, fontWeight: 600 }}>
              @{raffle.host}
            </Box>
          </Typography>
          {raffle.streamId && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.25, borderRadius: 999,
              bgcolor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <Radio size={10} color={T.live} />
              <Typography sx={{ fontSize: 10, color: T.live, fontFamily: T.mono, fontWeight: 600 }}>
                ON STREAM
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Divider */}
        <Box sx={{ borderTop: `1px solid ${T.border}` }} />

        {/* Spots progress */}
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, color: T.muted }}>Spots filled</Typography>
            <Typography sx={{ fontSize: 12, fontFamily: T.mono, color: T.white }}>
              {raffle.spotsFilled} / {raffle.maxSpots}
            </Typography>
          </Stack>
          <Box sx={{ height: 4, bgcolor: T.surfaceB, borderRadius: 999, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%',
              width: `${fillPct}%`,
              bgcolor: isEnded ? 'rgba(255,255,255,0.2)' : T.blue,
              borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </Box>
          {fillPct >= 100 && !isEnded && (
            <Typography sx={{ fontSize: 11, color: T.live, mt: 0.5, fontFamily: T.mono }}>
              SOLD OUT
            </Typography>
          )}
        </Box>

        {/* Ticket price + time row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Ticket size={14} color={T.muted} />
            <Typography sx={{ fontSize: 13, color: T.muted }}>
              <Box component="span" sx={{ color: T.white, fontWeight: 700, fontFamily: T.mono }}>
                ${raffle.ticketPrice}
              </Box>
              {' '}/ ticket
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Clock size={13} color={T.muted} />
            <Typography sx={{ fontSize: 12, color: isEnded ? T.dimmed : T.muted, fontFamily: T.mono }}>
              {remaining}
            </Typography>
          </Stack>
        </Stack>

        {/* CTA */}
        {isEnded ? (
          <Button
            disabled
            fullWidth
            variant="outlined"
            sx={{
              mt: 'auto',
              py: 1.1,
              borderColor: T.border,
              color: T.dimmed,
              borderRadius: 1.5,
              fontWeight: 600,
              fontSize: 13,
              textTransform: 'none',
              cursor: 'not-allowed',
              '&.Mui-disabled': {
                borderColor: T.border,
                color: T.dimmed,
              },
            }}
          >
            Raffle Ended
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 'auto',
              py: 1.1,
              bgcolor: T.blue,
              color: '#fff',
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#005fd4',
                boxShadow: `0 0 0 3px rgba(0,120,255,0.2)`,
              },
            }}
          >
            Enter Raffle — ${raffle.ticketPrice}/ticket
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Raffles() {
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const liveCount = RAFFLES.filter((r) => r.status === 'live').length;

  // Order: live first, then upcoming, then ended
  const ordered = [...RAFFLES].sort((a, b) => {
    const rank = { live: 0, upcoming: 1, ended: 2 };
    return rank[a.status] - rank[b.status];
  });

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: T.bg,
      '@keyframes livePulse': {
        '0%, 100%': { opacity: 1, transform: 'scale(1)' },
        '50%': { opacity: 0.25, transform: 'scale(0.6)' },
      },
    }}>
      <DashboardHeader />

      <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

        {/* Notice bar */}
        {!noticeDismissed && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'rgba(0,120,255,0.09)',
            border: `1px solid rgba(0,120,255,0.2)`,
            borderRadius: 1.5,
            px: 2,
            py: 1.25,
            mb: 3,
            gap: 1,
          }}>
            <Typography sx={{ fontSize: 13, color: T.muted }}>
              <Box component="span" sx={{ color: T.blue, fontWeight: 700 }}>Note: </Box>
              Raffles are tied to live streams — Phase 4 feature. Preview mode.
            </Typography>
            <IconButton
              size="small"
              onClick={() => setNoticeDismissed(true)}
              sx={{ color: T.dimmed, p: 0.5, '&:hover': { color: T.white } }}
            >
              <X size={15} />
            </IconButton>
          </Box>
        )}

        {/* Page header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography sx={{
              fontSize: { xs: 28, md: 34 },
              fontWeight: 900,
              color: T.white,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.1,
              mb: 0.5,
            }}>
              Raffles
            </Typography>
            <Typography sx={{ fontSize: 14, color: T.muted }}>
              Live ticket raffles — winner drawn on stream
            </Typography>
          </Box>

          {/* Live raffle count pill */}
          {liveCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={1}
              sx={{
                px: 1.75, py: 0.75,
                bgcolor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 999,
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: T.live,
                animation: 'livePulse 1.5s ease-in-out infinite',
              }} />
              <Typography sx={{
                fontSize: 13, fontWeight: 700,
                color: T.live,
                fontFamily: T.mono,
              }}>
                {liveCount} LIVE NOW
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Raffle grid — 2-col asymmetric on desktop */}
        <Grid container spacing={2.5}>
          {ordered.map((raffle) => (
            <Grid
              key={raffle.id}
              item
              xs={12}
              md={6}
            >
              <RaffleCard raffle={raffle} />
            </Grid>
          ))}
        </Grid>

        {/* Empty state (if needed in future) */}
        {RAFFLES.length === 0 && (
          <Box sx={{
            textAlign: 'center',
            py: 10,
            color: T.muted,
          }}>
            <Ticket size={48} color={T.dimmed} />
            <Typography sx={{ mt: 2, fontSize: 16, color: T.muted }}>
              No raffles running right now.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
