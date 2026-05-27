import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import VendorPackHeader from '../components/packs/VendorPackHeader';
import CuratorNote from '../components/packs/CuratorNote';
import PackContentsGrid from '../components/packs/PackContentsGrid';
import VendorPackGuaranteeRow from '../components/packs/VendorPackGuaranteeRow';
import type { Vendor } from '../api/vendors';
import { Box, Container, Stack, Skeleton, Typography, Alert } from '@mui/material';
import { ArrowLeft, BookOpen, Sparkles, Package, ArrowRight, RotateCcw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import HoldToOpenButton from '../components/packs/HoldToOpenButton';
import RubyBundleModal from '../components/packs/RubyBundleModal';
import CardDispositionRow from '../components/packs/CardDispositionRow';
import type { Disposition } from '../components/packs/CardDispositionRow';
import RubyIcon from '../components/ui/RubyIcon';
import { packsAPI } from '../api/packs';
import { rubiesAPI } from '../api/rubies';
import { inventoryAPI } from '../api/inventory';
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

  const [pack, setPack] = useState<(Pack & { vendor: Vendor | null }) | null>(null);
  const [items, setItems] = useState<PackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [phase, setPhase] = useState<DetailPhase>('browse');
  const [revealedItems, setRevealedItems] = useState<PackItem[]>([]);
  const [flippedCount, setFlippedCount] = useState(0);
  const [chargingError, setChargingError] = useState<string | null>(null);
  /** Disposition per inventory_id (keep / sell / ship). 'pending' until user acts. */
  const [dispositions, setDispositions] = useState<Record<string, Disposition>>({});
  /** Rubies actually paid out per sold inventory_id, for the chip display. */
  const [payouts, setPayouts] = useState<Record<string, number>>({});
  /** True while any bulk mutation is in flight. Locks every row's buttons. */
  const [bulkBusy, setBulkBusy] = useState(false);

  const { balance: rubyBalance, refresh: refreshRubies } = useRubyBalance();

  useEffect(() => {
    if (!packId) return;
    setLoading(true);
    Promise.all([packsAPI.getByIdWithVendor(packId), packsAPI.listItems(packId)])
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
    setDispositions({});
    setPayouts({});
    setBulkBusy(false);
  };

  const performOpen = async () => {
    if (!pack || phase !== 'browse') return;
    setChargingError(null);
    setRevealedItems([]);
    setFlippedCount(0);
    setDispositions({});
    setPayouts({});
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

  // TODO(Phase 5+): re-wire after vendor pack reveal flow lands
  const handleBundleCredited = async () => {
    // Modal triggers onCredited after webhook lands. Refresh the pill so the
    // user sees the bumped balance, then immediately attempt the pack open.
    refreshRubies();
    setBundleModalOpen(false);
    // brief delay so the modal close animation can run before the page swaps
    setTimeout(() => performOpen(), 250);
  };

  const handleDispositionChange = (inventoryId: string, next: Disposition, payoutRubies?: number) => {
    setDispositions((prev) => ({ ...prev, [inventoryId]: next }));
    if (next === 'sold' && typeof payoutRubies === 'number') {
      setPayouts((prev) => ({ ...prev, [inventoryId]: payoutRubies }));
    }
  };

  const sellAllCommons = async () => {
    if (bulkBusy) return;
    const pending = revealedItems.filter(
      (it) =>
        it.rarity === 'common' &&
        it.inventory_id &&
        !dispositions[it.inventory_id],
    );
    if (pending.length === 0) return;

    setBulkBusy(true);
    try {
      for (const item of pending) {
        if (!item.inventory_id) continue;
        try {
          const result = await inventoryAPI.sellBack(item.inventory_id);
          setDispositions((prev) => ({ ...prev, [item.inventory_id!]: 'sold' }));
          setPayouts((prev) => ({ ...prev, [item.inventory_id!]: result.payout_rubies }));
        } catch {
          // Soft-fail per item; keep going. Other rows still process.
        }
      }
      refreshRubies();
    } finally {
      setBulkBusy(false);
    }
  };

  const keepAllRemaining = () => {
    if (bulkBusy) return;
    const next: Record<string, Disposition> = { ...dispositions };
    for (const item of revealedItems) {
      if (item.inventory_id && !next[item.inventory_id]) {
        next[item.inventory_id] = 'kept';
      }
    }
    setDispositions(next);
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
  const { bands: valueBands, hasChase: packHasChase } = computeValueBands(pack, sortedItems);

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
                pack.origin === 'vendor' ? (
                  <Stack gap={1.25} alignItems="flex-start">
                    <Box
                      component={RouterLink}
                      to={`/checkout/vendor-pack/${pack.id}`}
                      sx={{
                        display: 'inline-block',
                        bgcolor: inkstashColors.brand,
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '14px 28px',
                        borderRadius: 999,
                        fontFamily: inkstashFonts.ui,
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: '0.02em',
                        transition: 'background 140ms ease, transform 100ms ease',
                        '&:hover': { bgcolor: inkstashColors.brandDeep },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      Buy with USD — ${pack.price.toFixed(2)}
                    </Box>
                  </Stack>
                ) : hasEnoughRubies ? (
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

          {pack.origin === 'vendor' && pack.vendor && (
            <>
              <VendorPackHeader vendor={pack.vendor} />
              {pack.curator_note && (
                <CuratorNote note={pack.curator_note} vendorName={pack.vendor.display_name} />
              )}
              <PackContentsGrid items={items} />
              <VendorPackGuaranteeRow pack={pack} items={items} />
            </>
          )}

          {pack.origin !== 'vendor' && (
            <>
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

            {packHasChase && (
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  mt: 1.5,
                  padding: '8px 12px',
                  bgcolor: `${inkstashColors.gold}14`,
                  border: `1px solid ${inkstashColors.gold}40`,
                  borderRadius: inkstashRadii.sm,
                }}
              >
                <Sparkles size={13} color={inkstashColors.gold} />
                <Box
                  sx={{
                    fontFamily: inkstashFonts.mono,
                    fontSize: 10.5,
                    color: inkstashColors.ink2,
                    letterSpacing: '0.04em',
                  }}
                >
                  This pack includes <Box component="strong" sx={{ color: inkstashColors.gold, fontWeight: 700 }}>chase variants</Box> — rare pulls valued far above the pack price.
                </Box>
              </Stack>
            )}
          </Box>
            </>
          )}

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
            dispositions={dispositions}
            payouts={payouts}
            bulkBusy={bulkBusy}
            onDispositionChange={handleDispositionChange}
            onSellAllCommons={sellAllCommons}
            onKeepAllRemaining={keepAllRemaining}
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
      />
    </AppShell>
  );
}

function VariantTile({ item }: { item: PackItem }) {
  const rarityColor = RARITY_DOT[item.rarity] ?? inkstashColors.muted2;
  const ratioLabel = item.quantity > 0 && item.quantity <= 50 ? `1:${item.quantity * 50}` : null;
  const isLegendary = item.rarity === 'legendary';
  const isChase = item.is_chase === true;

  return (
    <Box
      sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${isChase || isLegendary ? inkstashColors.gold + '60' : inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
        boxShadow: isChase ? `0 0 16px ${inkstashColors.gold}33` : 'none',
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
        {isChase ? (
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
              boxShadow: `0 2px 10px ${inkstashColors.gold}aa`,
            }}
          >
            Chase
          </Box>
        ) : isLegendary && (
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
  dispositions,
  payouts,
  bulkBusy,
  onDispositionChange,
  onSellAllCommons,
  onKeepAllRemaining,
  onOpenAnother,
  onBack,
}: {
  pack: Pack;
  items: PackItem[];
  flippedCount: number;
  showSummary: boolean;
  isOpening: boolean;
  placeholderCount: number;
  dispositions: Record<string, Disposition>;
  payouts: Record<string, number>;
  bulkBusy: boolean;
  onDispositionChange: (inventoryId: string, next: Disposition, payoutRubies?: number) => void;
  onSellAllCommons: () => void;
  onKeepAllRemaining: () => void;
  onOpenAnother: () => void;
  onBack: () => void;
}) {
  const sortedItems = [...items].sort(
    (a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99),
  );
  const hasLegendary = items.some((i) => i.rarity === 'legendary');
  const cardCount = items.length > 0 ? items.length : placeholderCount;

  const pendingCommonsRubies = items
    .filter((it) => it.rarity === 'common' && it.inventory_id && dispositions[it.inventory_id] !== 'sold' && dispositions[it.inventory_id] !== 'kept' && dispositions[it.inventory_id] !== 'shipped')
    .reduce((sum, it) => sum + Math.floor((it.estimated_value ?? 0) * 90), 0);

  const hasPendingDecisions = items.some(
    (it) => it.inventory_id && !dispositions[it.inventory_id],
  );

  return (
    <Box
      sx={{
        position: 'relative',
        animation: 'inkstashFadeIn 300ms ease both',
        '@keyframes inkstashFadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {/* Reveal lives directly on the cream page surface, matching app theme. */}
      <Box
        sx={{
          position: 'relative',
          padding: { xs: '24px 8px 16px', md: '40px 16px 24px' },
          mb: showSummary ? 3 : 0,
          minHeight: { xs: 320, md: 440 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {hasLegendary && showSummary && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `radial-gradient(ellipse at center, ${inkstashColors.gold}1a 0%, transparent 65%)`,
            }}
          />
        )}

        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
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
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isOpening
              ? 'Opening pack...'
              : flippedCount < items.length
                ? `${flippedCount} / ${items.length} revealed`
                : ' '}
          </Box>
        )}

        {showSummary && hasLegendary && (
          <Box sx={{ textAlign: 'center', mt: 3, position: 'relative', zIndex: 1 }}>
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: { xs: 20, md: 24 },
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
      </Box>

      {showSummary && (
        <Box sx={{ maxWidth: 720, mx: 'auto', position: 'relative', zIndex: 1 }}>
          <Stack gap={1} mb={pendingCommonsRubies > 0 || hasPendingDecisions ? 2 : 4}>
            {sortedItems.map((item, idx) => (
              <CardDispositionRow
                key={item.id + ':' + idx}
                item={item}
                inventoryId={item.inventory_id ?? null}
                disposition={
                  item.inventory_id ? dispositions[item.inventory_id] ?? 'pending' : 'pending'
                }
                payoutRubies={item.inventory_id ? payouts[item.inventory_id] : null}
                globalBusy={bulkBusy}
                onChange={(next, payoutRubies) =>
                  item.inventory_id && onDispositionChange(item.inventory_id, next, payoutRubies)
                }
                // TODO C5: re-enable packOrigin once CardDispositionRow accepts it
                // packOrigin={pack.origin}
              />
            ))}
          </Stack>

          {hasPendingDecisions && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              gap={1.25}
              justifyContent="center"
              sx={{
                mb: 3,
                padding: '12px 16px',
                bgcolor: inkstashColors.bgSunken,
                border: `1px solid ${inkstashColors.border}`,
                borderRadius: inkstashRadii.md,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 11,
                  color: inkstashColors.muted,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  flex: 1,
                  textAlign: { xs: 'center', sm: 'left' },
                }}
              >
                Quick actions
              </Box>
              {pendingCommonsRubies > 0 && (
                <Box
                  component="button"
                  type="button"
                  onClick={onSellAllCommons}
                  disabled={bulkBusy}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: inkstashColors.brand,
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontFamily: inkstashFonts.ui,
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: bulkBusy ? 'wait' : 'pointer',
                    opacity: bulkBusy ? 0.6 : 1,
                    transition: 'background 140ms ease, transform 100ms ease, opacity 140ms ease',
                    '&:hover': bulkBusy ? {} : { bgcolor: inkstashColors.brandDeep },
                    '&:active': bulkBusy ? {} : { transform: 'scale(0.97)' },
                  }}
                >
                  {bulkBusy ? (
                    <>
                      <Box
                        sx={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          animation: 'inkstashBulkSpin 0.7s linear infinite',
                          '@keyframes inkstashBulkSpin': { to: { transform: 'rotate(360deg)' } },
                        }}
                      />
                      Selling commons...
                    </>
                  ) : (
                    <>
                      Sell all commons{' '}
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                        <RubyIcon size={11} color="#fff" />
                        {pendingCommonsRubies.toLocaleString('en-US')}
                      </Box>
                    </>
                  )}
                </Box>
              )}
              <Box
                component="button"
                type="button"
                onClick={onKeepAllRemaining}
                disabled={bulkBusy}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: 'transparent',
                  color: inkstashColors.ink2,
                  border: `1px solid ${inkstashColors.border}`,
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontFamily: inkstashFonts.ui,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                  opacity: bulkBusy ? 0.5 : 1,
                  transition: 'background 140ms ease, opacity 140ms ease',
                  '&:hover': bulkBusy ? {} : { bgcolor: inkstashColors.bgElev, color: inkstashColors.ink },
                }}
              >
                Keep everything else
              </Box>
            </Stack>
          )}

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
        width: { xs: 150, sm: 180, md: 210 },
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
  const isLegendary = item.rarity === 'legendary';
  const isRare = item.rarity === 'rare';

  return (
    <Box sx={{ perspective: '1000px', width: { xs: 160, sm: 200, md: 240 }, aspectRatio: '0.66' }}>
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
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.85,
            }}
          >
            <Sparkles size={30} color="#fff" />
          </Box>
        </Box>

        {/* Front — full art only, no info strip */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: inkstashRadii.md,
            bgcolor: inkstashColors.bgSunken,
            border: `1.5px solid ${borderColor}`,
            boxShadow: flipped ? glow : 'none',
            overflow: 'hidden',
            transition: 'box-shadow 300ms ease, transform 200ms ease',
            '&:hover': flipped ? { transform: 'rotateY(180deg) scale(1.02)' } : {},
          }}
        >
          {item.image_url ? (
            <Box
              component="img"
              src={item.image_url}
              alt={item.comic_title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${inkstashColors.brandSoft}, ${inkstashColors.bgSunken})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: inkstashFonts.display,
                fontSize: 48,
                color: inkstashColors.ink,
                opacity: 0.35,
              }}
            >
              {isLegendary ? '★' : isRare ? '◆' : '●'}
            </Box>
          )}

          {/* Rarity badge overlay */}
          {isLegendary && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                bgcolor: inkstashColors.gold,
                color: '#fff',
                padding: '4px 9px',
                borderRadius: 999,
                fontFamily: inkstashFonts.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: `0 2px 12px ${inkstashColors.gold}aa`,
              }}
            >
              Legendary
            </Box>
          )}
          {isRare && (
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                bgcolor: inkstashColors.brand,
                color: '#fff',
                padding: '4px 9px',
                borderRadius: 999,
                fontFamily: inkstashFonts.mono,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: `0 2px 12px ${inkstashColors.brand}aa`,
              }}
            >
              Rare
            </Box>
          )}
        </Box>
      </Box>
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

function computeValueBands(pack: Pack, items: PackItem[]) {
  // Each tier in the pack has a probability weight (e.g. common 0.80, rare 0.18,
  // legendary 0.02). Each item has an estimated_value. To compute the
  // probability of pulling a comic in a given value range, we need:
  //   P(value in band) = Σ_tier  P(tier) × (count of items in tier with value
  //                                          in band) / (total items in tier)
  // This is the per-draw probability — the user can read the bands as
  // "for any single comic I pull, what are the odds it's worth $X?"

  const tiers = pack.rarity_tiers;
  const valuesByRarity: Record<string, number[]> = { common: [], rare: [], legendary: [] };
  for (const item of items) {
    const v = item.estimated_value ?? 0;
    if (v > 0 && valuesByRarity[item.rarity]) valuesByRarity[item.rarity].push(v);
  }

  const allValues = items.map((i) => i.estimated_value ?? 0).filter((v) => v > 0);
  if (allValues.length === 0) {
    return {
      bands: [
        { label: '$0-10', pct: 80, color: inkstashColors.muted2 },
        { label: '$10-20', pct: 18, color: inkstashColors.brand },
        { label: '$20+', pct: 2, color: inkstashColors.gold },
      ],
      hasChase: false,
    };
  }

  // Pick bucket cutoffs so each rarity tier lands in its own bucket whenever
  // possible. Use the *max common value* as the lo cutoff (so commons fall in
  // band 1, anything above is rare+) and the *max rare value* as the hi
  // cutoff (so rares fall in band 2, chase/legendary land in band 3).
  // Falls back to spread thirds when a tier is missing.
  const commonVals = valuesByRarity.common.filter((v) => v > 0);
  const rareVals = valuesByRarity.rare.filter((v) => v > 0);

  const sortedValues = [...allValues].sort((a, b) => a - b);
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];

  let loCut: number;
  let hiCut: number;

  if (commonVals.length > 0 && rareVals.length > 0) {
    const maxCommon = Math.max(...commonVals);
    const maxRare = Math.max(...rareVals);
    // Bump cuts up by $1 so the upper-edge values fall in the *next* band
    loCut = Math.ceil(maxCommon + 0.01);
    hiCut = Math.max(loCut + 1, Math.ceil(maxRare + 0.01));
  } else {
    // Missing tiers — fall back to thirds across the actual range
    const span = Math.max(1, max - min);
    loCut = Math.round(min + span / 3);
    hiCut = Math.round(min + (2 * span) / 3);
    if (hiCut <= loCut) hiCut = loCut + 1;
  }

  // Probability-weighted distribution
  let pLo = 0, pMid = 0, pHi = 0;
  for (const rarity of ['common', 'rare', 'legendary'] as const) {
    const pool = valuesByRarity[rarity];
    const weight = tiers[rarity] ?? 0;
    if (!pool || pool.length === 0 || weight === 0) continue;
    const lo = pool.filter((v) => v < loCut).length;
    const mid = pool.filter((v) => v >= loCut && v < hiCut).length;
    const hi = pool.filter((v) => v >= hiCut).length;
    pLo += weight * (lo / pool.length);
    pMid += weight * (mid / pool.length);
    pHi += weight * (hi / pool.length);
  }

  // Renormalize (rarity tiers may not sum to exactly 1 due to floating point)
  const sum = pLo + pMid + pHi;
  if (sum > 0) {
    pLo /= sum;
    pMid /= sum;
    pHi /= sum;
  }

  const fmt = (n: number) => `$${n}`;
  const hasChase = items.some((i) => i.is_chase === true);

  return {
    bands: [
      { label: `${fmt(0)}-${fmt(loCut)}`, pct: Math.round(pLo * 100), color: inkstashColors.muted2 },
      { label: `${fmt(loCut)}-${fmt(hiCut)}`, pct: Math.round(pMid * 100), color: inkstashColors.brand },
      { label: `${fmt(hiCut)}+`, pct: Math.round(pHi * 100), color: inkstashColors.gold },
    ],
    hasChase,
  };
}
