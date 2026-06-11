// src/components/livestreams/MobileAuctionCard.tsx
//
// Auction block for the mobile/tablet viewer surface. Sits below the
// chat over the video scrim — no card background or border. Mirrors
// the desktop CurrentItemBar visually; the only difference is the
// onHeightChange callback so the parent can reserve space for the
// composer.
//
// Pulls auction state directly from livestream_items
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
//
// Visual spec (expanded body): mirrors CurrentItemBar (the canonical
// reference) — status line, 60px halftone thumbnail, 19px display
// title with mono shipping line, 27px price, 00:08 timer pill.
// docs/design-system/claude-design/live_stream/live_stream/stream.css

import { useEffect, useRef, useState } from 'react';
import { Box, Snackbar, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI } from '../../api/livestreams';
import { useAuth } from '../../hooks/useAuth';
import SlideToBid from './SlideToBid';
import AddCardToBidCTA from './AddCardToBidCTA';
import CustomBidButton from './CustomBidButton';
import { useHasSavedCard } from './useHasSavedCard';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';
import { PLACEHOLDER_IMAGE_URL } from '../../utils/placeholders';

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

interface WinnerProfile {
  username: string;
  avatar_url: string | null;
}

// Deterministic avatar background when no avatar_url exists. Picks
// from the brand palette by hashing the user_id — same id → same color.
// Mirrors the helper in CurrentItemBar so a user's avatar tone is
// stable across the desktop bar and the mobile card.
function avatarBg(userId: string): string {
  const palette = [
    inkstashColors.brand,
    inkstashColors.brandDeep,
    inkstashColors.gold,
    inkstashColors.goldDeep,
    inkstashColors.success,
    inkstashColors.info,
  ];
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function formatTimer(seconds: number): string {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

export default function MobileAuctionCard({ livestreamId, onHeightChange }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  // Surface the add-card gate before the user drags. Without this
  // they'd commit the slide, hit a 402 from place-bid, and have to
  // re-drag after adding a card. hasCard === null = unknown, treat
  // as "let them try" so a transient RLS hiccup doesn't block bidding.
  const { hasCard } = useHasSavedCard();
  const [item, setItem] = useState<CurrentItem | null>(null);
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

  // Per-id winner profile cache. Same shape as the chat hook so a
  // future factoring can lift this into a shared lookup.
  const [winnerProfile, setWinnerProfile] = useState<Record<string, WinnerProfile>>({});

  // Flat shipping rate the host set on the livestream row.
  // - undefined: still fetching
  // - null:      legacy "calculated at checkout"
  // - 0:         free shipping
  // - >0:        flat per-item shipping in cents
  const [flatShippingCents, setFlatShippingCents] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('livestreams')
        .select('flat_shipping_cents')
        .eq('id', livestreamId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { flat_shipping_cents: number | null } | null;
      setFlatShippingCents(row?.flat_shipping_cents ?? null);
    })();
    return () => { cancelled = true; };
  }, [livestreamId]);

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
  }, [item]);

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
  // Tagged pending-bid so a custom amount survives the wallet round-trip
  // — a plain item-id ref would silently downgrade the retry to flat $1.
  type PendingBid = { itemId: string; amountCents?: number };
  const pendingBidRef = useRef<PendingBid | null>(null);
  useEffect(() => {
    const onCardReady = () => {
      const pending = pendingBidRef.current;
      pendingBidRef.current = null;
      if (!pending || pending.itemId !== item?.itemId) return;
      handleBid(pending.amountCents);
    };
    window.addEventListener('inkstash:wallet-card-ready', onCardReady);
    return () => window.removeEventListener('inkstash:wallet-card-ready', onCardReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.itemId]);

  // Resolve winner profile on demand. Same select shape as the chat
  // hook; cached per id so a rapid-bid stream doesn't refetch. Same
  // placement as the bid-retry effect above — kept ABOVE the early
  // return so hook count stays stable.
  useEffect(() => {
    const winnerId = item?.currentWinnerId;
    if (!winnerId || winnerProfile[winnerId]) return;
    let cancelled = false;
    supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', winnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as { id: string; username: string | null; avatar_url: string | null };
        setWinnerProfile((prev) => ({
          ...prev,
          [row.id]: { username: row.username ?? 'anon', avatar_url: row.avatar_url },
        }));
      });
    return () => { cancelled = true; };
  }, [item?.currentWinnerId, winnerProfile]);

  if (!item) return null;

  const bidActive = !!item.biddingEndsAt && new Date(item.biddingEndsAt).getTime() > Date.now();
  const secondsRemaining = item.biddingEndsAt
    ? Math.max(0, Math.ceil((new Date(item.biddingEndsAt).getTime() - Date.now()) / 1000))
    : null;
  const isWinning = !!viewerId && item.currentWinnerId === viewerId;
  const isSold = item.status === 'sold';
  const isUrgent = bidActive && (secondsRemaining ?? 0) <= 3;

  const priceLabel = `$${(item.priceCents / 100).toFixed(2).replace(/\.00$/, '')}`;
  const nextBidLabel = `$${((item.priceCents + 100) / 100).toFixed(2).replace(/\.00$/, '')}`;

  const profile = item.currentWinnerId ? winnerProfile[item.currentWinnerId] : undefined;
  const winnerName = profile?.username ?? 'someone';
  const winnerInitial = (profile?.username ?? '?').charAt(0).toUpperCase();

  async function handleBid(amountCents?: number) {
    if (bidding || !bidActive) return;
    setBidding(true);
    try {
      await livestreamsAPI.placeBid(item!.itemId, amountCents);
      // Realtime broadcast updates priceCents + biddingEndsAt; no
      // local optimistic write needed.
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('no_card_on_file')) {
        // Stash the item + chosen amount so the auto-retry after card
        // add replays the same intent (flat $1 OR the custom total).
        pendingBidRef.current = { itemId: item!.itemId, amountCents };
        window.dispatchEvent(new CustomEvent('inkstash:open-wallet', {
          detail: { autoOpenAddCard: true },
        }));
      } else if (msg.includes('cannot_self_bid')) {
        setToast("You can't bid on your own stream.");
      } else if (msg.includes('bidding_closed')) {
        setToast('Too late — bidding just closed.');
      } else if (msg.includes('not_bidding')) {
        setToast('Bidding isn\'t open on this item yet.');
      } else if (msg.includes('bid_too_low')) {
        setToast('Enter more than the current bid.');
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
          // No background / border / blur — auction block sits directly
          // over the video scrim, matching the desktop CurrentItemBar.
          color: '#fff',
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '11px',
            padding: '14px 16px 16px',
          }}
          >
            {/* Status line — only when there is an actual winner. With
                no bids yet the thumbnail + title carry "on the block"
                semantically, so we keep the surface quiet. */}
            {item.currentWinnerId && (bidActive || isSold) && (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: 13,
                  lineHeight: 1,
                  color: '#fff',
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: inkstashFonts.display,
                    fontWeight: 900,
                    fontSize: 10,
                    color: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    bgcolor: avatarBg(item.currentWinnerId),
                    backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {profile?.avatar_url ? '' : winnerInitial}
                </Box>
                <Box component="span" sx={{ fontWeight: 700 }}>{winnerName}</Box>
                <Box
                  component="span"
                  sx={{
                    fontFamily: inkstashFonts.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isSold ? '#5BD08A' : '#FFC53D',
                  }}
                >
                  {isSold ? 'won!' : 'is winning!'}
                </Box>
              </Box>
            )}

            {/* Lot row — 60px halftone thumb + info + price/timer. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
              }}
            >
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '11px',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                  backgroundImage: `url(${item.coverUrl ?? PLACEHOLDER_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                      'radial-gradient(circle, rgba(255,255,255,0.16) 1px, transparent 1.3px)',
                    backgroundSize: '6px 6px',
                    pointerEvents: 'none',
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
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.52)',
                    marginTop: '2px',
                  }}
                >
                  {flatShippingCents == null
                    ? 'Shipping + Taxes calculated at checkout'
                    : flatShippingCents === 0
                      ? 'Free shipping + Taxes'
                      : `$${(flatShippingCents / 100).toFixed(2).replace(/\.00$/, '')} Shipping + Taxes`}
                </Typography>
              </Box>

              <Box
                sx={{
                  textAlign: 'right',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '2px',
                }}
              >
                {item.priceCents > 0 && (
                  <Typography
                    sx={{
                      fontFamily: inkstashFonts.display,
                      fontWeight: 900,
                      fontSize: 27,
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {priceLabel}
                  </Typography>
                )}
                {isSold ? (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: inkstashFonts.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                      color: '#5BD08A',
                    }}
                  >
                    SOLD
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: inkstashFonts.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                      color: isUrgent ? '#FF5B5B' : '#FFC53D',
                      animation: isUrgent
                        ? 'mblAcBlinkInk 1s steps(2, jump-none) infinite'
                        : 'none',
                      '@keyframes mblAcBlinkInk': {
                        '50%': { opacity: 0.35 },
                      },
                      '@media (prefers-reduced-motion: reduce)': {
                        animation: 'none',
                      },
                      '&::before': {
                        content: '""',
                        width: '7px',
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: 'currentColor',
                        boxShadow: '0 0 6px currentColor',
                      },
                    }}
                  >
                    {bidActive && secondsRemaining !== null
                      ? formatTimer(secondsRemaining)
                      : 'On the block'}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Slide-to-bid pill — lock when winning, add-card CTA, or
                slider. Custom pill sits left of the slider/CTA while
                bidding is active and the viewer isn't the high bidder. */}
            {bidActive && isWinning ? (
              <Box sx={{
                flex: 1,
                height: 54,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                bgcolor: 'rgba(46,111,79,0.42)',
                border: '1px solid rgba(91,208,138,0.55)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: '#cdeed7',
                fontFamily: inkstashFonts.ui,
                fontWeight: 700,
                fontSize: 14,
              }}>
                <Check size={18} strokeWidth={2.6} color="#5BD08A" />
                You're the highest bidder
              </Box>
            ) : bidActive ? (
              <Box sx={{ display: 'flex', alignItems: 'stretch', gap: '11px' }}>
                <CustomBidButton
                  currentPriceCents={item.priceCents}
                  disabled={bidding}
                  onPick={(amountCents) => handleBid(amountCents)}
                />
                {hasCard === false ? (
                  <Box sx={{ flex: 1 }}>
                    <AddCardToBidCTA nextBidLabel={nextBidLabel} />
                  </Box>
                ) : (
                  <SlideToBid
                    label={`Bid ${nextBidLabel}`}
                    onConfirm={() => handleBid()}
                    disabled={false}
                    busy={bidding}
                  />
                )}
              </Box>
            ) : (
              <SlideToBid
                label="Bidding closed"
                onConfirm={() => handleBid()}
                disabled
                busy={bidding}
              />
            )}
        </Box>
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
