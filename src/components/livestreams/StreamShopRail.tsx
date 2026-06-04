// src/components/livestreams/StreamShopRail.tsx
//
// Desktop left rail. Modern WhatNot-style:
//   - Stream-title chip pinned to the very top (top-left corner of the
//     viewport; styled as a tab pointing into the shop column)
//   - "Shop" header + search input + filter chips
//   - Products section with image + title + price + Pre-bid CTA
//   - Stub "Upcoming Giveaways" section (visible structure, no data — L4)

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Chip, Typography, ButtonBase } from '@mui/material';
import { Search } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii , inkstashFonts} from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props {
  /** The viewer's current livestream id. Drives the queued-item list. */
  livestreamId: string;
  /** Display chip above the Shop header. */
  streamTitle: string;
}

interface ShopListing {
  id: string;
  title: string;
  buy_now_price: number | null;
  photos: Array<{ url?: string }> | null;
  position: number;
  status: 'queued' | 'live' | 'sold' | 'passed' | 'removed';
}

const FILTER_CHIPS = ['Filter', 'Sort', 'Auction', 'Giveaway', 'Sold'] as const;

export default function StreamShopRail({ livestreamId, streamTitle }: Props) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [query, setQuery] = useState('');

  // Pull the host's queue (livestream_items) joined with each listing's
  // display metadata. Two queries to dodge the PostgREST FK-embed shape
  // ambiguity we've hit elsewhere in this codebase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: items } = await supabase
        .from('livestream_items')
        .select('listing_id, position, status')
        .eq('livestream_id', livestreamId)
        .neq('status', 'removed')
        .order('position', { ascending: true });
      const ids = (items ?? []).map((i: { listing_id: string }) => i.listing_id);
      if (cancelled) return;
      if (ids.length === 0) { setListings([]); return; }
      const { data: listingRows } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .in('id', ids);
      if (cancelled) return;
      const byId = new Map(
        (listingRows ?? []).map(
          (l: { id: string; title: string; buy_now_price: number | null; photos: Array<{ url?: string }> | null }) => [l.id, l],
        ),
      );
      const joined: ShopListing[] = (items ?? [])
        .map((i: { listing_id: string; position: number; status: ShopListing['status'] }) => {
          const row = byId.get(i.listing_id);
          if (!row) return null;
          return { ...row, position: i.position, status: i.status } satisfies ShopListing;
        })
        .filter((x): x is ShopListing => x !== null);
      setListings(joined);
    })();

    // Realtime: any change in the queue (host adds, marks live, sells)
    // re-pulls. Cheap because the dataset is small.
    const channel = supabase
      .channel(`stream_shop_items:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        () => { if (!cancelled) { /* trigger re-fetch on next tick */ void (async () => {
          const { data: items2 } = await supabase
            .from('livestream_items')
            .select('listing_id, position, status')
            .eq('livestream_id', livestreamId)
            .neq('status', 'removed')
            .order('position', { ascending: true });
          if (cancelled) return;
          const ids2 = (items2 ?? []).map((i: { listing_id: string }) => i.listing_id);
          if (ids2.length === 0) { setListings([]); return; }
          const { data: rows2 } = await supabase
            .from('listings')
            .select('id, title, buy_now_price, photos')
            .in('id', ids2);
          if (cancelled) return;
          const map2 = new Map(
            (rows2 ?? []).map((l: { id: string; title: string; buy_now_price: number | null; photos: Array<{ url?: string }> | null }) => [l.id, l]),
          );
          setListings(
            (items2 ?? [])
              .map((i: { listing_id: string; position: number; status: ShopListing['status'] }) => {
                const r = map2.get(i.listing_id);
                return r ? ({ ...r, position: i.position, status: i.status } satisfies ShopListing) : null;
              })
              .filter((x): x is ShopListing => x !== null),
          );
        })(); } },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [livestreamId]);

  const filtered = query.trim()
    ? listings.filter((l) => l.title.toLowerCase().includes(query.toLowerCase()))
    : listings;

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
      {/* Stream-title tab pinned to the top — like a folder tab indicating
          which stream's shop this is */}
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

      {/* Header */}
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

      {/* Scrollable content: Products + Upcoming Giveaways */}
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
        {filtered.length === 0 && <EmptyHint label="The host hasn't queued any items yet." />}
        {filtered.map((l) => (
          <ProductTile
            key={l.id}
            cover={l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL}
            title={l.title}
            price={l.buy_now_price}
            status={l.status}
            onClick={() => navigate(`/item/${l.id}`)}
          />
        ))}

        {/* Stub: Upcoming Giveaways section — empty until L4 ships raffles. */}
        <SectionHeader label="Upcoming Giveaways (0)" sx={{ mt: 3 }} />
        <EmptyHint label="No giveaways scheduled." />
      </Box>
    </Box>
  );
}

function SectionHeader({ label, sx }: { label: string; sx?: object }) {
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
        ...sx,
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
  cover, title, price, status, onClick,
}: {
  cover: string;
  title: string;
  price: number | null;
  status: 'queued' | 'live' | 'sold' | 'passed' | 'removed';
  onClick: () => void;
}) {
  const isLive = status === 'live';
  const isSold = status === 'sold';
  return (
    <ButtonBase
      onClick={onClick}
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
        border: `1px solid ${isLive ? inkstashColors.brand : inkstashColors.border}`,
        opacity: isSold ? 0.55 : 1,
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, opacity 160ms ease',
        '&:hover': { borderColor: inkstashColors.brand },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: inkstashRadii.sm,
          bgcolor: '#eee',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
      >
        {isLive && (
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              px: 0.7,
              py: 0.25,
              borderRadius: 999,
              bgcolor: inkstashColors.live,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Live
          </Box>
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
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
        {/* CTA pill — visible but data-driven. Pre-bid is a stub until L2
            auctions ship; status from livestream_items drives the label. */}
        <Box
          sx={{
            mt: 1,
            display: 'inline-flex',
            px: 1.25,
            py: 0.45,
            borderRadius: 999,
            bgcolor: isLive ? inkstashColors.brand : inkstashColors.bg,
            color: isLive ? '#fff' : (isSold ? inkstashColors.muted : inkstashColors.muted),
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 10.5,
            letterSpacing: '-0.005em',
            border: isLive ? 'none' : `1px solid ${inkstashColors.border}`,
          }}
        >
          {isLive ? 'Bid now' : isSold ? 'Sold' : 'Pre-bid'}
        </Box>
      </Box>
    </ButtonBase>
  );
}
