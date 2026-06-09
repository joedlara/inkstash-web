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

import { useEffect, useRef, useState } from 'react';
import { Box, Snackbar, Typography } from '@mui/material';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI } from '../../api/livestreams';
import { useAuth } from '../../hooks/useAuth';
import SlideToBid from './SlideToBid';
import AddCardToBidCTA from './AddCardToBidCTA';
import { useHasSavedCard } from './useHasSavedCard';
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
  currentWinnerId: string | null;
}

export default function CurrentItemBar({ livestreamId }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  // Pre-flight gate for bidding. If the viewer has no saved card we
  // swap SlideToBid for an "Add a card to bid" CTA so they don't
  // commit a drag only to hit the wallet prompt afterwards.
  const { hasCard } = useHasSavedCard();
  const [item, setItem] = useState<CurrentItem | null>(null);
  const [bidding, setBidding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Tick to refresh the countdown display without re-fetching. The
  // realtime row-update broadcast handles the "new bid" case; this
  // just animates the seconds-remaining label between updates.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Pending-bid auto-retry after wallet card add. Mirrors the same
  // pattern used by MobileAuctionCard so desktop viewers don't have
  // to manually re-drag the slider after saving a card.
  const pendingBidItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    const onCardReady = () => {
      const pending = pendingBidItemIdRef.current;
      pendingBidItemIdRef.current = null;
      if (!pending || pending !== item?.itemId) return;
      handleBid();
    };
    window.addEventListener('inkstash:wallet-card-ready', onCardReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onCardReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.itemId]);

  async function handleBid() {
    if (!item || bidding) return;
    setBidding(true);
    try {
      await livestreamsAPI.placeBid(item.itemId);
      // Realtime + 3s polling fallback will refresh priceCents +
      // biddingEndsAt; no local optimistic update needed.
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('no_card_on_file')) {
        pendingBidItemIdRef.current = item.itemId;
        window.dispatchEvent(new CustomEvent('inkstash:open-wallet', {
          detail: { autoOpenAddCard: true },
        }));
      } else if (msg.includes('cannot_self_bid')) {
        setToast("You can't bid on your own stream.");
      } else if (msg.includes('bidding_closed')) {
        setToast('Too late — bidding just closed.');
      } else if (msg.includes('not_bidding')) {
        setToast("Bidding isn't open on this item yet.");
      } else {
        setToast("Couldn't place your bid — try again.");
      }
    } finally {
      setBidding(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrent() {
      // Prefer 'sold' (most recently auctioned) -> 'live' (currently on
      // the block) -> 'passed'. PostgREST: filter by status, order desc
      // by position so the latest entry of the kind wins.
      const { data: items } = await supabase
        .from('livestream_items')
        .select('id, listing_id, status, position, current_price_cents, bid_count, bidding_ends_at, current_winner_id')
        .eq('livestream_id', livestreamId)
        .in('status', ['sold', 'sold_pending_payment', 'live', 'passed'])
        .order('position', { ascending: false })
        .limit(10);
      if (cancelled || !items || items.length === 0) {
        if (!cancelled) setItem(null);
        return;
      }
      // Pick by priority: sold > live > passed
      type RawStatus = 'sold' | 'sold_pending_payment' | 'live' | 'passed';
      type LIRow = {
        id: string; listing_id: string; status: RawStatus; position: number;
        current_price_cents: number | null; bid_count: number | null;
        bidding_ends_at: string | null; current_winner_id: string | null;
      };
      const rows = items as LIRow[];
      const pick = rows.find((r) => r.status === 'live')
        ?? rows.find((r) => r.status === 'sold' || r.status === 'sold_pending_payment')
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
        // The id Supabase joined back is the livestream_items id —
        // store the listing id for display + the item id for bidding.
        itemId: pick.id,
        title: l.title,
        price: l.buy_now_price,
        // Collapse sold_pending_payment → sold for viewer display.
        status: pick.status === 'sold_pending_payment' ? 'sold' : pick.status,
        currentPriceCents: pick.current_price_cents,
        bidCount: pick.bid_count ?? 0,
        biddingEndsAt: pick.bidding_ends_at,
        currentWinnerId: pick.current_winner_id,
      });
    }

    fetchCurrent();
    // 3s polling fallback so the on-block state stays current even
    // when a realtime event is dropped (tab background, ws reconnect,
    // schema cache lag). Realtime stays primary; this catches gaps.
    const pollId = window.setInterval(() => {
      if (!cancelled) fetchCurrent();
    }, 3000);
    const channel = supabase
      .channel(`current_item_bar:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        () => { if (!cancelled) fetchCurrent(); },
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [livestreamId]);

  if (!item) return null;

  const bidActive = !!item.biddingEndsAt && new Date(item.biddingEndsAt).getTime() > Date.now();
  const secondsRemaining = item.biddingEndsAt
    ? Math.max(0, Math.ceil((new Date(item.biddingEndsAt).getTime() - Date.now()) / 1000))
    : null;
  const displayCents = item.currentPriceCents
    ?? Math.round(Number(item.price ?? 1) * 100);
  const displayPriceLabel = `$${(displayCents / 100).toFixed(2).replace(/\.00$/, '')}`;
  const nextBidLabel = `$${((displayCents + 100) / 100).toFixed(2).replace(/\.00$/, '')}`;
  const isWinning = !!viewerId && item.currentWinnerId === viewerId;

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

      {/* Slide-to-bid pill — only renders while bidding is active.
          When the viewer is the current high bidder we lock the
          slider AND show a "You're the highest bidder…" notice so
          they don't accidentally outbid themselves. When they have
          no saved card on file we swap for "Add a card to bid"
          so they don't drag the slider only to hit the wallet
          afterwards. As soon as someone else takes the lead, OR a
          card lands, the slider unlocks. */}
      {bidActive && (isWinning ? (
        <Box sx={{
          mt: 1.5, py: 1.25, px: 2, borderRadius: 999,
          bgcolor: 'rgba(46,111,79,0.85)',
          color: '#fff',
          fontFamily: inkstashFonts.ui,
          fontSize: 13, fontWeight: 700,
          textAlign: 'center',
        }}>
          You're the highest bidder. Wait for someone else to bid.
        </Box>
      ) : hasCard === false ? (
        <Box sx={{ mt: 1.5 }}>
          <AddCardToBidCTA nextBidLabel={nextBidLabel} />
        </Box>
      ) : (
        <Box sx={{ mt: 1.5 }}>
          <SlideToBid
            label={`Bid ${nextBidLabel}`}
            onConfirm={handleBid}
            disabled={false}
            busy={bidding}
          />
        </Box>
      ))}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={toast ?? ''}
      />
    </Box>
  );
}
