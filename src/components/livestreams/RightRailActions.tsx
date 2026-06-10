// src/components/livestreams/RightRailActions.tsx
//
// Floating right-rail on the stream viewer. Each chip opens a small
// floating popover anchored to itself (not a full-width bottom drawer)
// so the popover never blocks the camera feed.

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Box, Typography, ButtonBase } from '@mui/material';
import { MoreHorizontal, Share2, Wallet as WalletIcon, Store } from 'lucide-react';
import ShareDrawer from './ShareDrawer';
import MoreDrawer from './MoreDrawer';
import WalletDrawer from './WalletDrawer';
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
}

type PopoverKey = 'more' | 'share' | 'wallet' | null;

export default function RightRailActions({ streamTitle, streamUrl, showShop = true, onShop }: Props) {
  const [open, setOpen] = useState<PopoverKey>(null);
  const [walletAutoAddCard, setWalletAutoAddCard] = useState(false);
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

  const close = () => {
    setOpen(null);
    setWalletAutoAddCard(false);
  };

  const onCardReady = () => {
    // Broadcast so the bid widget that triggered the wallet open can
    // retry place-bid without the user having to drag the slider again.
    window.dispatchEvent(new CustomEvent('inkstash:wallet-card-ready'));
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.85,
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      >
        <RailChip
          ref={shareRef}
          icon={<Share2 size={15} strokeWidth={2.4} />}
          label="Share"
          onClick={() => setOpen('share')}
        />
        <RailChip
          ref={walletRef}
          icon={<WalletIcon size={15} strokeWidth={2.4} />}
          label="Wallet"
          onClick={() => setOpen('wallet')}
        />
        {/* Storefront chip — only rendered when the shop rail is off-
            screen (mobile/tablet/fullscreen). The dot is a subtle
            "new inventory" affordance; tap routes through onShop. */}
        {showShop && (
          <RailChip
            icon={(
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Store size={15} strokeWidth={2.4} />
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -3,
                    width: 6,
                    height: 6,
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
        <RailChip
          ref={moreRef}
          icon={<MoreHorizontal size={17} strokeWidth={2.4} />}
          label="More"
          onClick={() => setOpen('more')}
        />
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
const RailChip = forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}>(function RailChip({ icon, label, onClick, disabled = false }, ref) {
  return (
    <ButtonBase
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        pl: 1.1,
        pr: 1.4,
        py: 0.85,
        borderRadius: 999,
        // Glass: lighter dark fill + softer blur so the video reads through,
        // but a 1px inner highlight + edge stroke keep the label legible.
        bgcolor: 'rgba(10,10,10,0.38)',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(5px) saturate(160%)',
        WebkitBackdropFilter: 'blur(5px) saturate(160%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px -4px rgba(0,0,0,0.45)',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
        '&:hover:not(.Mui-disabled)': {
          bgcolor: 'rgba(10,10,10,0.55)',
        },
        '&:active:not(.Mui-disabled)': {
          transform: 'scale(0.96)',
        },
      }}
    >
      {icon}
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '-0.005em',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </ButtonBase>
  );
});
