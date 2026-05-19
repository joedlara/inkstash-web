import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Stack, Skeleton } from '@mui/material';
import { X, Package, BookOpen, AlertCircle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { packsAPI, FALLBACK_PACKS } from '../api/packs';
import type { Pack } from '../api/packs';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../theme/inkstashTokens';

const FILTERS = ['All', 'Comics', 'Keys', 'Graded', 'Limited'] as const;
type Filter = (typeof FILTERS)[number];

const BADGE_STYLES: Record<string, { bg: string; fg: string }> = {
  COLLAB:     { bg: inkstashColors.gold,    fg: '#fff' },
  HOT:        { bg: inkstashColors.brand,   fg: '#fff' },
  NEW:        { bg: inkstashColors.ink,     fg: '#fff' },
  'SOLD OUT': { bg: inkstashColors.muted2,  fg: inkstashColors.ink },
};

function rarityPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ApiPackCard({ pack, onOpen, opening }: { pack: Pack; onOpen: (id: string) => void; opening: boolean }) {
  const badge = pack.badge ?? (pack.status === 'sold_out' ? 'SOLD OUT' : 'NEW');
  const bm = BADGE_STYLES[badge] ?? { bg: inkstashColors.ink, fg: '#fff' };
  const soldOut = pack.status === 'sold_out';

  return (
    <Box
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        cursor: soldOut ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': soldOut ? {} : {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: inkstashColors.borderStrong,
          '& .pc-thumb-img': { transform: 'scale(1.04)' },
        },
      }}
    >
      {/* Thumb */}
      <Box sx={{ position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden', bgcolor: inkstashColors.bgSunken }}>
        {pack.cover_image ? (
          <Box
            component="img"
            src={pack.cover_image}
            alt={pack.name}
            className="pc-thumb-img"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: soldOut ? 'grayscale(60%) brightness(0.85)' : 'none',
              transition: 'transform 250ms ease',
            }}
          />
        ) : (
          <Box sx={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Package size={40} color={inkstashColors.muted2} />
          </Box>
        )}

        {/* Badge */}
        <Box sx={{
          position: 'absolute', top: 12, left: 12,
          bgcolor: bm.bg, color: bm.fg,
          fontFamily: inkstashFonts.mono,
          fontSize: 10.5, fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '3px 9px',
          borderRadius: 999,
          textTransform: 'uppercase',
        }}>
          {badge}
        </Box>
      </Box>

      {/* Meta */}
      <Box sx={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        <Box sx={{
          fontFamily: inkstashFonts.mono, fontSize: 10.5,
          color: inkstashColors.muted, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {pack.partner}
        </Box>

        <Box sx={{
          fontFamily: inkstashFonts.display, fontWeight: 800,
          fontSize: 20, lineHeight: 1.05,
          textTransform: 'uppercase', letterSpacing: '0.005em',
          color: inkstashColors.ink,
        }}>
          {pack.name}
        </Box>

        <Stack direction="row" alignItems="center" gap={0.75}>
          <BookOpen size={12} color={inkstashColors.muted} />
          <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted }}>
            {pack.item_count} comics per pack
          </Box>
        </Stack>

        {/* Rarity dots */}
        <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: inkstashColors.gold }} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, letterSpacing: '0.04em' }}>
              LEG {rarityPct(pack.rarity_tiers.legendary)}
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: inkstashColors.brand }} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, letterSpacing: '0.04em' }}>
              RARE {rarityPct(pack.rarity_tiers.rare)}
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: inkstashColors.muted2 }} />
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, letterSpacing: '0.04em' }}>
              COM {rarityPct(pack.rarity_tiers.common)}
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1 }} />

        {/* Footer row: price + CTA */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22,
            color: soldOut ? inkstashColors.muted2 : inkstashColors.ink,
            lineHeight: 1,
          }}>
            {soldOut ? '—' : `$${pack.price.toFixed(2)}`}
          </Box>
          <Box
            component="button"
            type="button"
            disabled={soldOut || opening}
            onClick={(e) => { e.stopPropagation(); onOpen(pack.id); }}
            sx={{
              bgcolor: soldOut ? inkstashColors.bgSunken : inkstashColors.brand,
              color: soldOut ? inkstashColors.muted : '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 1.25,
              fontFamily: inkstashFonts.ui,
              fontWeight: 600, fontSize: 13,
              cursor: soldOut || opening ? 'not-allowed' : 'pointer',
              transition: 'background 140ms ease, transform 100ms ease',
              '&:hover': soldOut ? {} : { bgcolor: inkstashColors.brandDeep },
              '&:active': soldOut ? {} : { transform: 'scale(0.97)' },
              '&:disabled': { opacity: 0.55, cursor: 'not-allowed' },
            }}
          >
            {opening ? 'Opening…' : soldOut ? 'Sold Out' : 'Open Pack'}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

function ApiPackSkeleton() {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      overflow: 'hidden',
    }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 5', width: '100%', bgcolor: inkstashColors.bgSunken }} />
      <Box sx={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="50%" sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="text" width="80%" height={28} sx={{ bgcolor: inkstashColors.bgSunken }} />
        <Skeleton variant="rectangular" height={32} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: 1, mt: 1 }} />
      </Box>
    </Box>
  );
}

export default function Packs() {
  const navigate = useNavigate();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
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
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        {/* Phase notice */}
        {!noticeDismissed && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', mb: 3,
            bgcolor: inkstashColors.goldSoft,
            border: `1px solid ${inkstashColors.gold}33`,
            borderRadius: inkstashRadii.md,
            gap: 1,
          }}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Package size={14} color={inkstashColors.gold} />
              <Box sx={{
                fontFamily: inkstashFonts.mono, fontSize: 12,
                color: inkstashColors.ink2, letterSpacing: '0.02em',
              }}>
                Phase 2 — Pack purchasing goes live soon. These are preview cards.
              </Box>
            </Stack>
            <Box
              component="button"
              type="button"
              onClick={() => setNoticeDismissed(true)}
              sx={{
                bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                color: inkstashColors.muted, display: 'flex', alignItems: 'center',
                padding: 0.5,
                '&:hover': { color: inkstashColors.ink },
              }}
            >
              <X size={14} />
            </Box>
          </Box>
        )}

        {/* Error banner */}
        {error && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            padding: '10px 16px', mb: 2.5,
            bgcolor: inkstashColors.brandSoft,
            border: `1px solid ${inkstashColors.brand}33`,
            borderRadius: inkstashRadii.md,
          }}>
            <AlertCircle size={14} color={inkstashColors.brand} />
            <Box sx={{
              fontFamily: inkstashFonts.mono, fontSize: 12,
              color: inkstashColors.brandDeep,
            }}>
              {error}
            </Box>
          </Box>
        )}

        {/* Section header */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          mb: 2.5, gap: 2,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}>
          <Box>
            <Box component="h1" sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 44px)',
              letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
              color: inkstashColors.ink,
            }}>
              Packs
            </Box>
            <Box sx={{
              color: inkstashColors.muted, fontSize: 13.5, mt: 0.75,
              lineHeight: 1.5,
            }}>
              Blind bag comic packs — pull legendary keys, rare variants, and more.
            </Box>
          </Box>

          {/* Filter pills (segmented control) */}
          <Box sx={{
            display: 'flex', gap: 0.5, padding: 0.5,
            bgcolor: inkstashColors.bgSunken, borderRadius: 999,
            flexShrink: 0,
          }}>
            {FILTERS.map(f => {
              const active = f === activeFilter;
              return (
                <Box
                  key={f}
                  component="button"
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  sx={{
                    padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                    bgcolor: active ? inkstashColors.bgElev : 'transparent',
                    color: active ? inkstashColors.ink : inkstashColors.ink2,
                    boxShadow: active ? inkstashShadows.sm : 'none',
                    transition: 'all 140ms ease',
                  }}
                >
                  {f}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Pack grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: { xs: 1.75, md: 2.5 },
        }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ApiPackSkeleton key={i} />)
            : packs.map(pack => (
                <ApiPackCard
                  key={pack.id}
                  pack={pack}
                  onOpen={handleOpenPack}
                  opening={openingPackId === pack.id}
                />
              ))
          }
        </Box>
      </Container>
    </AppShell>
  );
}
