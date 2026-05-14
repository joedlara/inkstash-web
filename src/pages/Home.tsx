import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Stack, Avatar, Skeleton } from '@mui/material';
import {
  Radio,
  TrendingUp,
  Package,
  Clock,
  Eye,
  Gavel,
  ChevronRight,
  Zap,
  Users,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import DashboardHeader from '../components/home/DashboardHeader';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import {
  getLiveAndUpcomingStreams,
  getTrendingAuctions,
  getFeaturedAuctions,
  LiveStream,
  TrendingAuction,
  FeaturedAuction,
} from '../api/home';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       '#0b0c10',
  surface:  '#13141a',
  surfaceB: '#1a1b22',
  border:   'rgba(255,255,255,0.06)',
  borderLit:'rgba(255,255,255,0.12)',
  live:     '#ef4444',
  gold:     '#d97706',      // amber-600, desaturated from pure yellow
  teal:     '#0d9488',      // teal-600 as price accent
  blue:     '#0078FF',
  white:    '#f1f5f9',      // slate-100, never pure white
  muted:    'rgba(241,245,249,0.45)',
  dimmed:   'rgba(241,245,249,0.22)',
  mono:     "'DM Mono', 'Courier New', monospace",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 23) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m left`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function picsum(seed: string, w = 400, h = 280): string {
  // deterministic seed from item id so images are stable across renders
  const num = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${num}/${w}/${h}`;
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────
function AuctionSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={160} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 1.75 }}>
        <Skeleton variant="text" width="75%" sx={{ bgcolor: T.surfaceB, mb: 0.75 }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: T.surfaceB }} />
      </Box>
    </Box>
  );
}

function StreamSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={130} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 1.75 }}>
        <Skeleton variant="text" width="80%" sx={{ bgcolor: T.surfaceB, mb: 0.5 }} />
        <Skeleton variant="text" width="50%" sx={{ bgcolor: T.surfaceB }} />
      </Box>
    </Box>
  );
}

function TrendingSkeleton() {
  return (
    <>
      {[1,2,3,4,5].map(i => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.75, borderBottom: `1px solid ${T.border}` }}>
          <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: T.surfaceB, flexShrink: 0 }} />
          <Skeleton variant="text" sx={{ bgcolor: T.surfaceB, flex: 1 }} />
          <Skeleton variant="text" width={64} sx={{ bgcolor: T.surfaceB }} />
        </Box>
      ))}
    </>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        gap: 1.5,
        color: T.dimmed,
      }}
    >
      <Icon size={32} strokeWidth={1.25} />
      <Typography sx={{ fontSize: '0.82rem', color: T.dimmed, fontFamily: T.mono }}>{message}</Typography>
    </Box>
  );
}

// ── Auction card ──────────────────────────────────────────────────────────────
function AuctionCard({ item }: { item: FeaturedAuction }) {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate(`/auction/${item.id}`)}
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': {
          borderColor: T.borderLit,
          transform: 'translateY(-3px)',
        },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      {/* Image */}
      <Box sx={{ position: 'relative', height: { xs: 140, md: 170 }, overflow: 'hidden' }}>
        <Box
          component="img"
          src={item.image_url || picsum(item.id)}
          alt={item.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = picsum(item.id + 'fallback');
          }}
        />
        {/* Gradient overlay */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,12,16,0.85) 0%, transparent 55%)' }} />
        {/* Featured chip */}
        {item.is_featured && (
          <Box sx={{
            position: 'absolute', top: 8, left: 8,
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: T.gold, color: '#000',
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.07em',
            px: 0.9, py: 0.3, borderRadius: 0.75,
          }}>
            <Zap size={9} strokeWidth={2.5} />
            FEATURED
          </Box>
        )}
        {/* Time left */}
        <Box sx={{
          position: 'absolute', bottom: 8, right: 8,
          display: 'flex', alignItems: 'center', gap: 0.5,
          bgcolor: 'rgba(11,12,16,0.8)', color: T.muted,
          fontSize: '0.62rem', fontWeight: 600,
          px: 0.85, py: 0.3, borderRadius: 0.75,
          fontFamily: T.mono,
        }}>
          <Clock size={10} strokeWidth={2} />
          {timeLeft(item.end_time)}
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ p: { xs: 1.5, md: 1.75 } }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: T.white, mb: 0.4, lineHeight: 1.3 }} noWrap>
          {item.title}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: T.dimmed, mb: 1.25, fontFamily: T.mono }}>
          {item.category} · {item.condition}
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography sx={{ fontSize: '0.6rem', color: T.dimmed, mb: 0.15, fontFamily: T.mono, letterSpacing: '0.04em' }}>
              CURRENT BID
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: T.teal, fontFamily: T.mono }}>
              {formatCurrency(item.current_bid || item.buy_now_price || 0)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.dimmed }}>
            <Gavel size={11} strokeWidth={2} />
            <Typography sx={{ fontSize: '0.65rem', fontFamily: T.mono }}>{item.bid_count}</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Stream card ───────────────────────────────────────────────────────────────
function StreamCard({ stream }: { stream: LiveStream }) {
  const navigate = useNavigate();
  return (
    <Box
      onClick={() => navigate('/live')}
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': { borderColor: `rgba(239,68,68,0.3)`, transform: 'translateY(-3px)' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', height: 140, overflow: 'hidden' }}>
        <Box
          component="img"
          src={stream.thumbnail_url || picsum(stream.id, 600, 300)}
          alt={stream.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = picsum(stream.id + 'stream');
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,12,16,0.8) 0%, transparent 50%)' }} />

        {/* LIVE / SOON badge */}
        <Box
          sx={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 0.6,
            bgcolor: stream.is_live ? T.live : 'rgba(11,12,16,0.75)',
            border: stream.is_live ? 'none' : `1px solid ${T.borderLit}`,
            color: '#fff',
            fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em',
            px: 0.9, py: 0.35, borderRadius: 0.75,
          }}
        >
          <Radio
            size={8}
            strokeWidth={2.5}
            style={stream.is_live ? {
              animation: 'livePulse 1.6s ease-in-out infinite',
            } : {}}
          />
          {stream.is_live ? 'LIVE' : 'SOON'}
        </Box>

        {/* Viewer count */}
        {stream.is_live && (
          <Box
            sx={{
              position: 'absolute', bottom: 8, right: 8,
              display: 'flex', alignItems: 'center', gap: 0.5,
              bgcolor: 'rgba(11,12,16,0.75)', color: T.muted,
              fontSize: '0.62rem', fontWeight: 600, fontFamily: T.mono,
              px: 0.85, py: 0.3, borderRadius: 0.75,
            }}
          >
            <Eye size={10} strokeWidth={2} />
            {stream.current_viewers.toLocaleString()}
          </Box>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ p: 1.75, display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
        <Avatar
          src={stream.seller_avatar || undefined}
          sx={{ width: 28, height: 28, flexShrink: 0, fontSize: '0.7rem', bgcolor: T.blue }}
        >
          {stream.seller_username?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: T.white, lineHeight: 1.3 }} noWrap>
            {stream.title}
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: T.dimmed, fontFamily: T.mono, mt: 0.25 }}>
            @{stream.seller_username || 'inkstash'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [trending, setTrending] = useState<TrendingAuction[]>([]);
  const [featured, setFeatured] = useState<FeaturedAuction[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [errorStreams, setErrorStreams] = useState(false);
  const [errorTrending, setErrorTrending] = useState(false);
  const [errorFeatured, setErrorFeatured] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingStreams(true);
    setLoadingTrending(true);
    setLoadingFeatured(true);
    setErrorStreams(false);
    setErrorTrending(false);
    setErrorFeatured(false);

    const [streamsResult, trendingResult, featuredResult] = await Promise.allSettled([
      getLiveAndUpcomingStreams(),
      getTrendingAuctions(),
      getFeaturedAuctions(),
    ]);

    if (streamsResult.status === 'fulfilled') setStreams(streamsResult.value);
    else setErrorStreams(true);
    setLoadingStreams(false);

    if (trendingResult.status === 'fulfilled') setTrending(trendingResult.value);
    else setErrorTrending(true);
    setLoadingTrending(false);

    if (featuredResult.status === 'fulfilled') setFeatured(featuredResult.value);
    else setErrorFeatured(true);
    setLoadingFeatured(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!authLoading && user && !user.onboarding_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user, authLoading]);

  const liveCount = streams.filter(s => s.is_live).length;

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1) }
          50% { opacity:0.3; transform:scale(0.65) }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px) }
          to { opacity:1; transform:translateY(0) }
        }
        .hero-line-1 { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.05s }
        .hero-line-2 { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.13s }
        .hero-line-3 { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.21s }
        .hero-ctas  { animation: fadeSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; animation-delay: 0.3s }
        .section-in { animation: fadeSlideUp 0.45s cubic-bezier(0.16,1,0.3,1) both }
      `}</style>

      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <DashboardHeader />

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <Box
          sx={{
            pt: { xs: 9, md: 9 },
            pb: 0,
            background: `
              radial-gradient(ellipse 55% 60% at 10% 45%, rgba(13,148,136,0.08) 0%, transparent 70%),
              radial-gradient(ellipse 40% 50% at 90% 20%, rgba(239,68,68,0.06) 0%, transparent 65%),
              ${T.bg}
            `,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <Container maxWidth="xl">
            {/* Asymmetric split — left text heavy, right stat cluster */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
                gap: { xs: 4, md: 8 },
                py: { xs: 5, md: 8 },
                alignItems: 'center',
              }}
            >
              {/* LEFT — copy */}
              <Box>
                {/* Live stream count badge */}
                <Box
                  className="hero-line-1"
                  onClick={() => navigate('/live')}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    bgcolor: 'rgba(239,68,68,0.08)',
                    border: `1px solid rgba(239,68,68,0.22)`,
                    color: T.live,
                    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
                    px: 1.5, py: 0.6, borderRadius: 999, mb: 3.5,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.14)' },
                  }}
                >
                  <Box
                    sx={{
                      width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', flexShrink: 0,
                      animation: liveCount > 0 ? 'livePulse 1.6s ease-in-out infinite' : 'none',
                    }}
                  />
                  {liveCount > 0
                    ? `${liveCount} break${liveCount > 1 ? 's' : ''} live right now`
                    : 'Live breaks coming soon'}
                </Box>

                {/* Headline — left-aligned, large but not screaming */}
                <Box className="hero-line-2">
                  <Typography
                    sx={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 900,
                      fontSize: { xs: '2.4rem', md: '3.6rem', lg: '4.2rem' },
                      lineHeight: 1.0,
                      letterSpacing: '-0.025em',
                      color: T.white,
                      mb: 0.5,
                    }}
                  >
                    Rip packs.
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 900,
                      fontSize: { xs: '2.4rem', md: '3.6rem', lg: '4.2rem' },
                      lineHeight: 1.0,
                      letterSpacing: '-0.025em',
                      color: T.teal,
                      mb: 0.5,
                    }}
                  >
                    Chase keys.
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 900,
                      fontSize: { xs: '2.4rem', md: '3.6rem', lg: '4.2rem' },
                      lineHeight: 1.0,
                      letterSpacing: '-0.025em',
                      color: T.white,
                    }}
                  >
                    Go live.
                  </Typography>
                </Box>

                <Typography
                  className="hero-line-3"
                  sx={{
                    color: T.muted,
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    lineHeight: 1.7,
                    mt: 2.5,
                    mb: 3.5,
                    maxWidth: 440,
                  }}
                >
                  The only platform built around comic collecting. Blind bag pulls, live auction breaks, and a marketplace that speaks your language.
                </Typography>

                <Stack className="hero-ctas" direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/packs')}
                    sx={{
                      bgcolor: T.teal,
                      color: '#fff',
                      fontWeight: 700,
                      px: 3.5,
                      py: 1.5,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      fontFamily: "'Outfit', sans-serif",
                      boxShadow: 'none',
                      '&:hover': { bgcolor: '#0f766e', boxShadow: 'none' },
                      '&:active': { transform: 'translateY(1px)' },
                    }}
                  >
                    Browse Packs
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/live')}
                    sx={{
                      bgcolor: 'transparent',
                      borderColor: T.borderLit,
                      color: T.white,
                      fontWeight: 600,
                      px: 3.5,
                      py: 1.5,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      fontFamily: "'Outfit', sans-serif",
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.25)' },
                      '&:active': { transform: 'translateY(1px)' },
                    }}
                  >
                    Watch Live
                  </Button>
                </Stack>
              </Box>

              {/* RIGHT — stat cluster (asymmetric) */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1.5,
                  alignSelf: 'center',
                }}
              >
                {[
                  { label: 'Active Auctions', value: featured.length > 0 ? `${featured.length}+` : '—', icon: Package, accent: T.teal },
                  { label: 'Live Now', value: liveCount > 0 ? String(liveCount) : '—', icon: Radio, accent: T.live },
                  { label: 'Trending Items', value: trending.length > 0 ? `${trending.length}` : '—', icon: TrendingUp, accent: T.gold },
                  { label: 'Collectors', value: '2.4k+', icon: Users, accent: T.blue },
                ].map(({ label, value, icon: Icon, accent }) => (
                  <Box
                    key={label}
                    sx={{
                      bgcolor: T.surface,
                      border: `1px solid ${T.border}`,
                      borderRadius: 2,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}
                  >
                    <Icon size={18} color={accent} strokeWidth={1.75} />
                    <Typography sx={{ fontFamily: T.mono, fontSize: '1.5rem', fontWeight: 700, color: T.white, lineHeight: 1 }}>
                      {value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: T.dimmed, letterSpacing: '0.04em' }}>
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>

          {/* ── Featured Auctions ── */}
          <Box className="section-in" sx={{ mb: { xs: 5, md: 7 } }}>
            <SectionRow
              title="Open Now"
              sub="Active auctions and buy-now listings"
              cta="View all"
              onCta={() => navigate('/marketplace')}
            />

            {loadingFeatured ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
                {[1,2,3,4].map(i => <AuctionSkeleton key={i} />)}
              </Box>
            ) : errorFeatured ? (
              <ErrorRow onRetry={loadData} />
            ) : featured.length === 0 ? (
              <EmptyState icon={Package} message="No active listings yet — check back soon" />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1.5, md: 2 } }}>
                {featured.map(item => <AuctionCard key={item.id} item={item} />)}
              </Box>
            )}
          </Box>

          {/* ── Two-col layout: Live Breaks (wider) + Trending (narrower) ── */}
          <Box
            className="section-in"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' },
              gap: { xs: 5, lg: 4 },
              alignItems: 'start',
            }}
          >
            {/* Live Breaks */}
            <Box>
              <SectionRow
                title="Live Breaks"
                sub={liveCount > 0 ? `${liveCount} stream${liveCount > 1 ? 's' : ''} live` : 'No active streams'}
                cta="See all"
                onCta={() => navigate('/live')}
              />

              {loadingStreams ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[1,2,3].map(i => <StreamSkeleton key={i} />)}
                </Box>
              ) : errorStreams ? (
                <ErrorRow onRetry={loadData} />
              ) : streams.length === 0 ? (
                <EmptyState icon={Radio} message="No live or upcoming breaks right now" />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {streams.slice(0, 3).map(s => <StreamCard key={s.id} stream={s} />)}
                </Box>
              )}
            </Box>

            {/* Trending — sidebar-style with divide-y pattern */}
            <Box>
              <SectionRow
                title="Trending"
                sub="Most-bid this week"
                cta="Marketplace"
                onCta={() => navigate('/marketplace')}
              />

              <Box
                sx={{
                  bgcolor: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {loadingTrending ? (
                  <TrendingSkeleton />
                ) : errorTrending ? (
                  <ErrorRow onRetry={loadData} />
                ) : trending.length === 0 ? (
                  <EmptyState icon={TrendingUp} message="No trending data yet" />
                ) : (
                  trending.map((item, idx) => (
                    <Box
                      key={item.id}
                      onClick={() => navigate(`/auction/${item.id}`)}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '24px 1fr auto',
                        alignItems: 'center',
                        gap: 1.75,
                        px: 2.25,
                        py: 1.6,
                        borderBottom: idx < trending.length - 1 ? `1px solid ${T.border}` : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.13s',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
                        '&:active': { bgcolor: 'rgba(255,255,255,0.04)' },
                      }}
                    >
                      <Typography
                        sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.dimmed, fontWeight: 500 }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{ fontWeight: 600, fontSize: '0.82rem', color: T.white, lineHeight: 1.3 }}
                          noWrap
                        >
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: T.dimmed, fontFamily: T.mono }}>
                          {item.bid_count} bid{item.bid_count !== 1 ? 's' : ''} · {item.category}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.82rem', color: T.teal, flexShrink: 0 }}
                      >
                        {formatCurrency(item.current_bid)}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </Box>
          </Box>

        </Container>
      </Box>

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
}

// ── Section header row ────────────────────────────────────────────────────────
function SectionRow({
  title, sub, cta, onCta,
}: { title: string; sub?: string; cta: string; onCta: () => void }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2}>
      <Box>
        <Typography
          sx={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 800,
            fontSize: '1.05rem',
            color: T.white,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: '0.7rem', color: T.dimmed, fontFamily: T.mono, mt: 0.3 }}>
            {sub}
          </Typography>
        )}
      </Box>
      <Box
        onClick={onCta}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.4,
          color: T.muted, fontSize: '0.75rem', cursor: 'pointer',
          fontWeight: 600,
          transition: 'color 0.15s',
          '&:hover': { color: T.white },
          flexShrink: 0,
        }}
      >
        {cta}
        <ChevronRight size={13} strokeWidth={2.5} />
      </Box>
    </Stack>
  );
}

// ── Error row ─────────────────────────────────────────────────────────────────
function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        py: 3, color: T.dimmed,
      }}
    >
      <AlertCircle size={16} strokeWidth={1.5} />
      <Typography sx={{ fontSize: '0.8rem', color: T.dimmed }}>Failed to load.</Typography>
      <Box
        onClick={onRetry}
        sx={{ fontSize: '0.8rem', color: T.teal, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
      >
        Retry
      </Box>
    </Box>
  );
}
