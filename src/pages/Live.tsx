import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Avatar,
  Skeleton,
  Chip,
} from '@mui/material';
import { Radio, Eye, Calendar, AlertCircle, Tv } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { supabase } from '../api/supabase/supabaseClient';

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

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stream {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_live: boolean;
  status: string;
  current_viewers: number;
  category: string | null;
  seller_id: string;
  scheduled_start_time: string | null;
  seller_username: string | null;
  seller_avatar: string | null;
}

type FilterTab = 'all' | 'live' | 'scheduled';

// ── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK: Stream[] = [
  { id: 'f1', title: 'Sunday Silver Age Comics Auction',         thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 312, category: 'Comics',        seller_id: '', seller_username: 'silveragedan',   seller_avatar: null, scheduled_start_time: null },
  { id: 'f2', title: 'Golden Age Keys Break — JSA & CGC Slabs', thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 521, category: 'Comics',        seller_id: '', seller_username: 'comicvaultpdx', seller_avatar: null, scheduled_start_time: null },
  { id: 'f3', title: 'LIVE: Funko Haul Breakdown',              thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 201, category: 'Collectibles',  seller_id: '', seller_username: 'funkopop_deals', seller_avatar: null, scheduled_start_time: null },
  { id: 'f4', title: 'LIVE: Anime Figure Flash Sale',           thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 88,  category: 'Anime',         seller_id: '', seller_username: 'animevault_jp', seller_avatar: null, scheduled_start_time: null },
  { id: 'f5', title: 'MTG Reserved List Cards',                 thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Trading Cards', seller_id: '', seller_username: 'mtglegacy',      seller_avatar: null, scheduled_start_time: new Date(Date.now() + 30 * 60000).toISOString() },
  { id: 'f6', title: 'Pokémon Vintage Set Break — Base to Neo', thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Trading Cards', seller_id: '', seller_username: 'pkmncollector',  seller_avatar: null, scheduled_start_time: new Date(Date.now() + 2 * 3600000).toISOString() },
  { id: 'f7', title: 'Spider-Man Key Issues Box Break',         thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Comics',        seller_id: '', seller_username: 'keymaster88',    seller_avatar: null, scheduled_start_time: new Date(Date.now() + 24 * 3600000).toISOString() },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function picsum(seed: string, w = 600, h = 340): string {
  const num = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${num}/${w}/${h}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function StreamSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={190} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" gap={1.25} alignItems="flex-start">
          <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: T.surfaceB, flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="80%" sx={{ bgcolor: T.surfaceB, mb: 0.5 }} />
            <Skeleton variant="text" width="45%" sx={{ bgcolor: T.surfaceB }} />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptySection({ message }: { message: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1.5 }}>
      <Tv size={30} strokeWidth={1.25} color={T.dimmed} />
      <Typography sx={{ fontSize: '0.82rem', color: T.dimmed, fontFamily: T.mono }}>{message}</Typography>
    </Box>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────
function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4 }}>
      <AlertCircle size={15} strokeWidth={1.5} color={T.dimmed} />
      <Typography sx={{ fontSize: '0.78rem', color: T.dimmed }}>Failed to load streams.</Typography>
      <Box
        onClick={onRetry}
        sx={{ fontSize: '0.78rem', color: T.blue, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
      >
        Retry
      </Box>
    </Box>
  );
}

// ── Stream card ───────────────────────────────────────────────────────────────
function StreamCard({ stream }: { stream: Stream }) {
  const imgSrc = stream.thumbnail_url || picsum(stream.id);

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${stream.is_live ? 'rgba(239,68,68,0.0)' : T.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: stream.is_live ? 'rgba(239,68,68,0.35)' : T.borderLit,
          boxShadow: stream.is_live ? '0 0 20px rgba(239,68,68,0.08)' : 'none',
        },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', height: { xs: 170, md: 190 }, overflow: 'hidden', bgcolor: T.surfaceB }}>
        <Box
          component="img"
          src={imgSrc}
          alt={stream.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = picsum(stream.id + '_fb');
          }}
        />
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(8,8,14,0.88) 0%, rgba(8,8,14,0.1) 55%, transparent 100%)',
          }}
        />

        {/* LIVE / SOON badge — top-left */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 0.6,
            bgcolor: stream.is_live ? T.live : 'rgba(8,8,14,0.75)',
            border: stream.is_live ? 'none' : `1px solid ${T.borderLit}`,
            color: '#fff',
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            px: 0.9,
            py: 0.4,
            borderRadius: 0.75,
          }}
        >
          <Radio
            size={8}
            strokeWidth={2.5}
            style={stream.is_live ? { animation: 'livePulse 1.6s ease-in-out infinite' } : {}}
          />
          {stream.is_live ? 'LIVE' : 'SOON'}
        </Box>

        {/* Viewer count — bottom-right (live only) */}
        {stream.is_live && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(8,8,14,0.75)',
              color: T.muted,
              fontSize: '0.6rem',
              fontWeight: 600,
              fontFamily: T.mono,
              px: 0.85,
              py: 0.35,
              borderRadius: 0.75,
            }}
          >
            <Eye size={10} strokeWidth={2} />
            {formatViewers(stream.current_viewers)}
          </Box>
        )}

        {/* Scheduled time — bottom-right (scheduled only) */}
        {!stream.is_live && stream.scheduled_start_time && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(8,8,14,0.75)',
              color: T.muted,
              fontSize: '0.6rem',
              fontWeight: 600,
              fontFamily: T.mono,
              px: 0.85,
              py: 0.35,
              borderRadius: 0.75,
            }}
          >
            <Calendar size={10} strokeWidth={2} />
            {formatTime(stream.scheduled_start_time)}
          </Box>
        )}
      </Box>

      {/* Card body */}
      <Box sx={{ p: { xs: 1.5, md: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Avatar
          src={stream.seller_avatar || undefined}
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            fontSize: '0.7rem',
            bgcolor: T.blue,
            border: stream.is_live ? `1.5px solid rgba(239,68,68,0.5)` : `1.5px solid ${T.border}`,
          }}
        >
          {(stream.seller_username?.[0] ?? 'I').toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{ fontWeight: 700, fontSize: '0.85rem', color: T.white, lineHeight: 1.35, mb: 0.3 }}
            noWrap
          >
            {stream.title}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontSize: '0.66rem', color: T.dimmed, fontFamily: T.mono }}>
              @{stream.seller_username ?? 'inkstash'}
            </Typography>
            {stream.category && (
              <Chip
                label={stream.category}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(0,120,255,0.1)',
                  color: T.blue,
                  border: `1px solid rgba(0,120,255,0.2)`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label, count, color }: { icon: React.ElementType; label: string; count: number; color: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25} mb={2.5}>
      <Icon size={16} strokeWidth={2} color={color} />
      <Typography
        sx={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 800,
          fontSize: '0.95rem',
          color: T.white,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          bgcolor: color === T.live ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
          color: color === T.live ? T.live : T.dimmed,
          fontSize: '0.62rem',
          fontWeight: 700,
          fontFamily: T.mono,
          px: 0.85,
          py: 0.25,
          borderRadius: 0.75,
          border: `1px solid ${color === T.live ? 'rgba(239,68,68,0.22)' : T.border}`,
        }}
      >
        {count}
      </Box>
    </Stack>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Live() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error: dbErr } = await supabase
        .from('livestreams')
        .select('id, title, thumbnail_url, is_live, status, current_viewers, category, seller_id, scheduled_start_time')
        .in('status', ['live', 'scheduled'])
        .order('is_live', { ascending: false })
        .order('current_viewers', { ascending: false })
        .limit(12);

      if (dbErr || !data || data.length === 0) {
        setStreams(FALLBACK);
        setLoading(false);
        return;
      }

      // Fetch seller info
      const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))] as string[];
      let usersMap = new Map<string, { username: string; avatar_url: string | null }>();

      if (sellerIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .in('id', sellerIds);
        (users || []).forEach((u: any) => {
          usersMap.set(u.id, { username: u.username, avatar_url: u.avatar_url });
        });
      }

      const mapped: Stream[] = data.map((row: any) => {
        const u = usersMap.get(row.seller_id);
        return {
          id: row.id,
          title: row.title,
          thumbnail_url: row.thumbnail_url,
          is_live: row.is_live ?? false,
          status: row.status,
          current_viewers: row.current_viewers ?? 0,
          category: row.category ?? null,
          seller_id: row.seller_id,
          scheduled_start_time: row.scheduled_start_time,
          seller_username: u?.username ?? null,
          seller_avatar: u?.avatar_url ?? null,
        };
      });

      setStreams(mapped);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const liveStreams = streams.filter(s => s.is_live);
  const scheduledStreams = streams.filter(s => !s.is_live);
  const liveCount = liveStreams.length;

  const showLive      = filter === 'all' || filter === 'live';
  const showScheduled = filter === 'all' || filter === 'scheduled';

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'live',      label: 'Live Now' },
    { key: 'scheduled', label: 'Scheduled' },
  ];

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.25; transform: scale(0.6); }
        }
      `}</style>

      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <DashboardHeader />

        {/* ── Page header ── */}
        <Box
          sx={{
            pt: { xs: 9, md: 10 },
            borderBottom: `1px solid ${T.border}`,
            background: `
              radial-gradient(ellipse 60% 80% at 10% 50%, rgba(239,68,68,0.05) 0%, transparent 70%),
              ${T.bg}
            `,
          }}
        >
          <Container maxWidth="xl">
            <Box
              sx={{
                py: { xs: 4, md: 5 },
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              {/* Left — title + subtitle */}
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 900,
                    fontSize: { xs: '2rem', md: '2.6rem' },
                    color: T.white,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    mb: 0.75,
                  }}
                >
                  Live Breaks
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.5, maxWidth: 420 }}>
                  Watch collectors break packs, auction keys, and drop exclusives
                </Typography>
              </Box>

              {/* Right — live count badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: liveCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${liveCount > 0 ? 'rgba(239,68,68,0.22)' : T.border}`,
                  color: liveCount > 0 ? T.live : T.dimmed,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  px: 1.75,
                  py: 0.85,
                  borderRadius: 999,
                  flexShrink: 0,
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                }}
              >
                {liveCount > 0 && (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      bgcolor: T.live,
                      borderRadius: '50%',
                      flexShrink: 0,
                      animation: 'livePulse 1.6s ease-in-out infinite',
                    }}
                  />
                )}
                {liveCount > 0
                  ? `${liveCount} stream${liveCount !== 1 ? 's' : ''} live now`
                  : 'No streams live'}
              </Box>
            </Box>

            {/* Filter tabs */}
            <Stack direction="row" gap={0.75} pb={0} sx={{ overflowX: 'auto', pb: 0 }}>
              {FILTER_TABS.map(tab => (
                <Box
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  sx={{
                    px: 1.75,
                    py: 0.75,
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    mb: 0,
                    transition: 'background 0.14s, color 0.14s',
                    whiteSpace: 'nowrap',
                    color: filter === tab.key ? T.white : T.muted,
                    bgcolor: filter === tab.key ? 'rgba(255,255,255,0.09)' : 'transparent',
                    border: `1px solid ${filter === tab.key ? T.borderLit : 'transparent'}`,
                    '&:hover': {
                      bgcolor: filter === tab.key ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                      color: T.white,
                    },
                  }}
                >
                  {tab.label}
                  {tab.key === 'live' && liveCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ml: 0.75,
                        px: 0.6,
                        py: 0.1,
                        borderRadius: 0.5,
                        bgcolor: T.live,
                        color: '#fff',
                        fontSize: '0.55rem',
                        fontWeight: 800,
                        verticalAlign: 'middle',
                      }}
                    >
                      {liveCount}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>

            {/* Tab underline bar */}
            <Box sx={{ height: '2px', mt: 0.75, bgcolor: T.border, borderRadius: 1 }}>
              <Box sx={{ height: '100%', width: 0, bgcolor: 'transparent' }} />
            </Box>
          </Container>
        </Box>

        {/* ── Main content ── */}
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>

          {/* Error state */}
          {error && <ErrorRetry onRetry={load} />}

          {/* Loading state */}
          {loading && !error && (
            <>
              {/* Live section skeleton */}
              <Box sx={{ mb: { xs: 5, md: 7 } }}>
                <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Skeleton variant="circular" width={16} height={16} sx={{ bgcolor: T.surfaceB }} />
                  <Skeleton variant="text" width={100} sx={{ bgcolor: T.surfaceB }} />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                    gap: { xs: 2, md: 2.5 },
                  }}
                >
                  {[1, 2, 3].map(i => <StreamSkeleton key={i} />)}
                </Box>
              </Box>
              {/* Scheduled section skeleton */}
              <Box>
                <Box sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Skeleton variant="circular" width={16} height={16} sx={{ bgcolor: T.surfaceB }} />
                  <Skeleton variant="text" width={120} sx={{ bgcolor: T.surfaceB }} />
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                    gap: { xs: 2, md: 2.5 },
                  }}
                >
                  {[1, 2, 3].map(i => <StreamSkeleton key={i} />)}
                </Box>
              </Box>
            </>
          )}

          {/* Streams content */}
          {!loading && !error && (
            <>
              {/* Live Now section */}
              {showLive && (
                <Box sx={{ mb: { xs: 5, md: 7 } }}>
                  <SectionLabel icon={Radio} label="Live Now" count={liveStreams.length} color={T.live} />
                  {liveStreams.length === 0 ? (
                    <EmptySection message="No live streams right now — check back soon" />
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                        gap: { xs: 2, md: 2.5 },
                      }}
                    >
                      {liveStreams.map(s => <StreamCard key={s.id} stream={s} />)}
                    </Box>
                  )}
                </Box>
              )}

              {/* Coming Up section */}
              {showScheduled && (
                <Box>
                  <SectionLabel icon={Calendar} label="Coming Up" count={scheduledStreams.length} color={T.gold} />
                  {scheduledStreams.length === 0 ? (
                    <EmptySection message="No scheduled streams at the moment" />
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
                        gap: { xs: 2, md: 2.5 },
                      }}
                    >
                      {scheduledStreams.map(s => <StreamCard key={s.id} stream={s} />)}
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>
    </>
  );
}
