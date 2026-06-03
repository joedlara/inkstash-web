// src/components/livestreams/RightRailActions.tsx
//
// Editorial right rail: labeled chip stack, NOT generic floating circles.
// Each chip is a rounded rectangle with the icon on the left + a tiny mono
// label. Reads like the action shelf of a broadcast studio control panel.

import { useState } from 'react';
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
          gap: 0.85,
          zIndex: 2,
          pointerEvents: 'auto',
        }}
      >
        <RailChip
          icon={<Share2 size={16} strokeWidth={2.4} />}
          label="Share"
          onClick={() => setOpenDrawer('share')}
        />
        <RailChip
          icon={<WalletIcon size={16} strokeWidth={2.4} />}
          label="Wallet"
          onClick={() => setOpenDrawer('wallet')}
        />
        <Tooltip title="Coming with auctions" arrow placement="left">
          <span>
            <RailChip
              icon={<ShoppingBag size={16} strokeWidth={2.4} />}
              label="Shop"
              disabled
            />
          </span>
        </Tooltip>
        <RailChip
          icon={<MoreHorizontal size={18} strokeWidth={2.4} />}
          label="More"
          onClick={() => setOpenDrawer('more')}
        />
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

function RailChip({
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
        alignItems: 'center',
        gap: 0.75,
        // Asymmetric pill so the stack reads as a column, not a list of dots
        pl: 1,
        pr: 1.35,
        py: 0.85,
        borderRadius: '14px 4px 4px 14px',
        bgcolor: 'rgba(10,10,10,0.72)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: disabled ? 'rgba(255,255,255,0.4)' : '#fff',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 120ms ease-out, background-color 160ms ease, border-color 160ms ease',
        '&:hover:not(.Mui-disabled)': {
          bgcolor: 'rgba(10,10,10,0.92)',
          borderColor: 'rgba(184,137,58,0.6)',
        },
        '&:active:not(.Mui-disabled)': {
          transform: 'scale(0.96)',
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
          letterSpacing: '0.1em',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </ButtonBase>
  );
}
