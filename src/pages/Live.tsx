import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Stack, Skeleton } from '@mui/material';
import { Radio, Calendar, AlertCircle, Tv } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { supabase } from '../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

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

const FALLBACK: Stream[] = [
  { id: 'f1', title: 'Sunday Silver Age Comics Auction',         thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 312, category: 'Comics',        seller_id: '', seller_username: 'silveragedan',   seller_avatar: null, scheduled_start_time: null },
  { id: 'f2', title: 'Golden Age Keys Break — JSA & CGC Slabs', thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 521, category: 'Comics',        seller_id: '', seller_username: 'comicvaultpdx', seller_avatar: null, scheduled_start_time: null },
  { id: 'f3', title: 'LIVE: Funko Haul Breakdown',              thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 201, category: 'Collectibles',  seller_id: '', seller_username: 'funkopop_deals', seller_avatar: null, scheduled_start_time: null },
  { id: 'f4', title: 'LIVE: Anime Figure Flash Sale',           thumbnail_url: null, is_live: true,  status: 'live',      current_viewers: 88,  category: 'Anime',         seller_id: '', seller_username: 'animevault_jp', seller_avatar: null, scheduled_start_time: null },
  { id: 'f5', title: 'MTG Reserved List Cards',                 thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Trading Cards', seller_id: '', seller_username: 'mtglegacy',      seller_avatar: null, scheduled_start_time: new Date(Date.now() + 30 * 60000).toISOString() },
  { id: 'f6', title: 'Pokémon Vintage Set Break — Base to Neo', thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Trading Cards', seller_id: '', seller_username: 'pkmncollector',  seller_avatar: null, scheduled_start_time: new Date(Date.now() + 2 * 3600000).toISOString() },
  { id: 'f7', title: 'Spider-Man Key Issues Box Break',         thumbnail_url: null, is_live: false, status: 'scheduled', current_viewers: 0,   category: 'Comics',        seller_id: '', seller_username: 'keymaster88',    seller_avatar: null, scheduled_start_time: new Date(Date.now() + 24 * 3600000).toISOString() },
];

function picsum(seed: string, w = 600, h = 1067): string {
  const num = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 1000;
  return `https://picsum.photos/seed/${num}/${w}/${h}`;
}

function formatStartIn(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `in ${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function StreamSkeleton() {
  return (
    <Box sx={{
      bgcolor: inkstashColors.ink,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
      aspectRatio: '9 / 16',
    }}>
      <Skeleton variant="rectangular" sx={{ width: '100%', height: '100%', bgcolor: inkstashColors.bgSunken, opacity: 0.5 }} />
    </Box>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.is_live;
  const imgSrc = stream.thumbnail_url || picsum(stream.id, 540, 960);
  const handle = stream.seller_username || 'host';
  const handleInitial = handle[0]?.toUpperCase() || 'L';

  return (
    <Box
      sx={{
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: 'pointer',
        bgcolor: inkstashColors.ink,
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: inkstashShadows.lg },
      }}
    >
      <Box sx={{
        position: 'relative',
        aspectRatio: '9 / 16',
        overflow: 'hidden',
        color: '#fff',
        display: 'flex', alignItems: 'flex-end',
        backgroundImage: `url(${imgSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '&::before': {
          content: '""',
          position: 'absolute', inset: 0,
          background:
            'radial-gradient(circle at 50% 25%, rgba(255,255,255,0.10), transparent 50%),' +
            'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
        },
      }}>
        {isLive ? (
          <Box sx={{
            position: 'absolute', top: 12, left: 12, zIndex: 3,
            display: 'inline-flex', alignItems: 'center', gap: 0.65,
            bgcolor: inkstashColors.live, color: '#fff',
            fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '4px 10px 4px 8px', borderRadius: 999,
            boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
              animation: 'inkstashLiveStreamPulse 1.4s ease-in-out infinite',
            }} />
            LIVE
          </Box>
        ) : (
          <Box sx={{
            position: 'absolute', top: 12, left: 12, zIndex: 3,
            display: 'inline-flex', alignItems: 'center', gap: 0.65,
            bgcolor: inkstashColors.goldSoft,
            border: `1px solid ${inkstashColors.gold}55`,
            color: inkstashColors.gold,
            fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: 999,
          }}>
            <Calendar size={10} />
            SCHEDULED
          </Box>
        )}

        {isLive && (
          <Box sx={{
            position: 'absolute', top: 12, right: 12, zIndex: 3,
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            bgcolor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: '5px 10px',
            fontFamily: inkstashFonts.mono,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}>
            <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
              {formatViewers(stream.current_viewers)}
            </Box>
            <Box component="span" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>
              watching
            </Box>
          </Box>
        )}

        {!isLive && stream.scheduled_start_time && (
          <Box sx={{
            position: 'absolute', top: 12, right: 12, zIndex: 3,
            bgcolor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 999,
            padding: '5px 10px',
            fontFamily: inkstashFonts.mono,
            fontSize: 11, fontWeight: 600, color: '#fff',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            letterSpacing: '0.04em',
          }}>
            {formatStartIn(stream.scheduled_start_time)}
          </Box>
        )}

        {stream.category && (
          <Box sx={{
            position: 'absolute', top: '38%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-3deg)',
            fontFamily: inkstashFonts.display, fontWeight: 900,
            fontSize: 'clamp(20px, 1.7vw, 26px)',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '0.01em', textAlign: 'center',
            padding: '0 16px',
            lineHeight: 0.95,
            textShadow: '0 2px 12px rgba(0,0,0,0.55)',
            zIndex: 1,
            maxWidth: '92%',
          }}>
            {stream.category}
          </Box>
        )}

        <Box sx={{ position: 'relative', padding: '16px 16px 18px', zIndex: 2, width: '100%' }}>
          <Stack direction="row" alignItems="center" gap={0.85} sx={{ mb: 1 }}>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: inkstashFonts.display,
              fontWeight: 800, fontSize: 11,
              border: '1.5px solid rgba(255,255,255,0.18)',
            }}>
              {stream.seller_avatar ? (
                <Box
                  component="img"
                  src={stream.seller_avatar}
                  alt={handle}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : handleInitial}
            </Box>
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 11.5,
              color: 'rgba(255,255,255,0.85)', fontWeight: 500,
            }}>
              @{handle}
            </Box>
          </Stack>
          <Box sx={{
            fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}>
            {stream.title}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  accent,
  pulse,
}: {
  icon: typeof Radio;
  label: string;
  count: number;
  accent: 'live' | 'gold';
  pulse?: boolean;
}) {
  const color = accent === 'live' ? inkstashColors.live : inkstashColors.gold;
  return (
    <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 2.25 }}>
      {pulse ? (
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: color,
          animation: 'inkstashLiveStreamPulse 1.6s ease-in-out infinite',
        }} />
      ) : (
        <Icon size={16} color={color} />
      )}
      <Box sx={{
        fontFamily: inkstashFonts.display, fontWeight: 800,
        fontSize: 'clamp(16px, 2vw, 20px)',
        color: inkstashColors.ink,
        textTransform: 'uppercase',
        letterSpacing: '0.005em',
        lineHeight: 1,
      }}>
        {label}
      </Box>
      <Box sx={{
        fontFamily: inkstashFonts.mono, fontSize: 11,
        color: inkstashColors.muted2,
        letterSpacing: '0.04em',
      }}>
        {count}
      </Box>
    </Stack>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      padding: '48px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
    }}>
      <Tv size={28} strokeWidth={1.5} color={inkstashColors.muted2} />
      <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 13, color: inkstashColors.muted }}>
        {message}
      </Box>
    </Box>
  );
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'live',      label: 'Live Now' },
  { key: 'scheduled', label: 'Scheduled' },
];

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

      const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))] as string[];
      const usersMap = new Map<string, { username: string; avatar_url: string | null }>();

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

  const liveStreams      = streams.filter(s => s.is_live);
  const scheduledStreams = streams.filter(s => !s.is_live);
  const liveCount = liveStreams.length;

  const showLive      = filter === 'all' || filter === 'live';
  const showScheduled = filter === 'all' || filter === 'scheduled';

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
              Live Breaks
            </Box>
            <Box sx={{
              color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
            }}>
              Watch collectors rip in real time — chat, bid, and pull along.
            </Box>
          </Box>
          {liveCount > 0 && (
            <Stack direction="row" alignItems="center" gap={0.85} sx={{
              bgcolor: inkstashColors.brandSoft,
              border: `1px solid ${inkstashColors.brand}33`,
              color: inkstashColors.brandDeep,
              fontFamily: inkstashFonts.mono,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              padding: '6px 12px', borderRadius: 999,
            }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: inkstashColors.live,
                animation: 'inkstashLiveStreamPulse 1.6s ease-in-out infinite',
              }} />
              {liveCount} LIVE NOW
            </Stack>
          )}
        </Stack>

        <Box sx={{
          display: 'inline-flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken, borderRadius: 999,
          mb: 3.5,
        }}>
          {FILTER_TABS.map(t => {
            const active = filter === t.key;
            return (
              <Box
                key={t.key}
                component="button"
                type="button"
                onClick={() => setFilter(t.key)}
                sx={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                  bgcolor: active ? inkstashColors.bgElev : 'transparent',
                  color: active ? inkstashColors.ink : inkstashColors.ink2,
                  boxShadow: active ? inkstashShadows.sm : 'none',
                  transition: 'all 140ms ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </Box>
            );
          })}
        </Box>

        {error && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', mb: 3,
            bgcolor: inkstashColors.brandSoft,
            border: `1px solid ${inkstashColors.brand}33`,
            borderRadius: inkstashRadii.md,
            gap: 1,
          }}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <AlertCircle size={14} color={inkstashColors.brand} />
              <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.brandDeep }}>
                Failed to load streams.
              </Box>
            </Stack>
            <Box
              component="button"
              type="button"
              onClick={load}
              sx={{
                bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                color: inkstashColors.brand,
                fontFamily: inkstashFonts.ui, fontSize: 12, fontWeight: 600,
                '&:hover': { color: inkstashColors.brandDeep, textDecoration: 'underline' },
              }}
            >
              Retry
            </Box>
          </Box>
        )}

        {loading ? (
          <Box>
            {showLive && (
              <Box sx={{ mb: 5 }}>
                <SectionHeader icon={Radio} label="Live Now" count={0} accent="live" pulse />
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: { xs: '10px', md: 2 },
                }}>
                  {[1, 2, 3].map(i => <StreamSkeleton key={i} />)}
                </Box>
              </Box>
            )}
            {showScheduled && (
              <Box>
                <SectionHeader icon={Calendar} label="Coming Up" count={0} accent="gold" />
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                  gap: { xs: '10px', md: 2 },
                }}>
                  {[1, 2, 3].map(i => <StreamSkeleton key={i} />)}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            {showLive && (
              <Box sx={{ mb: 5 }}>
                <SectionHeader icon={Radio} label="Live Now" count={liveStreams.length} accent="live" pulse />
                {liveStreams.length === 0 ? (
                  <EmptySection message="No live streams right now — check back soon." />
                ) : (
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: { xs: '10px', md: 2 },
                  }}>
                    {liveStreams.map(s => <StreamCard key={s.id} stream={s} />)}
                  </Box>
                )}
              </Box>
            )}

            {showScheduled && (
              <Box>
                <SectionHeader icon={Calendar} label="Coming Up" count={scheduledStreams.length} accent="gold" />
                {scheduledStreams.length === 0 ? (
                  <EmptySection message="No scheduled streams at the moment." />
                ) : (
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: { xs: '10px', md: 2 },
                  }}>
                    {scheduledStreams.map(s => <StreamCard key={s.id} stream={s} />)}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        <style>{`
          @keyframes inkstashLiveStreamPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%      { opacity: 0.25; transform: scale(0.6); }
          }
        `}</style>
      </Container>
    </AppShell>
  );
}
