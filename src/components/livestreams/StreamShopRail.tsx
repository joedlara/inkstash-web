// src/components/livestreams/StreamShopRail.tsx
//
// Desktop-only left rail. Editorial treatment: section kicker, big display
// header, mono filter chips with brand-red active rule, numbered product
// list (newspaper classifieds energy). Items are click-through to /item/:id;
// L2 will repurpose this rail for auction-bid affordances.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Typography, ButtonBase } from '@mui/material';
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

const FILTER_CHIPS = ['All', 'Auction', 'Buy now', 'Sealed'] as const;
type FilterKey = (typeof FILTER_CHIPS)[number];

export default function StreamShopRail({ hostUserId }: Props) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ShopListing[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

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
        // Ink shelf-shadow gives the rail a "printed plate" feel
        boxShadow: `0 6px 0 ${inkstashColors.ink}`,
        border: `1.5px solid ${inkstashColors.ink}`,
        borderRadius: inkstashRadii.md,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1.5px solid ${inkstashColors.ink}` }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 9,
            fontWeight: 700,
            color: inkstashColors.brand,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            mb: 0.5,
          }}
        >
          Tonight's lineup
        </Typography>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 26,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
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
          placeholder="Search shop"
          InputProps={{
            startAdornment: (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: inkstashColors.muted }}>
                <Search size={14} strokeWidth={2.4} />
              </Box>
            ),
          }}
          sx={{
            mb: 1.5,
            '& .MuiInputBase-root': {
              bgcolor: inkstashColors.bg,
              color: inkstashColors.ink,
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              borderRadius: 0,
              border: `1.5px solid ${inkstashColors.ink}`,
              px: 1.25,
              py: 0.25,
            },
            '& fieldset': { border: 'none' },
            '& input::placeholder': { color: inkstashColors.muted, opacity: 1 },
          }}
        />

        <Box sx={{ display: 'flex', gap: 0, borderBottom: `1px solid ${inkstashColors.border}` }}>
          {FILTER_CHIPS.map((c) => {
            const active = activeFilter === c;
            return (
              <ButtonBase
                key={c}
                onClick={() => setActiveFilter(c)}
                sx={{
                  position: 'relative',
                  px: 1,
                  py: 0.85,
                  fontFamily: inkstashFonts.mono,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: active ? inkstashColors.ink : inkstashColors.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  '&:hover': { color: inkstashColors.ink },
                  '&::after': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        bottom: -1,
                        left: 4,
                        right: 4,
                        height: 2,
                        bgcolor: inkstashColors.brand,
                      }
                    : undefined,
                }}
              >
                {c}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      {/* Product list — newspaper classifieds energy */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
        }}
      >
        {filtered.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 10,
                fontWeight: 700,
                color: inkstashColors.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
              }}
            >
              {query.trim() ? '— no matches —' : '— no items yet —'}
            </Typography>
          </Box>
        )}
        {filtered.map((l, i) => {
          const cover = l.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
          return (
            <ButtonBase
              key={l.id}
              onClick={() => navigate(`/item/${l.id}`)}
              sx={{
                display: 'grid',
                gridTemplateColumns: '28px 64px 1fr',
                gap: 1,
                width: '100%',
                px: 1.5,
                py: 1.5,
                borderBottom: `1px solid ${inkstashColors.border}`,
                bgcolor: 'transparent',
                color: inkstashColors.ink,
                textAlign: 'left',
                alignItems: 'flex-start',
                transition: 'background-color 120ms ease',
                '&:hover': { bgcolor: inkstashColors.bg },
              }}
            >
              {/* Numbered like a classifieds lot */}
              <Typography
                sx={{
                  fontFamily: inkstashFonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: inkstashColors.muted,
                  fontVariantNumeric: 'tabular-nums',
                  pt: 0.5,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  bgcolor: '#222',
                  backgroundImage: `url(${cover})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `1px solid ${inkstashColors.ink}`,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {l.comic_publisher && (
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: inkstashColors.brand,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {l.comic_publisher}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontFamily: inkstashFonts.display,
                    fontWeight: 800,
                    fontSize: 13,
                    color: inkstashColors.ink,
                    textTransform: 'uppercase',
                    letterSpacing: '0.005em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.15,
                    mb: 0.5,
                  }}
                >
                  {l.title}
                </Typography>
                {l.buy_now_price != null && (
                  <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.mono,
                        fontSize: 9,
                        fontWeight: 700,
                        color: inkstashColors.muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}
                    >
                      Buy
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: inkstashFonts.display,
                        fontWeight: 900,
                        fontSize: 14,
                        color: inkstashColors.ink,
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${Number(l.buy_now_price).toFixed(0)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
