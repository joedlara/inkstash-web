// src/components/livestreams/StreamShopRail.tsx
//
// Desktop-only left rail on /live/:id. Lists the host's active marketplace
// listings so viewers can shop while watching. Light theme to match the
// rest of the app (cream bg, ink text, brand accents).
//
// In this visual pass:
//   - Search input + filter chips (purely visual, not wired)
//   - Real listings query against the host's active listings
//   - Tile click navigates to /item/:id (existing detail page)
//   - 'Pre-bid' label is a placeholder for the L2 auction queue, hidden
//     until the underlying listing has an associated auction

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Chip, Typography, ButtonBase } from '@mui/material';
import { Search } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

interface Props {
  hostUserId: string;
}

interface ShopListing {
  id: string;
  title: string;
  buy_now_price: number | null;
  photos: Array<{ url?: string }> | null;
  comic_publisher: string | null;
}

const FILTER_CHIPS = ['Filter', 'Sort', 'Auction', 'Giveaway'];

export default function StreamShopRail({ hostUserId }: Props) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos, comic_publisher')
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header: Shop title + search + filter chips */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${inkstashColors.border}` }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 16,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
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
                <Search size={16} />
              </Box>
            ),
          }}
          sx={{
            mb: 1.5,
            '& .MuiInputBase-root': {
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
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
                fontFamily: inkstashFonts.mono,
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                height: 24,
                '&:hover': { bgcolor: inkstashColors.border },
              }}
            />
          ))}
        </Box>

        <Typography
          sx={{
            mt: 1.5,
            fontFamily: inkstashFonts.mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: inkstashColors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Products ({filtered.length})
        </Typography>
      </Box>

      {/* Scrollable product list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          scrollbarWidth: 'thin',
        }}
      >
        {filtered.length === 0 && (
          <Typography
            sx={{
              p: 3,
              textAlign: 'center',
              color: inkstashColors.muted,
              fontSize: 12,
            }}
          >
            {query.trim()
              ? 'No products match your search.'
              : "This streamer hasn't listed anything yet."}
          </Typography>
        )}
        {filtered.map((l) => {
          const cover = l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
          return (
            <ButtonBase
              key={l.id}
              onClick={() => navigate(`/item/${l.id}`)}
              sx={{
                display: 'flex',
                width: '100%',
                gap: 1.25,
                p: 1,
                mb: 1,
                borderRadius: inkstashRadii.md,
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.ink,
                textAlign: 'left',
                alignItems: 'flex-start',
                transition: 'background-color 120ms ease',
                '&:hover': { bgcolor: inkstashColors.border },
              }}
            >
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  flexShrink: 0,
                  borderRadius: inkstashRadii.sm,
                  bgcolor: '#222',
                  backgroundImage: `url(${cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {l.buy_now_price != null && (
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.display,
                      fontWeight: 800,
                      fontSize: 13,
                      color: inkstashColors.ink,
                      lineHeight: 1,
                    }}
                  >
                    ${Number(l.buy_now_price).toFixed(2)}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontFamily: inkstashFonts.ui,
                    fontWeight: 600,
                    fontSize: 12,
                    color: inkstashColors.ink2,
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.25,
                  }}
                >
                  {l.title}
                </Typography>
                {l.comic_publisher && (
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.mono,
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: inkstashColors.muted,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      mt: 0.25,
                    }}
                  >
                    {l.comic_publisher}
                  </Typography>
                )}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
