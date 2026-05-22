import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Container, Stack, Skeleton, Typography, Alert } from '@mui/material';
import { ArrowLeft, BookOpen, Sparkles, Package, ArrowRight, RotateCcw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import HoldToOpenButton from '../components/packs/HoldToOpenButton';
import RubyBundleModal from '../components/packs/RubyBundleModal';
import RubyIcon from '../components/ui/RubyIcon';
import { packsAPI } from '../api/packs';
import { rubiesAPI } from '../api/rubies';
import { useRubyBalance } from '../hooks/useRubyBalance';
import { packPriceToRubies } from '../config/rubyBundles';
import type { Pack, PackItem } from '../api/packs';
import {
  inkstashColors,
  inkstashFonts,
  inkstashRadii,
  inkstashShadows,
} from '../theme/inkstashTokens';

type DetailPhase = 'browse' | 'opening' | 'revealing' | 'summary';

const RARITY_LABEL: Record<string, string> = {
  legendary: 'Legendary',
  rare: 'Rare',
  common: 'Common',
};

const RARITY_DOT: Record<string, string> = {
  legendary: inkstashColors.gold,
  rare: inkstashColors.brand,
  common: inkstashColors.muted2,
};

const RARITY_GLOW: Record<string, string> = {
  legendary: '0 0 48px rgba(184,137,58,0.6), 0 0 16px rgba(184,137,58,0.35)',
  rare: '0 0 32px rgba(161,35,44,0.45), 0 0 8px rgba(161,35,44,0.25)',
  common: '0 0 20px rgba(0,0,0,0.08)',
};

const RARITY_BORDER: Record<string, string> = {
  legendary: inkstashColors.gold,
  rare: inkstashColors.brand,
  common: inkstashColors.border,
};

const RARITY_ORDER: Record<string, number> = { legendary: 0, rare: 1, common: 2 };

export default function PackDetail() {
  const navigate = useNavigate();
  const { packId } = useParams<{ packId: string }>();

  const [pack, setPack] = useState<Pack | null>(null);
  const [items, setItems] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [phase, setPhase] = useState<DetailPhase>('browse');
  const [revealedItems, setRevealedItems] = useState<PackItem[]>([]);
  const [flippedCount, setFlippedCount] = useState(0);
  const [chargingError, setChargingError] = useState<string | null>(null);

  const { balance: rubyBalance, refresh: refreshRubies } = useRubyBalance();

  useEffect(() => {
    if (!packId) return;
    setLoading(true);
    Promise.all([packsAPI.getById(packId), packsAPI.listItems(packId)])
      .then(([packData, itemList]) => {
        if (!packData) {
          setError('Pack not found');
          return;
        }
        setPack(packData);
        setItems(itemList);
      })
      .catch(() => setError('Failed to load pack'))
      .finally(() => setLoading(false));
  }, [packId]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    if (flippedCount >= revealedItems.length) return;
    const delay = flippedCount === 0 ? 800 : 1100;
    const t = setTimeout(() => setFlippedCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [phase, flippedCount, revealedItems.length]);

  useEffect(() => {
    if (
      phase === 'revealing' &&
      flippedCount === revealedItems.length &&
      revealedItems.length > 0
    ) {
      const t = setTimeout(() => setPhase('summary'), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, flippedCount, revealedItems.length]);

  const rubyCost = pack ? packPriceToRubies(pack.price) : 0;
  const hasEnoughRubies = rubyBalance >= rubyCost;

  const handleOpenAnother = () => {
    setPhase('browse');
    setRevealedItems([]);
    setFlippedCount(0);
  };

  const performOpen = async () => {
    if (!pack || phase !== 'browse') return;
    setChargingError(null);
    setRevealedItems([]);
    setFlippedCount(0);
    setPhase('opening');
    try {
      const result = await rubiesAPI.openPackWithRubies(pack.id);
      setRevealedItems(result.items);
      setPhase('revealing');
      // Explicit refresh so the pill ticks down even if Realtime is delayed.
      refreshRubies();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open pack';
      if (msg.includes('insufficient_rubies')) {
        // Balance drifted under us (rare). Fall through to bundle modal.
        setPhase('browse');
        setBundleModalOpen(true);
        return;
      }
      setChargingError(msg);
      setPhase('browse');
    }
  };

  const handleOpenAttempt = () => {
    if (!pack || phase !== 'browse') return;
    if (!hasEnoughRubies) {
      setBundleModalOpen(true);
      return;
    }
    performOpen();
  };

  const handleBundleCredited = async () => {
    // Modal triggers onCredited after webhook lands. Refresh the pill so the
    // user sees the bumped balance, then immediately attempt the pack open.
    refreshRubies();
    setBundleModalOpen(false);
    // brief delay so the modal close animation can run before the page swaps
    setTimeout(() => performOpen(), 250);
  };

  if (loading) {
    return (
      <AppShell>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Skeleton variant="rectangular" height={360} sx={{ bgcolor: inkstashColors.bgSunken, borderRadius: inkstashRadii.lg, mb: 4 }} />
          <Skeleton variant="text" width="40%" height={32} sx={{ bgcolor: inkstashColors.bgSunken, mb: 2 }} />
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" sx={{ aspectRatio: '0.7', bgcolor: inkstashColors.bgSunken, borderRadius: inkstashRadii.md }} />
            ))}
          </Box>
        </Container>
      </AppShell>
    );
  }

  if (error || !pack) {
    return (
      <AppShell>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 24, color: inkstashColors.ink, mb: 2 }}>
            {error ?? 'Pack not found'}
          </Typography>
          <Box
            component="button"
            type="button"
            onClick={() => navigate('/packs')}
            sx={{
              bgcolor: inkstashColors.ink,
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 999,
              fontFamily: inkstashFonts.ui,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Back to Packs
          </Box>
        </Container>
      </AppShell>
    );
  }

  const sortedItems = [...items].sort(
    (a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99),
  );

  const expectedValue = computeExpectedValue(pack, sortedItems);
  const valueBands = computeValueBands(sortedItems);

  const browseVisible = phase === 'browse';
  const revealVisible = phase === 'opening' || phase === 'revealing' || phase === 'summary';

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8, pt: 2 }}>
        {/* Back link */}
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/packs')}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            bgcolor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: inkstashColors.muted,
            fontFamily: inkstashFonts.mono,
            fontSize: 11.5,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: 0,
            mb: 2.5,
            '&:hover': { color: inkstashColors.ink },
          }}
        >
          <ArrowLeft size={14} />
          All Packs
        </Box>

        {/* BROWSE STATE — hero, odds, gallery */}
        <Box
          sx={{
            opacity: browseVisible ? 1 : 0,
            transform: browseVisible ? 'translateY(0)' : 'translateY(-12px)',
            transition: 'opacity 280ms ease, transform 280ms ease',
            pointerEvents: browseVisible ? 'auto' : 'none',
            display: browseVisible ? 'block' : 'none',
            width: '100%',
          }}
        >
          {/* Hero */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
              gap: { xs: 3, md: 5 },
              alignItems: 'center',
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
              padding: { xs: 3, md: 5 },
              mb: 4,
            }}
          >
            <Box>
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 11.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: inkstashColors.muted,
                  mb: 1.5,
                }}
              >
                {pack.partner}
              </Box>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: { xs: 32, md: 44 },
                  lineHeight: 1.02,
                  letterSpacing: '0.005em',
                  textTransform: 'uppercase',
                  color: inkstashColors.ink,
                  mb: 1.5,
                }}
              >
                {pack.name}
              </Typography>

              <Stack direction="row" alignItems="center" gap={2} mb={3}>
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <BookOpen size={14} color={inkstashColors.muted} />
                  <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted }}>
                    {pack.item_count} comics per pack
                  </Box>
                </Stack>
                <Box sx={{ width: 1, height: 14, bgcolor: inkstashColors.border }} />
                <Stack direction="row" alignItems="center" gap={0.75}>
                  <Sparkles size={14} color={inkstashColors.muted} />
                  <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted }}>
                    {items.length} possible variants
                  </Box>
                </Stack>
              </Stack>

              <Stack direction="row" alignItems="center" gap={1.5} mb={3}>
                <RubyIcon size={28} glow />
                <Box
                  sx={{
                    fontFamily: inkstashFonts.display,
                    fontWeight: 800,
                    fontSize: 40,
                    color: inkstashColors.ink,
                    lineHeight: 1,
                  }}
                >
                  {rubyCost.toLocaleString('en-US')}
                </Box>
                <Box
                  sx={{
                    fontFamily: inkstashFonts.mono,
                    fontSize: 11,
                    color: inkstashColors.muted,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  per pack
                </Box>
              </Stack>

              {pack.status === 'active' ? (
                hasEnoughRubies ? (
                  <Stack gap={1.25} alignItems="flex-start">
                    <HoldToOpenButton
                      label="Hold to Open"
                      onComplete={handleOpenAttempt}
                      busy={phase !== 'browse'}
                    />
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <RubyIcon size={11} />
                      <Box
                        sx={{
                          fontFamily: inkstashFonts.mono,
                          fontSize: 11,
                          color: inkstashColors.muted,
                          letterSpacing: '0.04em',
                        }}
                      >
                        Balance: {rubyBalance.toLocaleString('en-US')}
                      </Box>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack gap={1.25} alignItems="flex-start">
                    <Box
                      component="button"
                      type="button"
                      onClick={handleOpenAttempt}
                      sx={{
                        bgcolor: inkstashColors.brand,
                        color: '#fff',
                        border: 'none',
                        padding: '14px 26px',
                        borderRadius: 999,
                        fontFamily: inkstashFonts.ui,
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        transition: 'background 140ms ease, transform 100ms ease',
                        '&:hover': { bgcolor: inkstashColors.brandDeep },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      <RubyIcon size={16} color="#fff" />
                      Buy Rubies to Open
                    </Box>
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <RubyIcon size={11} />
                      <Box
                        sx={{
                          fontFamily: inkstashFonts.mono,
                          fontSize: 11,
                          color: inkstashColors.muted,
                          letterSpacing: '0.04em',
                        }}
                      >
                        Balance: {rubyBalance.toLocaleString('en-US')} · need {(rubyCost - rubyBalance).toLocaleString('en-US')} more
                      </Box>
                    </Stack>
                  </Stack>
                )
              ) : (
                <Box
                  sx={{
                    bgcolor: inkstashColors.bgSunken,
                    color: inkstashColors.muted,
                    padding: '16px 32px',
                    borderRadius: 999,
                    fontFamily: inkstashFonts.ui,
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: '0.02em',
                  }}
                >
                  {pack.status === 'sold_out' ? 'Sold Out' : 'Coming Soon'}
                </Box>
              )}

              {chargingError && (
                <Alert
                  severity="error"
                  onClose={() => setChargingError(null)}
                  sx={{ mt: 2, fontFamily: inkstashFonts.ui }}
                >
                  {chargingError}
                </Alert>
              )}
            </Box>

            <Box
              sx={{
                aspectRatio: '4 / 5',
                borderRadius: inkstashRadii.md,
                overflow: 'hidden',
                bgcolor: inkstashColors.bgSunken,
                border: `1px solid ${inkstashColors.border}`,
                boxShadow: inkstashShadows.md,
              }}
            >
              {pack.cover_image ? (
                <Box
                  component="img"
                  src={pack.cover_image}
                  alt={pack.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={56} color={inkstashColors.muted2} />
                </Box>
              )}
            </Box>
          </Box>

          {/* Value Odds */}
          <Box
            sx={{
              bgcolor: inkstashColors.bgElev,
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: inkstashRadii.lg,
              padding: { xs: 3, md: 4 },
              mb: 4,
            }}
          >
            <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 800,
                  fontSize: 18,
                  textTransform: 'uppercase',
                  letterSpacing: '0.005em',
                  color: inkstashColors.ink,
                }}
              >
                Value Odds
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 11,
                  color: inkstashColors.muted,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Expected: ${expectedValue.toFixed(2)}
              </Box>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              {valueBands.map((band) => (
                <Box
                  key={band.label}
                  sx={{
                    bgcolor: inkstashColors.bgSunken,
                    border: `1px solid ${inkstashColors.border}`,
                    borderRadius: inkstashRadii.md,
                    padding: { xs: 1.5, md: 2 },
                    textAlign: 'center',
                  }}
                >
                  <Box
                    sx={{
                      fontFamily: inkstashFonts.mono,
                      fontSize: 11,
                      color: inkstashColors.muted,
                      letterSpacing: '0.06em',
                      mb: 0.75,
                    }}
                  >
                    {band.label}
                  </Box>
                  <Box
                    sx={{
                      fontFamily: inkstashFonts.display,
                      fontWeight: 800,
                      fontSize: 28,
                      color: band.color,
                      lineHeight: 1,
                    }}
                  >
                    {band.pct}%
                  </Box>
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                mt: 2,
                fontFamily: inkstashFonts.mono,
                fontSize: 10.5,
                color: inkstashColors.muted,
                letterSpacing: '0.04em',
              }}
            >
              Expected value is the average value of comics pulled across many pack opens. Individual results vary.
            </Box>
          </Box>

          {/* Variant gallery */}
          <Box sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 800,
                fontSize: 22,
                textTransform: 'uppercase',
                letterSpacing: '0.005em',
                color: inkstashColors.ink,
                mb: 2,
              }}
            >
              What's inside
            </Typography>

            {items.length === 0 ? (
              <Box
                sx={{
                  bgcolor: inkstashColors.bgElev,
                  border: `1px solid ${inkstashColors.border}`,
                  borderRadius: inkstashRadii.md,
                  padding: 4,
                  textAlign: 'center',
                  color: inkstashColors.muted,
                  fontFamily: inkstashFonts.mono,
                  fontSize: 13,
                }}
              >
                Variant list not available for this pack yet.
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(5, 1fr)',
                  },
                  gap: { xs: 1.5, md: 2 },
                }}
              >
                {sortedItems.map((item) => (
                  <VariantTile key={item.id} item={item} />
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {/* REVEAL STATE — overlays browse content position. Renders pack-back
            placeholders during 'opening' while charge-saved-card runs. */}
        {revealVisible && (
          <RevealStage
            pack={pack}
            items={revealedItems}
            flippedCount={flippedCount}
            showSummary={phase === 'summary'}
            isOpening={phase === 'opening'}
            placeholderCount={pack.item_count}
            onOpenAnother={handleOpenAnother}
            onBack={() => navigate('/packs')}
          />
        )}
      </Container>

      <RubyBundleModal
        open={bundleModalOpen}
        onClose={() => setBundleModalOpen(false)}
        requiredRubies={rubyCost}
        currentBalance={rubyBalance}
        onCredited={handleBundleCredited}
      />
    </AppShell>
  );
}

function VariantTile({ item }: { item: PackItem }) {
  const rarityColor = RARITY_DOT[item.rarity] ?? inkstashColors.muted2;
  const ratioLabel = item.quantity > 0 && item.quantity <= 50 ? `1:${item.quantity * 50}` : null;

  return (
    <Box
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${item.rarity === 'legendary' ? inkstashColors.gold + '60' : inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: rarityColor,
        },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '0.66', bgcolor: inkstashColors.bgSunken }}>
        {item.image_url ? (
          <Box
            component="img"
            src={item.image_url}
            alt={item.comic_title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={28} color={inkstashColors.muted2} />
          </Box>
        )}
        {item.rarity === 'legendary' && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: inkstashColors.gold,
              color: '#fff',
              padding: '3px 8px',
              borderRadius: 999,
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Legendary
          </Box>
        )}
        {ratioLabel && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(22,17,14,0.85)',
              color: '#fff',
              padding: '3px 7px',
              borderRadius: 999,
              fontFamily: inkstashFonts.mono,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            {ratioLabel}
          </Box>
        )}
      </Box>
      <Box sx={{ padding: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 12.5,
            color: inkstashColors.ink,
            lineHeight: 1.2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis',
          }}
        >
          {item.comic_title}
        </Box>
        {item.issue_number && (
          <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, letterSpacing: '0.04em' }}>
            {item.issue_number}{item.grade ? ` · ${item.grade}` : ''}
          </Box>
        )}
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 'auto', pt: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: rarityColor }} />
          <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10, color: inkstashColors.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {RARITY_LABEL[item.rarity] ?? item.rarity}
          </Box>
          {item.estimated_value != null && (
            <>
              <Box sx={{ flex: 1 }} />
              <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 700, color: inkstashColors.ink }}>
                ${item.estimated_value.toFixed(2)}
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function RevealStage({
  pack,
  items,
  flippedCount,
  showSummary,
  isOpening,
  placeholderCount,
  onOpenAnother,
  onBack,
}: {
  pack: Pack;
  items: PackItem[];
  flippedCount: number;
  showSummary: boolean;
  isOpening: boolean;
  placeholderCount: number;
  onOpenAnother: () => void;
  onBack: () => void;
}) {
  const sortedItems = [...items].sort(
    (a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99),
  );
  const hasLegendary = items.some((i) => i.rarity === 'legendary');
  const cardCount = items.length > 0 ? items.length : placeholderCount;

  return (
    <Box
      sx={{
        py: { xs: 3, md: 6 },
        position: 'relative',
        animation: 'inkstashFadeIn 300ms ease both',
        '@keyframes inkstashFadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {hasLegendary && showSummary && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(ellipse at center, ${inkstashColors.gold}26 0%, transparent 70%)`,
            zIndex: 0,
          }}
        />
      )}

      <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.muted,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            mb: 1,
          }}
        >
          {pack.partner}
        </Box>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: { xs: 24, md: 32 },
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            color: inkstashColors.ink,
          }}
        >
          {pack.name}
        </Typography>
      </Box>

      {!showSummary && (
        <Stack
          direction="row"
          gap={{ xs: 1.5, md: 2.5 }}
          flexWrap="wrap"
          justifyContent="center"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          {isOpening
            ? Array.from({ length: cardCount }).map((_, idx) => (
                <PlaceholderCard key={'ph-' + idx} index={idx} />
              ))
            : items.map((item, idx) => (
                <FlipCard key={item.id + ':' + idx} item={item} flipped={idx < flippedCount} />
              ))}
        </Stack>
      )}

      {!showSummary && (
        <Box
          sx={{
            textAlign: 'center',
            mt: 3,
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.muted,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {isOpening
            ? 'Opening pack...'
            : flippedCount < items.length
              ? `${flippedCount} / ${items.length} revealed`
              : ' '}
        </Box>
      )}

      {showSummary && (
        <Box sx={{ maxWidth: 640, mx: 'auto', position: 'relative', zIndex: 1 }}>
          {hasLegendary && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontWeight: 900,
                  fontSize: 22,
                  color: inkstashColors.gold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em',
                }}
              >
                Legendary Pull
              </Typography>
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 11,
                  color: inkstashColors.muted,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mt: 0.5,
                }}
              >
                Top tier drop — exceptional find
              </Box>
            </Box>
          )}

          <Stack gap={1} mb={4}>
            {sortedItems.map((item, idx) => (
              <SummaryRow key={item.id + ':' + idx} item={item} />
            ))}
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={1.5}
            justifyContent="center"
          >
            <Box
              component="button"
              type="button"
              onClick={onOpenAnother}
              sx={{
                bgcolor: inkstashColors.brand,
                color: '#fff',
                border: 'none',
                padding: '14px 28px',
                borderRadius: 999,
                fontFamily: inkstashFonts.ui,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                transition: 'background 140ms ease, transform 100ms ease',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              <RotateCcw size={15} />
              Open Another Pack
            </Box>
            <Box
              component="button"
              type="button"
              onClick={onBack}
              sx={{
                bgcolor: 'transparent',
                color: inkstashColors.ink2,
                border: `1px solid ${inkstashColors.border}`,
                padding: '14px 28px',
                borderRadius: 999,
                fontFamily: inkstashFonts.ui,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                transition: 'background 140ms ease, color 140ms ease',
                '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
              }}
            >
              Back to Packs
              <ArrowRight size={15} />
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  return (
    <Box
      sx={{
        width: { xs: 140, sm: 170 },
        aspectRatio: '0.66',
        borderRadius: inkstashRadii.md,
        background: `linear-gradient(135deg, ${inkstashColors.brandDeep}, ${inkstashColors.ink})`,
        border: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        animation: `inkstashPackFloat 2.4s ease-in-out ${index * 0.12}s infinite`,
        '@keyframes inkstashPackFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(120deg, transparent 30%, ${inkstashColors.brand}26 50%, transparent 70%)`,
          animation: `inkstashShimmer 1.6s ease-in-out ${index * 0.08}s infinite`,
          '@keyframes inkstashShimmer': {
            '0%, 100%': { transform: 'translateX(-100%)', opacity: 0 },
            '50%': { transform: 'translateX(100%)', opacity: 1 },
          },
        },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.85,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Sparkles size={26} color="#fff" />
      </Box>
    </Box>
  );
}

function FlipCard({ item, flipped }: { item: PackItem; flipped: boolean }) {
  const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
  const glow = RARITY_GLOW[item.rarity] ?? RARITY_GLOW.common;
  const labelColor = RARITY_DOT[item.rarity] ?? inkstashColors.muted2;

  return (
    <Box sx={{ perspective: '1000px', width: { xs: 140, sm: 170 }, aspectRatio: '0.66' }}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Back */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: inkstashRadii.md,
            background: `linear-gradient(135deg, ${inkstashColors.brandDeep}, ${inkstashColors.ink})`,
            border: `1px solid ${inkstashColors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
            }}
          >
            <Sparkles size={26} color="#fff" />
          </Box>
        </Box>

        {/* Front */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: inkstashRadii.md,
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${borderColor}`,
            boxShadow: flipped ? glow : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'box-shadow 300ms ease',
          }}
        >
          <Box
            sx={{
              flex: 1,
              background: item.image_url
                ? `url(${item.image_url}) center/cover no-repeat`
                : `linear-gradient(135deg, ${inkstashColors.brandSoft}, ${inkstashColors.bgSunken})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!item.image_url && (
              <Box
                sx={{
                  fontFamily: inkstashFonts.display,
                  fontSize: 32,
                  color: inkstashColors.ink,
                  opacity: 0.4,
                }}
              >
                {item.rarity === 'legendary' ? '★' : item.rarity === 'rare' ? '◆' : '●'}
              </Box>
            )}
          </Box>
          <Box sx={{ p: 1.25, bgcolor: inkstashColors.bgElev }}>
            <Box
              sx={{
                fontFamily: inkstashFonts.ui,
                fontWeight: 700,
                fontSize: 11,
                color: inkstashColors.ink,
                lineHeight: 1.2,
                mb: 0.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.comic_title}
            </Box>
            {item.issue_number && (
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 9.5,
                  color: inkstashColors.muted,
                  mb: 0.4,
                  letterSpacing: '0.04em',
                }}
              >
                {item.issue_number}
              </Box>
            )}
            <Box
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                fontWeight: 700,
                color: labelColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {RARITY_LABEL[item.rarity] ?? item.rarity}
              {item.grade && ` · ${item.grade}`}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function SummaryRow({ item }: { item: PackItem }) {
  const labelColor = RARITY_DOT[item.rarity] ?? inkstashColors.muted2;
  const borderColor = item.rarity === 'common' ? inkstashColors.border : RARITY_BORDER[item.rarity];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '12px 16px',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${borderColor}`,
        borderRadius: inkstashRadii.md,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 58,
          borderRadius: inkstashRadii.sm,
          bgcolor: inkstashColors.bgSunken,
          flexShrink: 0,
          backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: `1px solid ${inkstashColors.border}`,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            color: inkstashColors.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.comic_title}
          {item.issue_number && (
            <Box component="span" sx={{ color: inkstashColors.muted, fontWeight: 400 }}>
              {' '}
              {item.issue_number}
            </Box>
          )}
        </Box>
        <Stack direction="row" gap={1} alignItems="center" mt={0.3}>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: labelColor,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {RARITY_LABEL[item.rarity] ?? item.rarity}
          </Box>
          {item.grade && (
            <Box
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 10.5,
                color: inkstashColors.muted,
              }}
            >
              {item.grade}
            </Box>
          )}
        </Stack>
      </Box>
      {item.estimated_value != null && (
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontWeight: 700,
            fontSize: 13,
            color: inkstashColors.ink,
            flexShrink: 0,
          }}
        >
          ~${item.estimated_value.toFixed(2)}
        </Box>
      )}
    </Box>
  );
}

function computeExpectedValue(pack: Pack, items: PackItem[]): number {
  if (items.length === 0) return pack.price;

  const byRarity: Record<string, PackItem[]> = { common: [], rare: [], legendary: [] };
  for (const item of items) {
    byRarity[item.rarity]?.push(item);
  }

  let perDraw = 0;
  for (const rarity of ['legendary', 'rare', 'common'] as const) {
    const pool = byRarity[rarity];
    const tierWeight = pack.rarity_tiers[rarity] ?? 0;
    if (!pool || pool.length === 0 || tierWeight === 0) continue;
    const avgValue =
      pool.reduce((acc, item) => acc + (item.estimated_value ?? 0), 0) / pool.length;
    perDraw += tierWeight * avgValue;
  }

  return perDraw * pack.item_count;
}

function computeValueBands(items: PackItem[]) {
  const values = items
    .map((i) => i.estimated_value ?? 0)
    .filter((v) => v > 0);

  if (values.length === 0) {
    return [
      { label: '$0-10', pct: 80, color: inkstashColors.muted2 },
      { label: '$10-20', pct: 18, color: inkstashColors.brand },
      { label: '$20+', pct: 2, color: inkstashColors.gold },
    ];
  }

  const total = values.length;
  const lo = values.filter((v) => v < 10).length;
  const mid = values.filter((v) => v >= 10 && v < 20).length;
  const hi = values.filter((v) => v >= 20).length;

  return [
    { label: '$0-10', pct: Math.round((lo / total) * 100), color: inkstashColors.muted2 },
    { label: '$10-20', pct: Math.round((mid / total) * 100), color: inkstashColors.brand },
    { label: '$20+', pct: Math.round((hi / total) * 100), color: inkstashColors.gold },
  ];
}
