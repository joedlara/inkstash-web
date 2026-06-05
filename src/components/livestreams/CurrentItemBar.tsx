// src/components/livestreams/CurrentItemBar.tsx
//
// Bottom-of-video item info bar. Per docs/design-system/claude-design/
// live_stream/stream.css :: .vf-item.
//
// Layout:
//   [winner line in mono — "@x won!"]
//   [item title in display 22px UPPERCASE]      [price 26px display]
//   [N Bids · Shipping is $X — muted]           [status in mono red]
//
// Data source: newest livestream_items row with status='sold' (or 'live'
// if nothing's sold yet). When no item has been on the block at all,
// returns null so the bar doesn't render. Winner is stubbed to '—' until
// an auction backend writes a winning bidder per item (L2).

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

interface CurrentItem {
  itemId: string;
  title: string;
  price: number | null;
  status: 'live' | 'sold' | 'passed';
  // Auction state. Null when bidding hasn't been started on this item.
  currentPriceCents: number | null;
  bidCount: number;
  biddingEndsAt: string | null;
}

export default function CurrentItemBar({ livestreamId }: Props) {
  const [item, setItem] = useState<CurrentItem | null>(null);
  // Tick to refresh the countdown display without re-fetching. The
  // realtime row-update broadcast handles the "new bid" case; this
  // just animates the seconds-remaining label between updates.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrent() {
      // Prefer 'sold' (most recently auctioned) -> 'live' (currently on
      // the block) -> 'passed'. PostgREST: filter by status, order desc
      // by position so the latest entry of the kind wins.
      const { data: items } = await supabase
        .from('livestream_items')
        .select('id, listing_id, status, position, current_price_cents, bid_count, bidding_ends_at')
        .eq('livestream_id', livestreamId)
        .in('status', ['sold', 'live', 'passed'])
        .order('position', { ascending: false })
        .limit(10);
      if (cancelled || !items || items.length === 0) {
        if (!cancelled) setItem(null);
        return;
      }
      // Pick by priority: sold > live > passed
      type LIRow = {
        id: string; listing_id: string; status: 'sold' | 'live' | 'passed'; position: number;
        current_price_cents: number | null; bid_count: number | null; bidding_ends_at: string | null;
      };
      const rows = items as LIRow[];
      const pick = rows.find((r) => r.status === 'live')
        ?? rows.find((r) => r.status === 'sold')
        ?? rows.find((r) => r.status === 'passed');
      if (!pick) { if (!cancelled) setItem(null); return; }
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, buy_now_price')
        .eq('id', pick.listing_id)
        .maybeSingle();
      if (cancelled) return;
      if (!listing) { setItem(null); return; }
      const l = listing as { id: string; title: string; buy_now_price: number | null };
      setItem({
        itemId: l.id,
        title: l.title,
        price: l.buy_now_price,
        status: pick.status,
        currentPriceCents: pick.current_price_cents,
        bidCount: pick.bid_count ?? 0,
        biddingEndsAt: pick.bidding_ends_at,
      });
    }

    fetchCurrent();
    const channel = supabase
      .channel(`current_item_bar:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        () => { if (!cancelled) fetchCurrent(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [livestreamId]);

  if (!item) return null;

  const bidActive = !!item.biddingEndsAt && new Date(item.biddingEndsAt).getTime() > Date.now();
  const secondsRemaining = item.biddingEndsAt
    ? Math.max(0, Math.ceil((new Date(item.biddingEndsAt).getTime() - Date.now()) / 1000))
    : null;
  const displayCents = item.currentPriceCents
    ?? Math.round(Number(item.price ?? 1) * 100);
  const displayPriceLabel = `$${(displayCents / 100).toFixed(2).replace(/\.00$/, '')}`;

  const statusLabel = item.status === 'sold' ? 'Sold'
    : bidActive ? `Bidding · ${secondsRemaining}s`
    : item.status === 'live' ? 'On the block' : 'Passed';
  const statusColor = item.status === 'sold' ? '#FF6B6B'
    : bidActive && (secondsRemaining ?? 0) <= 3 ? '#FF6B6B'
    : item.status === 'live' ? '#FFC53D' : 'rgba(255,255,255,0.55)';

  return (
    <Box
      sx={{
        color: '#fff',
        // Padding mirrors .vf-item: 16px sides, breathing room top/bottom.
        // Background comes from the parent overlay gradient.
        padding: '16px 16px 14px',
        borderRadius: inkstashRadii.md,
      }}
    >
      {/* Winner line — stubbed dash until L2 attaches a winning bidder.
          We still render the structure so the spec hierarchy is visible. */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.9,
          mb: 1,
          fontFamily: inkstashFonts.mono,
          fontSize: 12.5,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 999,
            bgcolor: inkstashColors.brand,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 10,
            color: '#fff',
            lineHeight: 1,
          }}
        >
          —
        </Box>
        <Box component="span" sx={{ fontWeight: 700 }}>—</Box>
        <Box
          component="span"
          sx={{
            color: '#FFC53D',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 11,
            letterSpacing: '0.05em',
          }}
        >
          {item.status === 'sold' ? 'won!' : item.status === 'live' ? 'bidding' : 'passed'}
        </Box>
      </Box>

      {/* Item row: title + sub on the left, price + status on the right */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: { xs: 18, md: 22 },
              textTransform: 'uppercase',
              lineHeight: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.005em',
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              mt: 0.6,
            }}
          >
            {item.bidCount} {item.bidCount === 1 ? 'Bid' : 'Bids'} · Shipping at checkout
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          {displayCents > 0 && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 26,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {displayPriceLabel}
            </Typography>
          )}
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: statusColor,
              mt: 0.6,
            }}
          >
            {statusLabel}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
