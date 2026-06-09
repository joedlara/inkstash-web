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
import AuctionStatusLine from './AuctionStatusLine';
import AuctionTimer from './AuctionTimer';
import { useHasSavedCard } from './useHasSavedCard';
import { useWinnerUsername } from './useWinnerUsername';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

interface CurrentItem {
  itemId: string;
  title: string;
  price: number | null;
  coverUrl: string | null;
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
        // The id Supabase joined back is the livestream_items id —
        // store the listing id for display + the item id for bidding.
        itemId: pick.id,
        title: l.title,
        price: l.buy_now_price,
        coverUrl: l.photos?.[0]?.url ?? null,
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

  // Hooks MUST stay above the early return so the hook count stays
  // stable across the null → loaded transition (Rules of Hooks).
  // useWinnerUsername accepts null and no-ops; useEffect inside the
  // hook still runs unconditionally.
  const winnerProfile = useWinnerUsername(item?.currentWinnerId ?? null);

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

  const statusLineState: 'sold' | 'winning' | 'no_bids' = item.status === 'sold'
    ? 'sold'
    : item.currentWinnerId
      ? 'winning'
      : 'no_bids';

  return (
    <Box
      sx={{
        // Per the live-stream redesign (.auction-block): no card
        // background by default — just image + text reading over the
        // bottom gradient scrim of the video. 14px top padding so the
        // status line breathes.
        display: 'flex',
        flexDirection: 'column',
        gap: 1.4,
        color: '#fff',
        padding: '14px 16px 16px',
      }}
    >
      {/* Status line: "@username is winning!" / "@username won!" /
          "On the block · no bids yet". Username takes the chatter's
          deterministic color so it ties back to the chat. */}
      <AuctionStatusLine
        username={winnerProfile?.username ?? null}
        avatarUrl={winnerProfile?.avatarUrl ?? null}
        state={statusLineState}
      />

      {/* Lot row: 60px gradient/photo thumb · title + shipping · price
          + amber countdown. No card background; sits on the scrim. */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.6,
        }}
      >
        <Box
          sx={{
            width: 60,
            height: 60,
            flexShrink: 0,
            borderRadius: '11px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
            backgroundImage: item.coverUrl
              ? `url(${item.coverUrl})`
              : 'linear-gradient(160deg, #C2362F 0%, #5C1116 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            // Halftone dot overlay, per .ac-thumb::after.
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.16) 1px, transparent 1.3px)',
              backgroundSize: '6px 6px',
            },
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 19,
              textTransform: 'uppercase',
              lineHeight: 1.04,
              letterSpacing: '0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.52)',
              mt: 0.25,
            }}
          >
            Shipping + taxes at checkout
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 0.4,
            flexShrink: 0,
          }}
        >
          {displayCents > 0 && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 27,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {displayPriceLabel}
            </Typography>
          )}
          <AuctionTimer
            secondsRemaining={secondsRemaining}
            status={item.status}
            bidActive={bidActive}
          />
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
      {/* DEV-ONLY diagnostic — remove once slider is confirmed
          rendering in all branches. */}
      {import.meta.env.DEV && (
        <Box sx={{
          fontFamily: inkstashFonts.mono, fontSize: 9,
          color: 'rgba(255,255,255,0.55)',
          bgcolor: 'rgba(0,0,0,0.4)',
          px: 1, py: 0.4, borderRadius: 1,
          letterSpacing: '0.04em',
        }}>
          bidActive={String(bidActive)} hasCard={String(hasCard)} isWinning={String(isWinning)} status={item.status} winnerId={item.currentWinnerId ? item.currentWinnerId.slice(0, 6) : 'null'} viewerId={viewerId ? viewerId.slice(0, 6) : 'null'}
        </Box>
      )}

      {bidActive ? (
        isWinning ? (
          <Box sx={{
            py: 1.25, px: 2, borderRadius: 999,
            bgcolor: 'rgba(46,111,79,0.85)',
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontSize: 13, fontWeight: 700,
            textAlign: 'center',
          }}>
            You're the highest bidder. Wait for someone else to bid.
          </Box>
        ) : hasCard === false ? (
          <AddCardToBidCTA nextBidLabel={nextBidLabel} />
        ) : (
          <SlideToBid
            label={`Bid ${nextBidLabel}`}
            onConfirm={handleBid}
            disabled={false}
            busy={bidding}
          />
        )
      ) : null}

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
