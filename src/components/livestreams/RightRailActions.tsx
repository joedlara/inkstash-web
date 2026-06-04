// src/components/livestreams/RightRailActions.tsx
//
// Floating right-rail on the stream viewer. Each chip opens a small
// floating popover anchored to itself (not a full-width bottom drawer)
// so the popover never blocks the camera feed.

import { forwardRef, useRef, useState } from 'react';
import { Box, Typography, ButtonBase, Tooltip } from '@mui/material';
import { MoreHorizontal, Share2, Wallet as WalletIcon, ShoppingBag } from 'lucide-react';
import ShareDrawer from './ShareDrawer';
import MoreDrawer from './MoreDrawer';
import WalletDrawer from './WalletDrawer';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  streamTitle: string;
  streamUrl: string;
}

type PopoverKey = 'more' | 'share' | 'wallet' | null;

export default function RightRailActions({ streamTitle, streamUrl }: Props) {
  const [open, setOpen] = useState<PopoverKey>(null);
  // One ref per button so each popover can anchor to the exact chip the
  // user tapped instead of all anchoring to the rail wrapper.
  const shareRef = useRef<HTMLButtonElement | null>(null);
  const walletRef = useRef<HTMLButtonElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(null);

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
        <Tooltip title="Coming with auctions" arrow placement="left">
          <span>
            <RailChip
              icon={<ShoppingBag size={15} strokeWidth={2.4} />}
              label="Shop"
              disabled
            />
          </span>
        </Tooltip>
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
        bgcolor: 'rgba(10,10,10,0.65)',
        backdropFilter: 'blur(10px)',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
        '&:hover:not(.Mui-disabled)': {
          bgcolor: 'rgba(10,10,10,0.9)',
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
