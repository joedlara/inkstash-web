// src/components/livestreams/RightRailActions.tsx
//
// Vertical stack of action buttons floating on the right edge of the video.
// WhatNot-style: 48px translucent pills, white icons, tiny labels.
//
// In this visual pass: More + Share + Wallet wired up (drawers), Shop is
// disabled with a "Coming with auctions" tooltip. L2 enables Shop to open
// the auction queue UI.

import { useState } from 'react';
import { Box, Typography, ButtonBase, Tooltip } from '@mui/material';
import { MoreHorizontal, Share2, Wallet as WalletIcon, ShoppingBag } from 'lucide-react';
import ShareDrawer from './ShareDrawer';
import MoreDrawer from './MoreDrawer';
import WalletDrawer from './WalletDrawer';
import { inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  streamTitle: string;
  streamUrl: string;
}

type DrawerKey = 'more' | 'share' | 'wallet' | null;

export default function RightRailActions({ streamTitle, streamUrl }: Props) {
  const [openDrawer, setOpenDrawer] = useState<DrawerKey>(null);

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
          gap: 1.25,
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      >
        <RailButton
          icon={<MoreHorizontal size={20} />}
          label="More"
          onClick={() => setOpenDrawer('more')}
        />
        <RailButton
          icon={<Share2 size={18} />}
          label="Share"
          onClick={() => setOpenDrawer('share')}
        />
        <RailButton
          icon={<WalletIcon size={18} />}
          label="Wallet"
          onClick={() => setOpenDrawer('wallet')}
        />
        <Tooltip title="Coming with auctions" arrow placement="left">
          <span>
            <RailButton
              icon={<ShoppingBag size={18} />}
              label="Shop"
              disabled
            />
          </span>
        </Tooltip>
      </Box>

      <ShareDrawer
        open={openDrawer === 'share'}
        onClose={() => setOpenDrawer(null)}
        streamTitle={streamTitle}
        streamUrl={streamUrl}
      />
      <MoreDrawer open={openDrawer === 'more'} onClose={() => setOpenDrawer(null)} />
      <WalletDrawer open={openDrawer === 'wallet'} onClose={() => setOpenDrawer(null)} />
    </>
  );
}

function RailButton({
  icon, label, onClick, disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.3,
        width: 52,
        py: 0.75,
        borderRadius: 14,
        bgcolor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 120ms ease-out, background-color 160ms ease',
        '&:hover:not(.Mui-disabled)': {
          bgcolor: 'rgba(0,0,0,0.75)',
        },
        '&:active:not(.Mui-disabled)': {
          transform: 'scale(0.94)',
        },
      }}
    >
      {icon}
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </ButtonBase>
  );
}
