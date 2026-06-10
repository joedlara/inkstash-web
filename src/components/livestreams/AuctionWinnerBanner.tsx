// src/components/livestreams/AuctionWinnerBanner.tsx
//
// Drops in over the video when an item resolves to sold. Self-mounts:
// watches livestream_items realtime for transitions to sold/sold_pending_payment,
// fetches the winner's username + final amount, and (only when the viewer IS
// the winner) calls livestreamsAPI.chargeWin(item_id) to settle their card.
//
// Visual spec: docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.auction-winner, .aw-title, .aw-pill, .aw-name, .aw-won, .aw-charge, .aw-spin).
// Animation: awDrop 0.42s. Auto-dismiss ~4.6s.
//
// SpeedLinesEffect is a sibling — both render absolutely into the same
// positioned ancestor (the existing #livestream-winner-slot on desktop, the
// fullscreen / mobile video container otherwise).

import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { livestreamsAPI } from '../../api/livestreams';
import { useAuth } from '../../hooks/useAuth';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

interface SoldSnapshot {
  itemId: string;
  winnerId: string | null;
  amountCents: number;
  winnerUsername: string;
}

type ChargeState = 'idle' | 'charging' | 'paid' | 'failed';

const AUTO_DISMISS_MS = 4600;

function moneyCents(cents: number): string {
  const n = (cents / 100).toFixed(2).replace(/\.00$/, '');
  return `$${n}`;
}

export default function AuctionWinnerBanner({ livestreamId }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<SoldSnapshot | null>(null);
  const [chargeState, setChargeState] = useState<ChargeState>('idle');
  // Tracks which item ids we've already celebrated this session so a
  // realtime UPDATE that re-fires (e.g. when sold_pending_payment ticks
  // a payment_intent_id later) doesn't replay the banner.
  const celebratedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function hydrateAndShow(itemId: string) {
      if (celebratedRef.current.has(itemId)) return;
      celebratedRef.current.add(itemId);

      // Pull the resolved row + the winner's display name in two cheap
      // round trips. Matches the lookup pattern CurrentItemBar uses.
      const { data: row } = await supabase
        .from('livestream_items')
        .select('id, current_price_cents, current_winner_id, status')
        .eq('id', itemId)
        .maybeSingle();
      if (cancelled || !row) return;
      const r = row as {
        id: string;
        current_price_cents: number | null;
        current_winner_id: string | null;
        status: string;
      };
      // Defensive: only celebrate genuine sold-with-winner transitions.
      // status='passed' (no bidders) and missing winner = no banner.
      if (r.status !== 'sold' && r.status !== 'sold_pending_payment') return;
      if (!r.current_winner_id || r.current_price_cents == null) return;

      let winnerUsername = 'someone';
      const { data: u } = await supabase
        .from('users')
        .select('username')
        .eq('id', r.current_winner_id)
        .maybeSingle();
      if (!cancelled && u) {
        const row = u as { username: string | null };
        winnerUsername = row.username ?? 'someone';
      }

      if (cancelled) return;
      setSnapshot({
        itemId: r.id,
        winnerId: r.current_winner_id,
        amountCents: r.current_price_cents,
        winnerUsername,
      });

      // Only the actual winner sees the charge state; the host & other
      // viewers see the celebration but never trigger chargeWin from
      // their session (chargeWin is host-only, but it's idempotent —
      // gating client-side avoids needless edge fn invocations).
      if (viewerId && r.current_winner_id === viewerId) {
        setChargeState('charging');
        livestreamsAPI.chargeWin(r.id)
          .then((res) => {
            if (cancelled) return;
            if (res.status === 'charged' || res.status === 'already_charged') {
              setChargeState('paid');
            } else {
              setChargeState('failed');
            }
          })
          .catch(() => {
            if (cancelled) return;
            setChargeState('failed');
          });
      } else {
        setChargeState('idle');
      }
    }

    // Realtime: any row in this stream that flips to sold/sold_pending_payment
    // triggers a banner. Both INSERT (host pushes a sold-on-arrival row)
    // and UPDATE (live → sold transition) paths are covered.
    const channel = supabase
      .channel(`auction_winner_banner:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        (payload) => {
          const next = (payload.new ?? {}) as { id?: string; status?: string };
          if (!next.id) return;
          if (next.status === 'sold' || next.status === 'sold_pending_payment') {
            hydrateAndShow(next.id);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [livestreamId, viewerId]);

  // Auto-dismiss timer — restarts whenever a new snapshot lands.
  useEffect(() => {
    if (!snapshot) return;
    const id = window.setTimeout(() => setSnapshot(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [snapshot]);

  if (!snapshot) return null;

  const isWinner = !!viewerId && snapshot.winnerId === viewerId;

  return (
    <Box
      role="status"
      sx={{
        // Sits absolutely within its parent (the existing slot or the
        // video container). No own positioning math beyond inset.
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '9px',
        padding: '15px 18px 16px',
        borderRadius: '18px',
        textAlign: 'center',
        maxWidth: 360,
        width: 'min(360px, calc(100% - 32px))',
        // Glass card per .auction-winner. backdropFilter (+ -webkit-) for
        // Safari support; the box-shadow combo gives the soft inner light
        // plus the long drop.
        background: 'rgba(14,10,12,0.55)',
        backdropFilter: 'blur(22px) saturate(170%)',
        WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.22), 0 18px 48px -16px rgba(0,0,0,0.7)',
        color: '#fff',
        animation: 'awDropInk .42s cubic-bezier(.22,.61,.36,1) both',
        '@keyframes awDropInk': {
          from: { opacity: 0, transform: 'translateY(-14px) scale(0.965)' },
          to:   { opacity: 1, transform: 'none' },
        },
      }}
    >
      <Typography
        component="div"
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 27,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          color: '#fff',
          lineHeight: 1,
        }}
      >
        {/* Trailing emoji uses a nbsp so it doesn't soft-wrap from the
            display font. */}
        Winner&nbsp;🎉
      </Typography>

      <Box
        sx={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.18)',
          fontFamily: inkstashFonts.display,
          fontWeight: 800,
          fontSize: 21,
          letterSpacing: '0.01em',
        }}
      >
        <Box component="span" sx={{ color: '#fff' }}>
          {snapshot.winnerUsername}
        </Box>
        <Box component="span" sx={{ color: '#5BD08A' }}>
          {' '}won for {moneyCents(snapshot.amountCents)}!
        </Box>
      </Box>

      {isWinner && chargeState !== 'idle' && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: inkstashFonts.mono,
            fontSize: '11.5px',
            letterSpacing: '0.02em',
            color: chargeState === 'paid' ? '#5BD08A' : 'rgba(255,255,255,0.72)',
          }}
        >
          {chargeState === 'paid' ? (
            <>
              <Check size={13} strokeWidth={2.6} />
              Card on file charged · {moneyCents(snapshot.amountCents)}
            </>
          ) : chargeState === 'failed' ? (
            // Quiet failure — the host gets paged through Stripe + the
            // edge fn; the viewer doesn't need a loud error.
            <>Charge pending — we'll retry</>
          ) : (
            <>
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: 13,
                  height: 13,
                  borderRadius: 999,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'awSpinInk .7s linear infinite',
                  '@keyframes awSpinInk': {
                    to: { transform: 'rotate(360deg)' },
                  },
                }}
              />
              Charging your card on file…
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
