// src/components/livestreams/AuctionWinnerBanner.tsx
//
// Mirrors the giveaway-winner banner for the auction. Drops in over
// the video when a lot resolves to 'sold'. Reads from the same
// livestream_items row the auction block watches and only fires when
// the row transitions live → sold (or sold_pending_payment); it
// auto-dismisses after ~4.6s so the next lot can begin.
//
// Layout per .auction-winner + .aw-pill in the design system:
//   ┌─── Winner 🎉 ───┐
//   │  @joe won for $9!│
//   │  Charging your   │   (only when this viewer won)
//   │  card on file…   │
//   └──────────────────┘
//
// Default win effect: SpeedLines (manga radial focus). Honored
// prefers-reduced-motion (hidden via @media query in inline keyframes).

import { useEffect, useRef, useState } from 'react';
import { Box, GlobalStyles, Typography } from '@mui/material';
import { Check } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useWinnerUsername } from './useWinnerUsername';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  livestreamId: string;
}

interface Banner {
  itemId: string;
  winnerId: string | null;
  amountCents: number;
  // When the auction row is sold_pending_payment we know the
  // charge-auction-win edge fn is still running; sold means it
  // landed. We watch for the transition to flip the sub-line.
  isCharged: boolean;
}

const winnerKeyframes = (
  <GlobalStyles
    styles={{
      '@keyframes inkstashAwDrop': {
        from: { opacity: 0, transform: 'translateY(-14px) scale(0.965)' },
        to: { opacity: 1, transform: 'none' },
      },
      '@keyframes inkstashAwSpin': {
        to: { transform: 'rotate(360deg)' },
      },
      '@keyframes inkstashSpeedLines': {
        '0%': { opacity: 0, transform: 'scale(1.28) rotate(0deg)' },
        '15%': { opacity: 1, transform: 'scale(1) rotate(2deg)' },
        '70%': { opacity: 0.85 },
        '100%': { opacity: 0, transform: 'scale(1.05) rotate(3deg)' },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '.inkstash-speedlines': { display: 'none !important' },
        '.inkstash-aw': { animation: 'none !important' },
      },
    }}
  />
);

export default function AuctionWinnerBanner({ livestreamId }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const [banner, setBanner] = useState<Banner | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  // Last itemId we showed a banner for — debounces realtime
  // re-deliveries of the same sold-row update.
  const shownItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function consider(row: {
      id: string;
      status: string;
      current_winner_id: string | null;
      current_price_cents: number | null;
      winner_charged_at: string | null;
    }) {
      if (cancelled) return;
      const isSold = row.status === 'sold' || row.status === 'sold_pending_payment';
      if (!isSold) return;
      // Auto-dismiss banner for an item we've already shown. The
      // charge state is updated live below, so we don't re-mount.
      if (shownItemIdRef.current === row.id && banner) {
        // Update charge sub-line if this delivery flipped it.
        setBanner((b) => b && b.itemId === row.id ? {
          ...b,
          isCharged: !!row.winner_charged_at,
        } : b);
        return;
      }
      shownItemIdRef.current = row.id;
      setBanner({
        itemId: row.id,
        winnerId: row.current_winner_id,
        amountCents: row.current_price_cents ?? 0,
        isCharged: !!row.winner_charged_at,
      });
      // Hold for ~4.6s, then fade out so the next lot can take focus.
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = window.setTimeout(() => {
        if (!cancelled) setBanner(null);
      }, 4600);
    }

    const channel = supabase
      .channel(`auction_winner:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${livestreamId}` },
        (payload) => {
          const newRow = payload.new as {
            id: string; status: string; current_winner_id: string | null;
            current_price_cents: number | null; winner_charged_at: string | null;
          };
          consider(newRow);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livestreamId]);

  // Hook MUST run unconditionally (Rules of Hooks). Returning null
  // for the banner is fine — the hook still fires the SELECT.
  const winner = useWinnerUsername(banner?.winnerId ?? null);

  if (!banner) return null;

  const amountLabel = `$${(banner.amountCents / 100).toFixed(2).replace(/\.00$/, '')}`;
  const isYou = !!viewerId && banner.winnerId === viewerId;

  return (
    <>
      {winnerKeyframes}
      {/* SpeedLines layer — sits between the video and the banner.
          Single concentric burst per the spec. */}
      <Box
        className="inkstash-speedlines"
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          pointerEvents: 'none',
          overflow: 'hidden',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            inset: '-22%',
            transformOrigin: '50% 46%',
            opacity: 0,
            willChange: 'transform, opacity',
          },
          '&::before': {
            background: 'repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.5) 0.55deg, rgba(255,255,255,0) 1.15deg, rgba(255,255,255,0) 2.5deg)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 24%, #000 60%)',
            maskImage: 'radial-gradient(circle at 50% 46%, transparent 24%, #000 60%)',
            animation: 'inkstashSpeedLines 1.6s ease-out forwards',
          },
          '&::after': {
            background: 'repeating-conic-gradient(from 0.9deg at 50% 46%, rgba(161,35,44,0) 0deg, rgba(161,35,44,0.4) 0.4deg, rgba(161,35,44,0) 0.9deg, rgba(161,35,44,0) 3.2deg)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 30%, #000 66%)',
            maskImage: 'radial-gradient(circle at 50% 46%, transparent 30%, #000 66%)',
            animation: 'inkstashSpeedLines 1.7s ease-out 0.04s forwards',
          },
        }}
      />

      <Box
        className="inkstash-aw"
        role="status"
        sx={{
          position: 'absolute',
          top: 74,
          left: 16,
          right: 16,
          zIndex: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.2,
          padding: '15px 18px 16px',
          borderRadius: '18px',
          textAlign: 'center',
          bgcolor: 'rgba(14,10,12,0.55)',
          backdropFilter: 'blur(22px) saturate(170%)',
          WebkitBackdropFilter: 'blur(22px) saturate(170%)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 18px 48px -16px rgba(0,0,0,0.7)',
          animation: 'inkstashAwDrop 420ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <Typography
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
          Winner&nbsp;🎉
        </Typography>
        <Box
          sx={{
            width: '100%',
            padding: '11px 16px',
            borderRadius: '12px',
            bgcolor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 21,
            letterSpacing: '0.01em',
          }}
        >
          <Box component="span" sx={{ color: '#fff' }}>{winner?.username ?? 'someone'}</Box>
          <Box component="span" sx={{ color: '#5BD08A', ml: 0.5 }}>
            {' '}won for {amountLabel}!
          </Box>
        </Box>
        {isYou && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.85,
              fontFamily: inkstashFonts.mono,
              fontSize: 11.5,
              letterSpacing: '0.02em',
              color: banner.isCharged ? '#5BD08A' : 'rgba(255,255,255,0.72)',
            }}
          >
            {banner.isCharged ? (
              <>
                <Check size={13} strokeWidth={2.6} />
                Card on file charged · {amountLabel}
              </>
            ) : (
              <>
                <Box
                  component="span"
                  sx={{
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'inkstashAwSpin 0.7s linear infinite',
                  }}
                />
                Charging your card on file…
              </>
            )}
          </Box>
        )}
      </Box>
    </>
  );
}
