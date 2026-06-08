// src/components/livestreams/MobileAuctionCard.tsx
//
// Collapsible auction card for the mobile/tablet viewer surface. Sits
// below the chat. Tap the chevron to collapse so users who only care
// about chatting can hide it.
//
// Default expanded. Pulls auction state directly from livestream_items
// (current_price_cents, bid_count, bidding_ends_at) and joins the
// listing for thumbnail + title. Realtime keeps the price + timer
// in sync after each bid.
//
// The Bid button is enabled only when the on-block item has
// bidding_ends_at in the future. Tap → places a $1 bump via
// place-bid edge fn. The function pre-gates on card-on-file; on
// 402 we surface a snackbar prompting the bidder to buy a Ruby
// bundle (which saves a card automatically per the current
// payments architecture).

import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Snackbar, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI } from '../../api/livestreams';
import { useAuth } from '../../hooks/useAuth';
import SlideToBid from './SlideToBid';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
  /** Fires whenever the card's rendered height changes (collapse,
   *  expand, item swap, no-item → null). Parent uses this to push the
   *  chat composer up by the right amount so the input isn't covered. */
  onHeightChange?: (px: number) => void;
}

interface CurrentItem {
  itemId: string;
  listingId: string;
  title: string;
  coverUrl: string | null;
  // sold_pending_payment is collapsed to 'sold' for viewer display —
  // the charge failure is host-private info and the viewer just sees
  // a closed auction.
  status: 'live' | 'sold' | 'passed';
  // Auction state. price falls back to listing's buy_now_price when
  // bidding hasn't started yet so the card always shows something.
  priceCents: number;
  bidCount: number;
  biddingEndsAt: string | null;
  currentWinnerId: string | null;
}

export default function MobileAuctionCard({ livestreamId, onHeightChange }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const [item, setItem] = useState<CurrentItem | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Tick the countdown every 250ms so the seconds remaining feels
  // live. Doesn't trigger a fetch — only re-renders.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      onHeightChangeRef.current?.(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      onHeightChangeRef.current?.(el.offsetHeight);
    });
    ro.observe(el);
    onHeightChangeRef.current?.(el.offsetHeight);
    return () => { ro.disconnect(); };
  }, [item, expanded]);

  useEffect(() => {
    if (!item) onHeightChangeRef.current?.(0);
  }, [item]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCurrent() {
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
        .select('id, title, buy_now_price, photos')
        .eq('id', pick.listing_id)
        .maybeSingle();
      if (cancelled) return;
      if (!listing) { setItem(null); return; }
      const l = listing as {
        id: string; title: string; buy_now_price: number | null;
        photos: Array<{ url?: string }> | null;
      };
      const fallbackCents = Math.round(Number(l.buy_now_price ?? 1) * 100);
      setItem({
        itemId: pick.id,
        listingId: l.id,
        title: l.title,
        coverUrl: l.photos?.[0]?.url ?? null,
        // Collapse sold_pending_payment → sold for viewer display.
        status: pick.status === 'sold_pending_payment' ? 'sold' : pick.status,
        priceCents: pick.current_price_cents ?? fallbackCents,
        bidCount: pick.bid_count ?? 0,
        biddingEndsAt: pick.bidding_ends_at,
        currentWinnerId: pick.current_winner_id,
      });
    }

    fetchCurrent();
    // 3s polling fallback so the bid state stays current even if a
    // realtime event is dropped (tab background, ws reconnect, schema
    // cache lag after a column was added). Realtime is still the
    // primary path; this just catches gaps.
    const pollId = window.setInterval(() => {
      if (!cancelled) fetchCurrent();
    }, 3000);
    const channel = supabase
      .channel(`mobile_auction_card:${livestreamId}`)
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
  const isWinning = !!viewerId && item.currentWinnerId === viewerId;

  const statusLabel = item.status === 'sold' ? 'Sold'
    : bidActive ? `Bidding · ${secondsRemaining}s`
    : item.status === 'live' ? 'On the block' : 'Passed';
  const statusColor = item.status === 'sold' ? '#FF6B6B'
    : bidActive && (secondsRemaining ?? 0) <= 3 ? '#FF6B6B'
    : item.status === 'live' ? '#FFC53D' : 'rgba(255,255,255,0.55)';

  const priceLabel = `$${(item.priceCents / 100).toFixed(2).replace(/\.00$/, '')}`;
  const nextBidLabel = `$${((item.priceCents + 100) / 100).toFixed(2).replace(/\.00$/, '')}`;

  async function handleBid() {
    if (bidding || !bidActive) return;
    setBidding(true);
    try {
      await livestreamsAPI.placeBid(item!.itemId);
      // Realtime broadcast updates priceCents + biddingEndsAt; no
      // local optimistic write needed.
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('no_card_on_file')) {
        setToast('Buy any Ruby bundle once to save a card, then come back to bid.');
      } else if (msg.includes('cannot_self_bid')) {
        setToast("You can't bid on your own stream.");
      } else if (msg.includes('bidding_closed')) {
        setToast('Too late — bidding just closed.');
      } else if (msg.includes('not_bidding')) {
        setToast('Bidding isn\'t open on this item yet.');
      } else {
        setToast("Couldn't place your bid — try again.");
      }
    } finally {
      setBidding(false);
    }
  }

  return (
    <>
      <Box
        ref={rootRef}
        sx={{
          bgcolor: 'rgba(8,7,10,0.78)',
          backdropFilter: 'blur(10px) saturate(140%)',
          WebkitBackdropFilter: 'blur(10px) saturate(140%)',
          border: `1px solid ${isWinning ? inkstashColors.success : 'rgba(255,255,255,0.12)'}`,
          borderRadius: inkstashRadii.md,
          color: '#fff',
          overflow: 'hidden',
          transition: 'all 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
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
                animation: bidActive ? 'inkstashBidPulse 1s ease-in-out infinite' : 'none',
                '@keyframes inkstashBidPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
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
                fontVariantNumeric: 'tabular-nums',
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
            {!expanded && (
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
                {priceLabel}
              </Typography>
            )}
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Box>
        </ButtonBase>

        {expanded && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, px: 1.5, pb: 1.25 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
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
              <Typography
                sx={{
                  fontFamily: inkstashFonts.ui,
                  fontSize: 12.5,
                  color: 'rgba(255,255,255,0.7)',
                  mt: 0.35,
                }}
              >
                {bidActive ? 'Current bid' : 'Starting bid'}
                {' '}
                <Box
                  component="span"
                  sx={{
                    color: '#fff',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {priceLabel}
                </Box>
                {item.bidCount > 0 && (
                  <Box component="span" sx={{ ml: 1, opacity: 0.55, fontSize: 11.5 }}>
                    · {item.bidCount} {item.bidCount === 1 ? 'bid' : 'bids'}
                  </Box>
                )}
              </Typography>
            </Box>
          </Box>

          {/* Slide-to-bid pill — full width below the lot info. The
              drag-to-confirm pattern prevents accidental taps from
              landing $1 bids the way a plain Bid button would. */}
          <SlideToBid
            label={bidActive ? `Bid ${nextBidLabel}` : 'Bidding closed'}
            onConfirm={handleBid}
            disabled={!bidActive}
            busy={bidding}
          />
          </Box>
        )}
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={toast ?? ''}
      />
    </>
  );
}
