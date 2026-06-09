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
import AddCardToBidCTA from './AddCardToBidCTA';
import AuctionStatusLine from './AuctionStatusLine';
import AuctionTimer from './AuctionTimer';
import { useHasSavedCard } from './useHasSavedCard';
import { useWinnerUsername } from './useWinnerUsername';
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
  // Surface the add-card gate before the user drags. Without this
  // they'd commit the slide, hit a 402 from place-bid, and have to
  // re-drag after adding a card. hasCard === null = unknown, treat
  // as "let them try" so a transient RLS hiccup doesn't block bidding.
  const { hasCard } = useHasSavedCard();
  // current_winner_id is a uuid — useWinnerUsername hydrates the
  // username + avatar so the status line + chat color use real names.
  // Hook stays above the early return for stable Rules-of-Hooks order.
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

  // After the wallet drawer reports a card was added, retry the bid
  // we just rejected. The pendingBidItemIdRef holds the itemId from
  // the failing attempt — if it doesn't match the current on-block
  // item by the time the user finishes adding their card, the user
  // most likely moved on, so we skip the auto-retry.
  //
  // IMPORTANT: declared above the `if (!item) return null` early-out
  // so the hook count stays stable across renders (Rules of Hooks).
  // Prior arrangement crashed the tree the moment `item` first became
  // non-null on a new user — pushed white-screen on push-to-block.
  const winnerProfile = useWinnerUsername(item?.currentWinnerId ?? null);
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
        // Stash the item we wanted to bid on so we can auto-retry
        // once the wallet drawer reports a card was saved.
        pendingBidItemIdRef.current = item!.itemId;
        window.dispatchEvent(new CustomEvent('inkstash:open-wallet', {
          detail: { autoOpenAddCard: true },
        }));
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

        {expanded && (() => {
          const statusLineState: 'sold' | 'winning' | 'no_bids' = item.status === 'sold'
            ? 'sold'
            : item.currentWinnerId ? 'winning' : 'no_bids';
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4, px: 1.5, pb: 1.25 }}>
              {/* Status line — "@username is winning!" / "@username
                  won!" / "On the block · no bids yet". */}
              <AuctionStatusLine
                username={winnerProfile?.username ?? null}
                avatarUrl={winnerProfile?.avatarUrl ?? null}
                state={statusLineState}
              />

              {/* Lot row: 60px halftone thumb · title + shipping ·
                  price + amber countdown timer. Per the redesign,
                  no card background — sits on the parent scrim. */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6 }}>
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
                      color: '#fff',
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
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.display,
                      fontWeight: 900,
                      fontSize: 27,
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#fff',
                    }}
                  >
                    {priceLabel}
                  </Typography>
                  <AuctionTimer
                    secondsRemaining={secondsRemaining}
                    status={item.status}
                    bidActive={bidActive}
                  />
                </Box>
              </Box>

              {/* DEV-ONLY diagnostic — remove once slider mount is
                  confirmed. */}
              {import.meta.env.DEV && (
                <Box sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 9,
                  color: 'rgba(255,255,255,0.55)',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  px: 1, py: 0.4, borderRadius: 1,
                  letterSpacing: '0.04em',
                }}>
                  m: bidActive={String(bidActive)} hasCard={String(hasCard)} isWinning={String(isWinning)} status={item.status} winnerId={item.currentWinnerId ? item.currentWinnerId.slice(0, 6) : 'null'} viewerId={viewerId ? viewerId.slice(0, 6) : 'null'}
                </Box>
              )}

              {/* Slide-to-bid pill — full width below the lot info.
                  When the viewer is the current high bidder, swap the
                  slider for a "You're the highest bidder" lock so they
                  can't outbid themselves. When bidding is open but the
                  viewer has no saved card, swap for "Add a card to bid"
                  instead so they don't drag the slider only to hit a
                  wallet prompt afterwards. */}
              {bidActive && isWinning ? (
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
              ) : bidActive && hasCard === false ? (
                <AddCardToBidCTA nextBidLabel={nextBidLabel} />
              ) : (
                <SlideToBid
                  label={bidActive ? `Bid ${nextBidLabel}` : 'Bidding closed'}
                  onConfirm={handleBid}
                  disabled={!bidActive}
                  busy={bidding}
                />
              )}
            </Box>
          );
        })()}
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
