// src/components/livestreams/RightRailActions.tsx
//
// Floating right-rail on the stream viewer. Circular icon-only chips
// stacked vertically — Share, Wallet, Shop (mobile/tablet only), More,
// Heart (with persisted like count below it). The rail anchors to the
// bottom of the video card on mobile so the chat composer never collides
// with it; desktop is its existing vertically-centered placement.
//
// Each chip opens a small floating popover anchored to itself (not a
// full-width bottom drawer) so the popover never blocks the camera feed.

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { MoreHorizontal, Share2, Wallet as WalletIcon, Store, Heart } from 'lucide-react';
import ShareDrawer from './ShareDrawer';
import MoreDrawer from './MoreDrawer';
import WalletDrawer from './WalletDrawer';
import { supabase } from '../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  streamTitle: string;
  streamUrl: string;
  /** When true, render the storefront chip. The shop chip is meaningful
   *  only on surfaces where the StreamShopRail is off-screen
   *  (mobile + tablet immersive + fullscreen). The desktop 3-column
   *  layout already shows the rail, so the parent passes false there. */
  showShop?: boolean;
  /** Fires when the storefront chip is tapped. Parent decides what to
   *  do (open a mobile shop overlay, route to the vendor page, etc.). */
  onShop?: () => void;
  /** Stream id — needed for the persisted Heart (tap_livestream_like
   *  RPC + the livestreams.like_count column the rail reads). */
  livestreamId?: string;
  /** "anchor" = bottom-relative; "center" = vertically centered.
   *  The mobile/fullscreen mounts pass "anchor" + a bottomOffset so the
   *  rail sits above the chat composer + auction card. Desktop uses the
   *  default centered placement. */
  placement?: 'center' | 'anchor';
  /** Extra bottom space (px) reserved by the composer + auction card.
   *  Only meaningful when placement="anchor". */
  bottomOffset?: number;
}

type PopoverKey = 'more' | 'share' | 'wallet' | null;

function formatLikes(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
}

export default function RightRailActions({
  streamTitle,
  streamUrl,
  showShop = true,
  onShop,
  livestreamId,
  placement = 'center',
  bottomOffset = 0,
}: Props) {
  const [open, setOpen] = useState<PopoverKey>(null);
  const [walletAutoAddCard, setWalletAutoAddCard] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  // Pop animation key — bumps on tap so the heart can re-trigger the
  // scale pulse. Decoupled from the count so the optimistic count update
  // doesn't fight the animation.
  const [likeTick, setLikeTick] = useState<number>(0);
  // One ref per button so each popover can anchor to the exact chip the
  // user tapped instead of all anchoring to the rail wrapper.
  const shareRef = useRef<HTMLButtonElement | null>(null);
  const walletRef = useRef<HTMLButtonElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  // The auction bid widgets live elsewhere in the tree (CurrentItemBar,
  // MobileAuctionCard). When a bid hits 'no_card_on_file' we want this
  // wallet popover to pop open AND jump straight to the add-card form.
  // A window CustomEvent keeps the bid widgets decoupled from this
  // sidebar without a global store.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ autoOpenAddCard?: boolean }>).detail;
      setWalletAutoAddCard(!!detail?.autoOpenAddCard);
      setOpen('wallet');
    };
    window.addEventListener('inkstash:open-wallet', onOpen);
    return () => window.removeEventListener('inkstash:open-wallet', onOpen);
  }, []);

  // Hydrate the like count once + subscribe to realtime updates so the
  // heart ticks up across all viewers in sync. The RPC returns the new
  // total on each call; we trust that as the authoritative value.
  useEffect(() => {
    if (!livestreamId) return;
    let cancelled = false;
    async function hydrate() {
      const { data } = await supabase
        .from('livestreams')
        .select('like_count')
        .eq('id', livestreamId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { like_count: number | null } | null;
      if (row?.like_count != null) setLikeCount(Number(row.like_count));
    }
    void hydrate();

    const channel = supabase
      .channel(`livestream_likes:${livestreamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'livestreams', filter: `id=eq.${livestreamId}` },
        (payload) => {
          if (cancelled) return;
          const next = (payload.new as { like_count?: number | null } | null)?.like_count;
          if (next != null) setLikeCount(Number(next));
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [livestreamId]);

  const tapHeart = useCallback(async () => {
    if (!livestreamId) return;
    // Optimistic +1 and trigger the pulse immediately so the tap feels
    // local even on a slow network. Realtime will reconcile.
    setLikeCount((n) => n + 1);
    setLikeTick((t) => t + 1);
    try {
      await supabase.rpc('tap_livestream_like', { p_livestream_id: livestreamId, p_taps: 1 });
    } catch {
      // Quiet failure: keep the optimistic +1, realtime will eventually
      // sync the authoritative value. A loud toast would be jarring for
      // a low-stakes interaction.
    }
  }, [livestreamId]);

  const close = () => {
    setOpen(null);
    setWalletAutoAddCard(false);
  };

  const onCardReady = () => {
    // Broadcast so the bid widget that triggered the wallet open can
    // retry place-bid without the user having to drag the slider again.
    window.dispatchEvent(new CustomEvent('inkstash:wallet-card-ready'));
  };

  // Positioning depends on whether the parent wants the rail centered
  // (desktop) or pinned above the chat composer (mobile/fullscreen).
  const positionSx = placement === 'anchor'
    ? {
        position: 'absolute' as const,
        right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
        // Bottom = safe-area + composer/auction reserve + a small gap.
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffset + 12}px)`,
        transition: 'bottom 180ms ease-out',
      }
    : {
        position: 'absolute' as const,
        right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
        top: '50%',
        transform: 'translateY(-50%)',
      };

  return (
    <>
      <Box
        sx={{
          ...positionSx,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.1,
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      >
        {/* Order per design: Share → Wallet → Shop (mobile/tablet) →
            More → Heart. The heart sits at the bottom with its count
            underneath like the live reference. */}
        <RailIcon
          ref={shareRef}
          icon={<Share2 size={18} strokeWidth={2.2} />}
          label="Share"
          onClick={() => setOpen('share')}
        />
        <RailIcon
          ref={walletRef}
          icon={<WalletIcon size={18} strokeWidth={2.2} />}
          label="Wallet"
          onClick={() => setOpen('wallet')}
        />
        {showShop && (
          <RailIcon
            icon={(
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Store size={18} strokeWidth={2.2} />
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -3,
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    bgcolor: inkstashColors.live,
                    boxShadow: '0 0 0 1.5px rgba(10,10,10,0.55)',
                  }}
                />
              </Box>
            )}
            label="Shop"
            onClick={onShop}
          />
        )}
        <RailIcon
          ref={moreRef}
          icon={<MoreHorizontal size={20} strokeWidth={2.2} />}
          label="More"
          onClick={() => setOpen('more')}
        />

        {/* Heart with count — persists across viewers via the
            tap_livestream_like RPC + the livestreams.like_count column. */}
        {livestreamId && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 }}>
            <RailIcon
              icon={(
                <Box
                  key={likeTick}
                  sx={{
                    display: 'inline-flex',
                    animation: 'rrHeartPop 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    '@keyframes rrHeartPop': {
                      '0%': { transform: 'scale(1)' },
                      '40%': { transform: 'scale(1.3)' },
                      '100%': { transform: 'scale(1)' },
                    },
                  }}
                >
                  <Heart size={18} strokeWidth={2.2} />
                </Box>
              )}
              label="Like"
              onClick={tapHeart}
            />
            <Typography
              aria-label={`${likeCount} likes`}
              sx={{
                fontFamily: inkstashFonts.ui,
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}
            >
              {formatLikes(likeCount)}
            </Typography>
          </Box>
        )}
      </Box>

      <ShareDrawer
        open={open === 'share'}
        onClose={close}
        anchorEl={shareRef.current}
        streamTitle={streamTitle}
        streamUrl={streamUrl}
      />
      <WalletDrawer
        open={open === 'wallet'}
        onClose={close}
        anchorEl={walletRef.current}
        autoOpenAddCard={walletAutoAddCard}
        onCardReady={onCardReady}
      />
      <MoreDrawer
        open={open === 'more'}
        onClose={close}
        anchorEl={moreRef.current}
      />
    </>
  );
}

// forwardRef so each chip can be a popover anchor without losing the
// existing ButtonBase semantics.
const RailIcon = forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  /** Visually hidden but readable to screen readers — keeps the rail
   *  accessible while removing the visible label per design. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}>(function RailIcon({ icon, label, onClick, disabled = false }, ref) {
  return (
    <ButtonBase
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      sx={{
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(10,10,10,0.55)',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px) saturate(160%)',
        WebkitBackdropFilter: 'blur(8px) saturate(160%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 14px -4px rgba(0,0,0,0.45)',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
        '&:hover:not(.Mui-disabled)': {
          bgcolor: 'rgba(10,10,10,0.7)',
        },
        '&:active:not(.Mui-disabled)': {
          transform: 'scale(0.93)',
        },
      }}
    >
      {icon}
    </ButtonBase>
  );
});
