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
import { Box, TextField, Chip, Typography, ButtonBase, IconButton } from '@mui/material';
import { Search, ShoppingCart } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii, inkstashFonts } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';
import CheckoutListingModal, { type CheckoutListingModalListing } from '../checkout/CheckoutListingModal';
import { useCart } from '../../contexts/CartContext';

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
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

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

  async function handleAddToCart(listing: ShopListing) {
    setAddingId(listing.id);
    try { await addItem(listing.id); }
    finally { setAddingId(null); }
  }

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
            adding={addingId === l.id}
            onView={() => setSelected(l)}
            onAdd={() => handleAddToCart(l)}
          />
        ))}
      </Box>

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
  cover, title, price, adding, onView, onAdd,
}: {
  cover: string;
  title: string;
  price: number | null;
  adding: boolean;
  onView: () => void;
  onAdd: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.25,
        width: '100%',
        p: 1.25,
        mb: 1,
        borderRadius: inkstashRadii.md,
        bgcolor: inkstashColors.bgSunken,
        color: inkstashColors.ink,
        textAlign: 'left',
        alignItems: 'flex-start',
        border: `1px solid ${inkstashColors.border}`,
        transition: 'border-color 160ms ease',
        '&:hover': { borderColor: inkstashColors.brand },
      }}
    >
      <ButtonBase
        onClick={onView}
        aria-label={`View ${title}`}
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: inkstashRadii.sm,
          bgcolor: '#eee',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
          transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1)',
          '&:active': { transform: 'scale(0.96)' },
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ButtonBase
          onClick={onView}
          sx={{
            display: 'block',
            textAlign: 'left',
            width: '100%',
            borderRadius: 1,
          }}
        >
          {price != null && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.ui,
                fontWeight: 900,
                fontSize: 15,
                color: inkstashColors.ink,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${Number(price).toFixed(0)}
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 600,
              fontSize: 12.5,
              color: inkstashColors.ink2,
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.25,
              letterSpacing: '-0.005em',
            }}
          >
            {title}
          </Typography>
        </ButtonBase>
      </Box>
      <IconButton
        onClick={onAdd}
        disabled={adding}
        size="small"
        aria-label="Add to cart"
        sx={{
          width: 32,
          height: 32,
          alignSelf: 'center',
          flexShrink: 0,
          bgcolor: inkstashColors.bg,
          color: inkstashColors.ink,
          border: `1px solid ${inkstashColors.border}`,
          transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
          '&:hover': { bgcolor: inkstashColors.brand, color: '#fff', borderColor: inkstashColors.brand },
          '&:active': { transform: 'scale(0.94)' },
          '&.Mui-disabled': { opacity: 0.5 },
        }}
      >
        <ShoppingCart size={15} strokeWidth={2.2} />
      </IconButton>
    </Box>
  );
}
