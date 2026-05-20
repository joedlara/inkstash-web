import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack, Skeleton } from '@mui/material';
import { Clock, Gavel, Package, AlertCircle, Zap, ChevronDown } from 'lucide-react';
import { supabase } from '../api/supabase/supabaseClient';
import AppShell from '../components/layout/AppShell';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

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

function timeLeft(end: string): string {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 23) return `${Math.floor(h / 24)}d left`;
  if (h > 0)  return `${h}h ${m}m`;
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

type SortKey = 'ending_soon' | 'newest' | 'most_bids' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'newest',      label: 'Newest' },
  { value: 'most_bids',   label: 'Most Bids' },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'price_desc',  label: 'Price: High → Low' },
];

const CATEGORIES = ['All', 'Comics', 'Trading Cards', 'Funko Pop', 'Figures'] as const;
type Category = (typeof CATEGORIES)[number];

function CardSkeleton() {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
    }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 10', bgcolor: inkstashColors.bgSunken }} />
      <Box sx={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        <Skeleton variant="text" width="78%" height={26} sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="text" width="40%" sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="text" width="55%" height={28} sx={{ bgcolor: inkstashColors.bgSunken, mt: 0.5 }} />
      </Box>
    </Box>
  );
}

function AuctionCard({ item }: { item: AuctionRow }) {
  const navigate = useNavigate();
  const ended = timeLeft(item.end_time) === 'ended';

  return (
    <Box
      onClick={() => navigate('/auction/' + item.id)}
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${item.is_featured ? `${inkstashColors.gold}33` : inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: item.is_featured ? `${inkstashColors.gold}66` : inkstashColors.borderStrong,
        },
        '&:active': { transform: 'translateY(-1px) scale(0.99)' },
      }}
    >
      <Box sx={{
        position: 'relative',
        aspectRatio: '16 / 10',
        overflow: 'hidden',
        bgcolor: inkstashColors.bgSunken,
      }}>
        <Box
          component="img"
          src={item.image_url || fallbackImage(item.id)}
          alt={item.title}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.src = fallbackImage(item.id + '_fb');
          }}
        />
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(22,17,14,0.45) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        {item.is_featured ? (
          <Box sx={{
            position: 'absolute', top: 12, left: 12,
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            bgcolor: inkstashColors.gold,
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: 999,
          }}>
            <Zap size={10} strokeWidth={2.5} />
            FEATURED
          </Box>
        ) : (
          <Box sx={{
            position: 'absolute', top: 12, left: 12,
            bgcolor: 'rgba(22,17,14,0.7)',
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '3px 9px', borderRadius: 999,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            {item.category}
          </Box>
        )}

        <Box sx={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'inline-flex', alignItems: 'center', gap: 0.55,
          bgcolor: 'rgba(22,17,14,0.7)',
          color: '#fff',
          fontFamily: inkstashFonts.mono,
          fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
          padding: '4px 10px', borderRadius: 999,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          opacity: ended ? 0.55 : 1,
        }}>
          <Clock size={11} />
          {timeLeft(item.end_time)}
        </Box>
      </Box>

      <Box sx={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 0.85, flex: 1 }}>
        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 17, lineHeight: 1.2,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </Box>
        <Box sx={{
          fontFamily: inkstashFonts.mono, fontSize: 11,
          color: inkstashColors.muted, letterSpacing: '0.04em',
        }}>
          {item.condition}
        </Box>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-end"
          sx={{
            mt: 'auto', paddingTop: 1.25,
            borderTop: `1px solid ${inkstashColors.border}`,
          }}
        >
          <Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 10,
              color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
              mb: 0.4,
            }}>
              Current bid
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 20,
              color: inkstashColors.brand, lineHeight: 1,
            }}>
              {formatCurrency(item.current_bid)}
            </Box>
            {item.buy_now_price != null && (
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
                color: inkstashColors.gold, mt: 0.5, letterSpacing: '0.04em',
              }}>
                BIN {formatCurrency(item.buy_now_price)}
              </Box>
            )}
          </Box>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: inkstashColors.muted }}>
            <Gavel size={12} strokeWidth={2} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, fontWeight: 600 }}>
              {item.bid_count}
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

export default function Marketplace() {
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<Category>('All');
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
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          gap={2}
          sx={{ mb: 3.5 }}
        >
          <Box>
            <Box component="h1" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              Marketplace
            </Box>
            <Box sx={{
              color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
            }}>
              Auctions, buy-now, and graded slabs.
            </Box>
          </Box>

          {!loading && !error && (
            <Stack direction="row" alignItems="center" gap={0.85} sx={{
              bgcolor: inkstashColors.brandSoft,
              border: `1px solid ${inkstashColors.brand}33`,
              color: inkstashColors.brandDeep,
              fontFamily: inkstashFonts.mono,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              padding: '6px 12px', borderRadius: 999,
            }}>
              {auctions.length} ACTIVE
            </Stack>
          )}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1.5}
          sx={{
            position: 'sticky',
            top: 64,
            zIndex: 5,
            bgcolor: inkstashColors.bg,
            paddingY: 1.5,
            mb: 1,
          }}
        >
          <Box sx={{
            display: 'inline-flex', gap: 0.5, padding: 0.5,
            bgcolor: inkstashColors.bgSunken, borderRadius: 999,
            overflowX: 'auto',
            maxWidth: '100%',
            '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <Box
                  key={cat}
                  component="button"
                  type="button"
                  onClick={() => setCategory(cat)}
                  sx={{
                    padding: '6px 14px',
                    borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                    bgcolor: active ? inkstashColors.bgElev : 'transparent',
                    color: active ? inkstashColors.ink : inkstashColors.ink2,
                    boxShadow: active ? inkstashShadows.sm : 'none',
                    transition: 'all 140ms ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {cat}
                </Box>
              );
            })}
          </Box>

          <Box sx={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center',
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: 1.25,
            paddingRight: 1.25,
            transition: 'border-color 140ms ease',
            '&:hover': { borderColor: inkstashColors.borderStrong },
            '&:focus-within': { borderColor: inkstashColors.brand },
          }}>
            <Box
              component="select"
              value={sort}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as SortKey)}
              sx={{
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '8px 28px 8px 14px',
                fontFamily: inkstashFonts.ui,
                fontSize: 13, fontWeight: 500,
                color: inkstashColors.ink,
                cursor: 'pointer',
                minWidth: 170,
              }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Box>
            <Box sx={{
              position: 'absolute', right: 10, pointerEvents: 'none',
              display: 'flex', color: inkstashColors.muted,
            }}>
              <ChevronDown size={14} />
            </Box>
          </Box>
        </Stack>

        {loading ? (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: { xs: 2, md: 2.5 },
            mt: 2,
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </Box>
        ) : error ? (
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: '64px 24px',
            mt: 2,
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: inkstashColors.brandSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: inkstashColors.brand,
            }}>
              <AlertCircle size={28} strokeWidth={1.5} />
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
              textTransform: 'uppercase', color: inkstashColors.ink,
              letterSpacing: '0.005em', lineHeight: 1,
            }}>
              Failed to load listings
            </Box>
            <Box sx={{
              color: inkstashColors.ink2, fontSize: 13.5,
              maxWidth: 360, lineHeight: 1.55,
            }}>
              Something went wrong fetching the marketplace. Try again in a moment.
            </Box>
            <Box
              component="button"
              type="button"
              onClick={fetchAuctions}
              sx={{
                mt: 1,
                bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
                padding: '10px 20px', borderRadius: 1.25,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 13.5,
                cursor: 'pointer',
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Retry
            </Box>
          </Box>
        ) : displayed.length === 0 ? (
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            padding: '64px 24px',
            mt: 2,
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: inkstashColors.bgSunken,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: inkstashColors.muted,
            }}>
              <Package size={28} strokeWidth={1.5} />
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
              textTransform: 'uppercase', color: inkstashColors.ink,
              letterSpacing: '0.005em', lineHeight: 1,
            }}>
              No active listings
            </Box>
            <Box sx={{
              color: inkstashColors.ink2, fontSize: 13.5,
              maxWidth: 360, lineHeight: 1.55,
            }}>
              {category !== 'All'
                ? `Nothing live in ${category} right now. Try another category.`
                : 'Check back soon — new auctions are posted throughout the day.'}
            </Box>
            {category !== 'All' && (
              <Box
                component="button"
                type="button"
                onClick={() => setCategory('All')}
                sx={{
                  mt: 1,
                  bgcolor: 'transparent', color: inkstashColors.ink,
                  border: `1px solid ${inkstashColors.borderStrong}`,
                  padding: '10px 20px', borderRadius: 1.25,
                  fontFamily: inkstashFonts.ui, fontWeight: 500, fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'background 140ms ease',
                  '&:hover': { bgcolor: inkstashColors.bgSunken },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                Clear filter
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: { xs: 2, md: 2.5 },
            mt: 2,
          }}>
            {displayed.map(item => (
              <AuctionCard key={item.id} item={item} />
            ))}
          </Box>
        )}
      </Container>
    </AppShell>
  );
}
