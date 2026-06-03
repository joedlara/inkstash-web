// src/components/livestreams/RightRailActions.tsx
//
// Mobile-only floating right-rail. Modern rounded chip stack with icon +
// uppercase label. Crisp white-on-dark with brand-red hover accent.

import { useState } from 'react';
import { Box, Typography, ButtonBase, Tooltip } from '@mui/material';
import { MoreHorizontal, Share2, Wallet as WalletIcon, ShoppingBag } from 'lucide-react';
import ShareDrawer from './ShareDrawer';
import MoreDrawer from './MoreDrawer';
import WalletDrawer from './WalletDrawer';
import { inkstashColors } from '../../theme/inkstashTokens';

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
          icon={<Share2 size={15} strokeWidth={2.4} />}
          label="Share"
          onClick={() => setOpenDrawer('share')}
        />
        <RailChip
          icon={<WalletIcon size={15} strokeWidth={2.4} />}
          label="Wallet"
          onClick={() => setOpenDrawer('wallet')}
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
          icon={<MoreHorizontal size={17} strokeWidth={2.4} />}
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
          fontFamily: "'Outfit', sans-serif",
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
}
