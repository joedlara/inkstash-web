import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Chip,
  Skeleton,
  Stack,
  Select,
  MenuItem,
  Button,
  FormControl,
} from '@mui/material';
import { Clock, Gavel, Package, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../api/supabase/supabaseClient';
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuctionRow {
  id: string;
  title: string;
  current_bid: number;
  starting_bid: number;
  buy_now_price: number | null;
  bid_count: number;
  category: string;
  condition: string;
  image_url: string | null;
  end_time: string;
  status: string;
  is_featured: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeLeft(end: string): string {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 23) return `${Math.floor(h / 24)}d left`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m left`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fallbackImage(id: string): string {
  return `https://picsum.photos/seed/${id}/480/320`;
}

// ── Sort types ────────────────────────────────────────────────────────────────
type SortKey = 'ending_soon' | 'newest' | 'most_bids' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'newest',      label: 'Newest' },
  { value: 'most_bids',  label: 'Most Bids' },
  { value: 'price_asc',  label: 'Price: Low-High' },
  { value: 'price_desc', label: 'Price: High-Low' },
];

const CATEGORIES = ['All', 'Comics', 'Trading Cards', 'Funko Pop', 'Figures'];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
      }}
    >
      <Skeleton variant="rectangular" height={180} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 1.75 }}>
        <Skeleton variant="text" width="78%" sx={{ bgcolor: T.surfaceB, mb: 0.75 }} />
        <Skeleton variant="text" width="50%" sx={{ bgcolor: T.surfaceB, mb: 1.25 }} />
        <Skeleton variant="text" width="60%" sx={{ bgcolor: T.surfaceB }} />
      </Box>
    </Box>
  );
}

// ── Auction card ──────────────────────────────────────────────────────────────
function AuctionCard({ item }: { item: AuctionRow }) {
  const navigate = useNavigate();

  return (
    <Box
      onClick={() => navigate('/auction/' + item.id)}
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': { borderColor: T.borderLit, transform: 'translateY(-4px)' },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: { xs: 150, md: 180 },
          overflow: 'hidden',
          bgcolor: T.surfaceB,
        }}
      >
        <Box
          component="img"
          src={item.image_url || fallbackImage(item.id)}
          alt={item.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = fallbackImage(item.id + '_fb');
          }}
        />
        {/* Bottom gradient */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(8,8,14,0.88) 0%, transparent 55%)',
          }}
        />

        {/* Top-left badge */}
        {item.is_featured ? (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: T.gold,
              color: '#000',
              fontSize: '0.56rem',
              fontWeight: 800,
              letterSpacing: '0.07em',
              px: 0.9,
              py: 0.3,
              borderRadius: 0.75,
            }}
          >
            <Zap size={9} strokeWidth={2.5} />
            FEATURED
          </Box>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(8,8,14,0.72)',
              border: `1px solid ${T.borderLit}`,
              color: T.muted,
              fontSize: '0.56rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              px: 0.85,
              py: 0.28,
              borderRadius: 0.75,
            }}
          >
            {item.category}
          </Box>
        )}

        {/* Bottom-right time remaining */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'rgba(8,8,14,0.75)',
            color: T.muted,
            fontSize: '0.6rem',
            fontWeight: 600,
            px: 0.85,
            py: 0.3,
            borderRadius: 0.75,
            fontFamily: T.mono,
          }}
        >
          <Clock size={10} strokeWidth={2} />
          {timeLeft(item.end_time)}
        </Box>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 1.75 } }}>
        <Typography
          noWrap
          sx={{
            fontWeight: 700,
            fontSize: '0.84rem',
            color: T.white,
            mb: 0.3,
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.66rem',
            color: T.dimmed,
            mb: 1.25,
            fontFamily: T.mono,
          }}
        >
          {item.condition}
        </Typography>

        {/* Price row */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
          <Box>
            <Typography
              sx={{
                fontSize: '0.57rem',
                color: T.dimmed,
                fontFamily: T.mono,
                letterSpacing: '0.05em',
                mb: 0.1,
              }}
            >
              CURRENT BID
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.94rem',
                color: T.blue,
                fontFamily: T.mono,
              }}
            >
              {formatCurrency(item.current_bid)}
            </Typography>
            {item.buy_now_price && (
              <Typography
                sx={{
                  fontSize: '0.62rem',
                  color: T.green,
                  fontFamily: T.mono,
                  mt: 0.2,
                }}
              >
                BIN {formatCurrency(item.buy_now_price)}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: T.dimmed, mb: 0.15 }}>
            <Gavel size={11} strokeWidth={2} />
            <Typography sx={{ fontSize: '0.65rem', fontFamily: T.mono }}>{item.bid_count}</Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Marketplace() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState<SortKey>('ending_soon');

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: dbErr } = await supabase
        .from('auctions')
        .select(
          'id, title, current_bid, starting_bid, buy_now_price, bid_count, category, condition, image_url, end_time, status, is_featured'
        )
        .in('status', ['active', 'live'])
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbErr) throw dbErr;
      setAuctions((data as AuctionRow[]) ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // Client-side filter + sort
  const displayed = useMemo(() => {
    let list = [...auctions];

    if (category !== 'All') {
      list = list.filter(a =>
        a.category?.toLowerCase().includes(category.toLowerCase())
      );
    }

    switch (sort) {
      case 'ending_soon':
        list.sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime());
        break;
      case 'newest':
        // already ordered newest first from DB; no secondary sort needed
        break;
      case 'most_bids':
        list.sort((a, b) => b.bid_count - a.bid_count);
        break;
      case 'price_asc':
        list.sort((a, b) => a.current_bid - b.current_bid);
        break;
      case 'price_desc':
        list.sort((a, b) => b.current_bid - a.current_bid);
        break;
    }

    return list;
  }, [auctions, category, sort]);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mp-fu { animation: fadeUp 0.42s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg, fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <DashboardHeader />

        {/* ── Page header ───────────────────────────────────────────────── */}
        <Box
          sx={{
            pt: { xs: 9, md: 10 },
            borderBottom: `1px solid ${T.border}`,
            bgcolor: T.bg,
          }}
        >
          <Container maxWidth="xl">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              py={{ xs: 2.5, md: 3 }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 900,
                    fontSize: { xs: '1.6rem', md: '2rem' },
                    color: T.white,
                    lineHeight: 1.15,
                    letterSpacing: '-0.025em',
                  }}
                >
                  Marketplace
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: T.muted,
                    mt: 0.35,
                  }}
                >
                  Auctions, buy-now, and graded slabs
                </Typography>
              </Box>

              {/* Active count badge */}
              {!loading && !error && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    bgcolor: 'rgba(0,120,255,0.08)',
                    border: `1px solid rgba(0,120,255,0.2)`,
                    color: T.blue,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    px: 1.4,
                    py: 0.55,
                    borderRadius: 999,
                    fontFamily: T.mono,
                  }}
                >
                  {auctions.length} active
                </Box>
              )}
            </Stack>
          </Container>
        </Box>

        {/* ── Filter bar (sticky) ───────────────────────────────────────── */}
        <Box
          sx={{
            position: 'sticky',
            top: { xs: 56, md: 64 },
            zIndex: 10,
            bgcolor: T.bg,
            borderBottom: `1px solid ${T.border}`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <Container maxWidth="xl">
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={1.5}
              py={1.5}
            >
              {/* Category chips */}
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {CATEGORIES.map(cat => {
                  const active = category === cat;
                  return (
                    <Chip
                      key={cat}
                      label={cat}
                      onClick={() => setCategory(cat)}
                      size="small"
                      sx={{
                        bgcolor: active ? T.blue : 'transparent',
                        color: active ? '#fff' : T.muted,
                        border: `1px solid ${active ? T.blue : T.border}`,
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.72rem',
                        height: 28,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        fontFamily: "'Outfit', sans-serif",
                        '&:hover': {
                          bgcolor: active ? '#0065d9' : 'rgba(255,255,255,0.05)',
                          borderColor: active ? '#0065d9' : T.borderLit,
                        },
                        '& .MuiChip-label': { px: 1.25 },
                      }}
                    />
                  );
                })}
              </Stack>

              {/* Sort dropdown */}
              <FormControl size="small">
                <Select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    color: T.muted,
                    fontFamily: "'Outfit', sans-serif",
                    height: 32,
                    minWidth: 150,
                    bgcolor: T.surface,
                    borderRadius: 1.5,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: T.borderLit },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: T.blue },
                    '& .MuiSvgIcon-root': { color: T.dimmed },
                    '& .MuiSelect-select': { py: 0.6, px: 1.25 },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: T.surfaceB,
                        border: `1px solid ${T.borderLit}`,
                        borderRadius: 1.5,
                        mt: 0.5,
                        '& .MuiMenuItem-root': {
                          fontSize: '0.75rem',
                          color: T.muted,
                          fontFamily: "'Outfit', sans-serif",
                          py: 0.85,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                          '&.Mui-selected': { bgcolor: 'rgba(0,120,255,0.12)', color: T.blue },
                          '&.Mui-selected:hover': { bgcolor: 'rgba(0,120,255,0.18)' },
                        },
                      },
                    },
                  }}
                >
                  {SORT_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Container>
        </Box>

        {/* ── Grid ─────────────────────────────────────────────────────── */}
        <Container maxWidth="xl" sx={{ py: { xs: 3.5, md: 5 } }}>
          {loading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: { xs: 2, md: 2.5 },
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </Box>
          ) : error ? (
            /* Error state */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 10,
                gap: 2,
              }}
            >
              <AlertCircle size={32} strokeWidth={1.25} color={T.dimmed} />
              <Typography sx={{ fontSize: '0.88rem', color: T.muted }}>
                Failed to load listings.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchAuctions}
                sx={{
                  borderColor: T.borderLit,
                  color: T.muted,
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  borderRadius: 1.5,
                  '&:hover': { borderColor: T.blue, color: T.blue, bgcolor: 'rgba(0,120,255,0.06)' },
                }}
              >
                Retry
              </Button>
            </Box>
          ) : displayed.length === 0 ? (
            /* Empty state */
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 10,
                gap: 2,
              }}
            >
              <Package size={32} strokeWidth={1.25} color={T.dimmed} />
              <Typography sx={{ fontSize: '0.88rem', color: T.muted }}>
                No active listings
                {category !== 'All' ? ` in ${category}` : ''}.
              </Typography>
              {category !== 'All' && (
                <Box
                  onClick={() => setCategory('All')}
                  sx={{
                    fontSize: '0.78rem',
                    color: T.blue,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Clear filter
                </Box>
              )}
            </Box>
          ) : (
            <Box
              className="mp-fu"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: { xs: 2, md: 2.5 },
              }}
            >
              {displayed.map(item => (
                <AuctionCard key={item.id} item={item} />
              ))}
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}
