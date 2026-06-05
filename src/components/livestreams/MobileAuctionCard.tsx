// src/components/livestreams/MobileAuctionCard.tsx
//
// Collapsible auction card for the mobile/tablet viewer surface. Sits
// below the chat. Tap the chevron to collapse so users who only care
// about chatting can hide it.
//
// Default expanded. Pulls the same "current item" data CurrentItemBar
// uses (newest livestream_items row by priority sold > live > passed)
// joined to the listing for thumbnail + title + price.
//
// The Bid button is a placeholder until the auction backend ships —
// tapping it does nothing for now. Wiring real bids is a follow-on
// phase per the user's "skip the bid slider for now" decision.

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

interface CurrentItem {
  listingId: string;
  title: string;
  price: number | null;
  coverUrl: string | null;
  status: 'live' | 'sold' | 'passed';
}

export default function MobileAuctionCard({ livestreamId }: Props) {
  const [item, setItem] = useState<CurrentItem | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrent() {
      const { data: items } = await supabase
        .from('livestream_items')
        .select('id, listing_id, status, position')
        .eq('livestream_id', livestreamId)
        .in('status', ['sold', 'live', 'passed'])
        .order('position', { ascending: false })
        .limit(10);
      if (cancelled || !items || items.length === 0) {
        if (!cancelled) setItem(null);
        return;
      }
      type LIRow = { id: string; listing_id: string; status: 'sold' | 'live' | 'passed'; position: number };
      const rows = items as LIRow[];
      const pick = rows.find((r) => r.status === 'sold')
        ?? rows.find((r) => r.status === 'live')
        ?? rows.find((r) => r.status === 'passed');
      if (!pick) { if (!cancelled) setItem(null); return; }
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .eq('id', pick.listing_id)
        .maybeSingle();
      if (cancelled) return;
      if (!listing) { setItem(null); return; }
      const l = listing as {
        id: string; title: string; buy_now_price: number | null;
        photos: Array<{ url?: string }> | null;
      };
      setItem({
        listingId: l.id,
        title: l.title,
        price: l.buy_now_price,
        coverUrl: l.photos?.[0]?.url ?? null,
        status: pick.status,
      });
    }

    fetchCurrent();
    const channel = supabase
      .channel(`mobile_auction_card:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        () => { if (!cancelled) fetchCurrent(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [livestreamId]);

  // Nothing to show: don't take vertical space.
  if (!item) return null;

  const statusLabel = item.status === 'sold' ? 'Sold'
    : item.status === 'live' ? 'On the block' : 'Passed';
  const statusColor = item.status === 'sold' ? '#FF6B6B'
    : item.status === 'live' ? '#FFC53D' : 'rgba(255,255,255,0.55)';

  return (
    <Box
      sx={{
        bgcolor: 'rgba(8,7,10,0.78)',
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: inkstashRadii.md,
        color: '#fff',
        overflow: 'hidden',
        transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
      }}
    >
      {/* Header row — always visible. Tap to collapse/expand. */}
      <ButtonBase
        onClick={() => setExpanded((v) => !v)}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 0.85,
          color: '#fff',
        }}
        aria-expanded={expanded}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: 999,
              bgcolor: statusColor,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: statusColor,
              lineHeight: 1,
            }}
          >
            {statusLabel}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              opacity: 0.85,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            {item.title}
          </Typography>
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {item.price != null && !expanded && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 14,
                color: '#fff',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              ${Number(item.price).toFixed(0)}
            </Typography>
          )}
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Box>
      </ButtonBase>

      {/* Expanded body — thumbnail + name + current bid + bid button */}
      {expanded && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.5,
            pb: 1.25,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: inkstashRadii.sm,
              backgroundImage: item.coverUrl ? `url(${item.coverUrl})` : 'none',
              backgroundColor: 'rgba(255,255,255,0.08)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 15,
                textTransform: 'uppercase',
                lineHeight: 1.1,
                letterSpacing: '0.005em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {item.title}
            </Typography>
            {item.price != null && (
              <Typography
                sx={{
                  fontFamily: inkstashFonts.ui,
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.7)',
                  mt: 0.35,
                }}
              >
                Current bid
                {' '}
                <Box
                  component="span"
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ${Number(item.price).toFixed(0)}
                </Box>
              </Typography>
            )}
          </Box>
          <ButtonBase
            // Bid mechanic wires up in a later phase; for now this is a
            // visual placeholder so the layout reads correctly.
            onClick={(e) => { e.stopPropagation(); }}
            disabled={item.status !== 'live'}
            sx={{
              px: 1.75,
              py: 0.85,
              borderRadius: 999,
              bgcolor: item.status === 'live' ? inkstashColors.brand : 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontFamily: inkstashFonts.ui,
              fontSize: 12.5,
              fontWeight: 800,
              lineHeight: 1,
              flexShrink: 0,
              transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
              '&:hover': {
                bgcolor: item.status === 'live' ? inkstashColors.brandDeep : 'rgba(255,255,255,0.22)',
              },
              '&:active': { transform: 'scale(0.97)' },
              '&.Mui-disabled': { opacity: 0.55, color: '#fff' },
            }}
          >
            Bid
          </ButtonBase>
        </Box>
      )}
    </Box>
  );
}
