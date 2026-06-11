// src/components/livestreams/StreamShopRail.tsx
//
// Desktop left rail. Shows the host's MARKETPLACE listings (their shop),
// not the stream's queued auction lots. Click a tile OR its Buy pill →
// opens the buy modal inside the stream surface (Add to Cart or Buy
// Now). Viewer never leaves /live/:id.
//
// Visual language adapted from
// docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.product-row / .product-thumb / .product-info / .btn-prebid — pill
// renamed "Buy" per data model: this is buy-now inventory, not bidding).

import { useEffect, useState } from 'react';
import { Box, TextField, Typography, ButtonBase, Snackbar } from '@mui/material';
import { Bookmark, Search } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';
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
  const [activeChip, setActiveChip] = useState<typeof FILTER_CHIPS[number] | null>(null);
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
          // Stream-title chip uses the display face — same Big Shoulders
          // treatment the auction card title gets, so the shop card reads
          // as part of the same family.
          fontFamily: inkstashFonts.display,
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.02em',
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
            // "SHOP" matches the app's display headings (Big Shoulders),
            // not the smaller Geist UI face the body uses.
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 22,
            textTransform: 'uppercase',
            color: inkstashColors.ink,
            letterSpacing: '0.01em',
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

        {/* Filter chips — single scrollable row (no wrap). Active chip
            inverts to ink bg + white text per design. */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            overflowX: 'auto',
            flexWrap: 'nowrap',
            // Hide scrollbars — the row is meant to feel like a horizontal pill stack.
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Tiny right edge breathing room so the last chip doesn't kiss the wall.
            pr: 0.5,
          }}
        >
          {FILTER_CHIPS.map((c) => {
            const isActive = activeChip === c;
            return (
              <Box
                key={c}
                component="button"
                type="button"
                onClick={() => setActiveChip((prev) => (prev === c ? null : c))}
                sx={{
                  flexShrink: 0,
                  padding: '6px 13px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: inkstashFonts.ui,
                  fontSize: 12.5,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  border: `1px solid ${isActive ? inkstashColors.ink : inkstashColors.border}`,
                  bgcolor: isActive ? inkstashColors.ink : inkstashColors.bgSunken,
                  color: isActive ? '#fff' : inkstashColors.ink,
                  transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
                  '&:hover': {
                    bgcolor: isActive ? inkstashColors.ink : inkstashColors.border,
                  },
                }}
              >
                {c}
              </Box>
            );
          })}
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
        // Section labels (e.g. "PRODUCTS (3)") use mono so the count
        // reads as metadata against the display "SHOP" header above.
        fontFamily: inkstashFonts.mono,
        fontWeight: 700,
        fontSize: 11.5,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: inkstashColors.muted,
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
  // Layout per design: row with 68px thumb (halftone overlay + corner
  // bookmark) on the left, info on the right, then a full-width Buy
  // pill UNDER the row that triggers the same buy-modal as the row click.
  return (
    <Box
      sx={{
        // 18px between products (.product-row { margin-bottom: 18px }).
        mb: '18px',
        '&:last-of-type': { mb: 0 },
      }}
    >
      <Box
        onClick={onView}
        sx={{
          display: 'flex',
          gap: 1.5,
          width: '100%',
          py: '6px',
          cursor: 'pointer',
          alignItems: 'center',
          transition: 'opacity 120ms ease',
          '&:hover': { opacity: 0.85 },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 68, height: 68,
            flexShrink: 0,
            borderRadius: '10px',
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
              // Product titles take the display face — matches the auction
              // card's lot title so titles read consistently across the page.
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 14.5,
              textTransform: 'uppercase',
              color: inkstashColors.ink,
              letterSpacing: '0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>
          {price != null && (
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'baseline',
                gap: 0.5, mt: 0.5,
                fontFamily: inkstashFonts.ui,
                fontSize: 12.5,
                color: inkstashColors.muted,
              }}
            >
              <Box
                component="span"
                sx={{
                  color: inkstashColors.ink,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ${Number(price).toFixed(0)}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Full-width Buy pill — same buy-modal trigger as the row click.
          .btn-prebid shape adapted to the inkstash palette: bg-sunken
          fill, 1px border, ink text, 999 radius, 11px vertical padding. */}
      <Box
        component="button"
        type="button"
        onClick={(e) => { e.stopPropagation(); onView(); }}
        sx={{
          width: '100%',
          display: 'block',
          mt: 1,
          padding: '11px 16px',
          borderRadius: 999,
          border: `1px solid ${inkstashColors.border}`,
          bgcolor: inkstashColors.bgSunken,
          color: inkstashColors.ink,
          cursor: 'pointer',
          fontFamily: inkstashFonts.ui,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '-0.005em',
          transition: 'background-color 120ms ease, border-color 120ms ease',
          '&:hover': {
            // Spec hover #E9E0D2 — slightly warmer than the resting
            // sunken paper.
            bgcolor: '#E9E0D2',
            borderColor: inkstashColors.borderStrong,
          },
          '&:active': {
            transform: 'translateY(1px)',
          },
        }}
      >
        Buy
      </Box>
    </Box>
  );
}
