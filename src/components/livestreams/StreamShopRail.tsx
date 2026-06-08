// src/components/livestreams/StreamShopRail.tsx
//
// Desktop left rail. Shows the host's MARKETPLACE listings (their shop),
// not the stream's queued auction lots. Click a tile → opens the buy
// modal inside the stream surface (Add to Cart or Buy Now). Viewer
// never leaves /live/:id.
//
// Pre-2026-06-05 this rail showed livestream_items with Pre-bid/Bid now
// status badges. That conflated the auction queue with the shop. Hosts
// asked for the rail to be their shop — a way for viewers to grab fixed-
// price inventory from the same seller while watching the stream.

import { useEffect, useState } from 'react';
import { Box, TextField, Chip, Typography, ButtonBase, Snackbar } from '@mui/material';
import { Bookmark, Search } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii, inkstashFonts } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';
import CheckoutListingModal, { type CheckoutListingModalListing } from '../checkout/CheckoutListingModal';

interface Props {
  /** The viewer's current livestream id. Used only for the channel name
   *  so the realtime sub doesn't collide between concurrent streams. */
  livestreamId: string;
  /** Stream host's user id — drives the shop query. */
  hostUserId: string;
  /** Display chip above the Shop header. */
  streamTitle: string;
}

interface ShopListing {
  id: string;
  title: string;
  buy_now_price: number | null;
  photos: Array<{ url?: string }> | null;
  comic_publisher: string | null;
  source_inventory_id: string | null;
  user_id: string;
}

const FILTER_CHIPS = ['Filter', 'Sort', 'Newest', 'Price'] as const;

export default function StreamShopRail({ livestreamId, hostUserId, streamTitle }: Props) {
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ShopListing | null>(null);
  // Bookmark stub — local-only toggle until a favorites table ships.
  // Resets on page reload by design; the toast confirms the intent.
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  function toggleBookmark(id: string) {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setToast('Removed from saved'); }
      else { next.add(id); setToast('Saved'); }
      return next;
    });
  }

  // Pull the host's active marketplace listings. Active = is_buy_now and
  // status='active'. Excludes sold/delisted/draft rows.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos, comic_publisher, source_inventory_id, user_id')
        .eq('user_id', hostUserId)
        .eq('status', 'active')
        .eq('is_buy_now', true)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setListings((data ?? []) as ShopListing[]);
    }
    load();

    // Re-pull on any change to the host's listings (new list, sold,
    // delist). Scoped to this host so we don't get noise from other
    // sellers' edits.
    const channel = supabase
      .channel(`stream_shop:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${hostUserId}` },
        () => { if (!cancelled) void load(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [livestreamId, hostUserId]);

  const filtered = query.trim()
    ? listings.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()))
    : listings;

  // Map our row shape to the modal's expected shape. Same fields, just
  // a TypeScript handshake — buy_now_price must be number-typed there.
  const selectedAsModalListing: CheckoutListingModalListing | null = selected
    ? {
        id: selected.id,
        title: selected.title,
        buy_now_price: Number(selected.buy_now_price ?? 0),
        source_inventory_id: selected.source_inventory_id,
        comic_publisher: selected.comic_publisher,
        photos: selected.photos,
        user_id: selected.user_id,
      }
    : null;

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: 'inherit',
      }}
    >
      <Box
        sx={{
          alignSelf: 'flex-start',
          bgcolor: inkstashColors.ink,
          color: '#fff',
          px: 1.5,
          py: 0.75,
          fontFamily: inkstashFonts.ui,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '-0.005em',
          textTransform: 'uppercase',
          maxWidth: '90%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {streamTitle}
      </Box>

      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 900,
            fontSize: 22,
            color: inkstashColors.ink,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            mb: 1.5,
          }}
        >
          Shop
        </Typography>

        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shop..."
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: inkstashColors.muted }}>
                <Search size={15} />
              </Box>
            ),
          }}
          sx={{
            mb: 1.5,
            '& .MuiInputBase-root': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              borderRadius: 999,
              px: 1.5,
            },
            '& fieldset': { border: 'none' },
            '& input::placeholder': { color: inkstashColors.muted, opacity: 1 },
          }}
        />

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {FILTER_CHIPS.map((c) => (
            <Chip
              key={c}
              label={c}
              size="small"
              sx={{
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.ink,
                fontFamily: inkstashFonts.ui,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '-0.005em',
                height: 26,
                border: `1px solid ${inkstashColors.border}`,
                '&:hover': { bgcolor: inkstashColors.border },
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          pb: 2,
          scrollbarWidth: 'thin',
        }}
      >
        <SectionHeader label={`Products (${filtered.length})`} />
        {filtered.length === 0 && (
          <EmptyHint label="This seller doesn't have any listings in their shop yet." />
        )}
        {filtered.map((l) => (
          <ProductTile
            key={l.id}
            cover={l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL}
            title={l.title}
            price={l.buy_now_price}
            onView={() => setSelected(l)}
            onBookmark={() => toggleBookmark(l.id)}
            bookmarked={bookmarked.has(l.id)}
          />
        ))}
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={2200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={toast ?? ''}
      />

      {selectedAsModalListing && (
        <CheckoutListingModal
          open={!!selected}
          onClose={() => setSelected(null)}
          listing={selectedAsModalListing}
        />
      )}
    </Box>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <Typography
      sx={{
        fontFamily: inkstashFonts.ui,
        fontWeight: 800,
        fontSize: 14,
        color: inkstashColors.ink,
        letterSpacing: '-0.01em',
        mt: 1,
        mb: 1.25,
      }}
    >
      {label}
    </Typography>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <Typography
      sx={{
        fontFamily: inkstashFonts.ui,
        fontSize: 12,
        color: inkstashColors.muted,
        py: 1.5,
      }}
    >
      {label}
    </Typography>
  );
}

function ProductTile({
  cover, title, price, onView, onBookmark, bookmarked,
}: {
  cover: string;
  title: string;
  price: number | null;
  onView: () => void;
  onBookmark: () => void;
  bookmarked: boolean;
}) {
  // Per design: row layout = thumb (with bookmark icon top-left) +
  // info column. No side action button — the entire row click opens
  // the buy modal. Bookmark icon stays as a local toggle (Save) until
  // the favorites backend ships.
  return (
    <Box
      onClick={onView}
      sx={{
        display: 'flex',
        gap: 1.5,
        width: '100%',
        py: 1.25,
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'opacity 120ms ease',
        '&:hover': { opacity: 0.85 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 56, height: 56,
          flexShrink: 0,
          borderRadius: inkstashRadii.md,
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          bgcolor: inkstashColors.bgSunken,
          overflow: 'hidden',
          // Subtle halftone overlay per design (.product-thumb::after)
          '&::after': {
            content: '""',
            position: 'absolute', inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.16) 1px, transparent 1.3px)',
            backgroundSize: '6px 6px',
            pointerEvents: 'none',
          },
        }}
      >
        <ButtonBase
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          aria-label={bookmarked ? 'Remove bookmark' : 'Save item'}
          sx={{
            position: 'absolute', top: 4, left: 4,
            width: 22, height: 22,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.92)',
            zIndex: 2,
            transition: 'transform 120ms ease',
            '&:hover': { transform: 'scale(1.1)' },
          }}
        >
          <Bookmark
            size={14}
            strokeWidth={2}
            fill={bookmarked ? 'currentColor' : 'none'}
          />
        </ButtonBase>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 13.5,
            color: inkstashColors.ink,
            letterSpacing: '0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
        {price != null && (
          <Box
            sx={{
              display: 'inline-flex', alignItems: 'baseline',
              gap: 0.5, mt: 0.5,
              fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
            }}
          >
            <Box
              component="span"
              sx={{
                color: inkstashColors.ink, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${Number(price).toFixed(0)}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
