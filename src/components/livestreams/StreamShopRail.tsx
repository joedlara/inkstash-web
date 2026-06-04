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
  hostUserId: string;
  streamTitle: string;
}

interface ShopListing {
  id: string;
  title: string;
  buy_now_price: number | null;
  photos: Array<{ url?: string }> | null;
}

const FILTER_CHIPS = ['Filter', 'Sort', 'Auction', 'Giveaway'] as const;

export default function StreamShopRail({ hostUserId, streamTitle }: Props) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .eq('user_id', hostUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);
      if (cancelled) return;
      setListings((data ?? []) as ShopListing[]);
    })();
    return () => { cancelled = true; };
  }, [hostUserId]);

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
        {filtered.length === 0 && <EmptyHint label="This streamer hasn't listed anything yet." />}
        {filtered.map((l) => (
          <ProductTile
            key={l.id}
            cover={l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL}
            title={l.title}
            price={l.buy_now_price}
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
  cover, title, price, onClick,
}: {
  cover: string;
  title: string;
  price: number | null;
  onClick: () => void;
}) {
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
        border: `1px solid ${inkstashColors.border}`,
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease',
        '&:hover': { borderColor: inkstashColors.brand },
        '&:active': { transform: 'scale(0.98)' },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: inkstashRadii.sm,
          bgcolor: '#eee',
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
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
        {/* Pre-bid pill — visible but disabled until L2 auctions ship */}
        <Box
          sx={{
            mt: 1,
            display: 'inline-flex',
            px: 1.25,
            py: 0.45,
            borderRadius: 999,
            bgcolor: inkstashColors.bg,
            color: inkstashColors.muted,
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 10.5,
            letterSpacing: '-0.005em',
            border: `1px solid ${inkstashColors.border}`,
          }}
        >
          Pre-bid
        </Box>
      </Box>
    </ButtonBase>
  );
}
