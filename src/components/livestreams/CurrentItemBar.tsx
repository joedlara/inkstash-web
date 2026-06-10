// src/components/livestreams/CurrentItemBar.tsx
//
// Bottom-of-video auction block. Visual spec:
// docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.ac-status, .ac-thumb, .ac-info, .ac-title, .ac-ship, .ac-right,
// .ac-price, .ac-timer, .bid-lock, .auction-block).
//
// Rhythm: status line → lot row (thumb · info · right) → bid row.
// Container 14/16/16 with 11px vertical gaps. NO glassmorphism on
// the lot card; transparent over the stream scrim.

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
}

interface CurrentItem {
  itemId: string;
  title: string;
  thumbUrl: string | null;
  price: number | null;
  status: 'live' | 'sold' | 'passed';
  currentPriceCents: number | null;
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

export default function CurrentItemBar({ livestreamId }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const { hasCard } = useHasSavedCard();
  const [item, setItem] = useState<CurrentItem | null>(null);
  const [bidding, setBidding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Tick for the countdown re-render. Realtime handles new-bid updates;
  // this just animates the timer between server pushes.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Per-id profile cache for the status-line username + avatar.
  // Same shape as useLivestreamChat's profile lookup so future
  // factoring can lift this into a shared hook.
  const [winnerProfile, setWinnerProfile] = useState<Record<string, WinnerProfile>>({});

  // Tracks the bid we tried to place when the wallet 402'd, so the
  // post-card-add auto-retry can replay it. Tagged shape so a custom
  // amount survives the round-trip — a plain item-id ref would lose
  // the chosen jump and silently downgrade the retry to flat $1.
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

  async function handleBid(amountCents?: number) {
    if (!item || bidding) return;
    setBidding(true);
    try {
      await livestreamsAPI.placeBid(item.itemId, amountCents);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('no_card_on_file')) {
        pendingBidRef.current = { itemId: item.itemId, amountCents };
        window.dispatchEvent(new CustomEvent('inkstash:open-wallet', {
          detail: { autoOpenAddCard: true },
        }));
      } else if (msg.includes('cannot_self_bid')) {
        setToast("You can't bid on your own stream.");
      } else if (msg.includes('bidding_closed')) {
        setToast('Too late — bidding just closed.');
      } else if (msg.includes('not_bidding')) {
        setToast("Bidding isn't open on this item yet.");
      } else if (msg.includes('bid_too_low')) {
        setToast('Enter more than the current bid.');
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
      // Extended select: include photos so the spec's 60px thumbnail
      // can render the first image. Mirrors the listings shape used
      // by the shop rail (jsonb array of {url} objects).
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title, buy_now_price, photos')
        .eq('id', pick.listing_id)
        .maybeSingle();
      if (cancelled) return;
      if (!listing) { setItem(null); return; }
      const l = listing as {
        id: string;
        title: string;
        buy_now_price: number | null;
        photos: Array<{ url: string }> | null;
      };
      const thumbUrl = Array.isArray(l.photos) && l.photos[0]?.url ? l.photos[0].url : null;
      setItem({
        itemId: pick.id,
        title: l.title,
        thumbUrl,
        price: l.buy_now_price,
        status: pick.status === 'sold_pending_payment' ? 'sold' : pick.status,
        currentPriceCents: pick.current_price_cents,
        bidCount: pick.bid_count ?? 0,
        biddingEndsAt: pick.bidding_ends_at,
        currentWinnerId: pick.current_winner_id,
      });
    }

    fetchCurrent();
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

  // Resolve winner profile on demand. Same select shape as the chat
  // hook; cached per id so a rapid-bid stream doesn't refetch.
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
  const displayCents = item.currentPriceCents
    ?? Math.round(Number(item.price ?? 1) * 100);
  const displayPriceLabel = `$${(displayCents / 100).toFixed(2).replace(/\.00$/, '')}`;
  const nextBidLabel = `$${((displayCents + 100) / 100).toFixed(2).replace(/\.00$/, '')}`;
  const isWinning = !!viewerId && item.currentWinnerId === viewerId;
  const isSold = item.status === 'sold';
  const isUrgent = bidActive && (secondsRemaining ?? 0) <= 3;

  const profile = item.currentWinnerId ? winnerProfile[item.currentWinnerId] : undefined;
  const winnerName = profile?.username ?? 'someone';
  const winnerInitial = (profile?.username ?? '?').charAt(0).toUpperCase();

  return (
    <Box
      sx={{
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
        padding: '14px 16px 16px',
      }}
    >
      {/* Status line — sized + spaced per .ac-status / .ac-winning / .ac-won */}
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
        {item.currentWinnerId && (bidActive || isSold) ? (
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
        ) : null}
        {item.currentWinnerId && (bidActive || isSold) ? (
          <>
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
          </>
        ) : (
          <>
            <Box component="span" sx={{ fontWeight: 700 }}>On the block</Box>
            <Box
              component="span"
              sx={{
                fontFamily: inkstashFonts.mono,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#FFC53D',
              }}
            >
              no bids yet
            </Box>
          </>
        )}
      </Box>

      {/* Lot row — thumb · info · right column */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
        }}
      >
        {/* 60px thumbnail with halftone dot overlay (.ac-thumb) */}
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '11px',
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
            backgroundImage: `url(${item.thumbUrl ?? PLACEHOLDER_IMAGE_URL})`,
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

        {/* Info column (.ac-info) */}
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
            Shipping + taxes at checkout
          </Typography>
        </Box>

        {/* Right column — price stacked above timer (.ac-right / .ac-price / .ac-timer) */}
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
          {/* Timer pill — dot + mono mm:ss */}
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
                  ? 'acBlinkInk 1s steps(2, jump-none) infinite'
                  : 'none',
                '@keyframes acBlinkInk': {
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

      {/* Bid row — slider OR lock pill OR "add a card" CTA, only while bidding active */}
      {bidActive && (isWinning ? (
        <Box
          sx={{
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
          }}
        >
          <Check size={18} strokeWidth={2.6} color="#5BD08A" />
          You're the highest bidder
        </Box>
      ) : (
        // Custom pill sits left of the slider (or the no-card CTA).
        // 11px gap matches stream.css .bid-row.
        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: '11px' }}>
          <CustomBidButton
            currentPriceCents={displayCents}
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
