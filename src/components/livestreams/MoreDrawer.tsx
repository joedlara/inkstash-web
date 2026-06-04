// src/components/livestreams/MoreDrawer.tsx
//
// Right-rail "More" popover. Anchored to the rail More chip. Lists
// overflow actions (Report, Mute notifications, View profile, etc.)
// as stubs in this visual pass; real wiring lands when the underlying
// features ship.

import { Popover, Box, Typography } from '@mui/material';
import { Flag, BellOff, User } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

const ROWS = [
  { icon: <Flag size={16} />, label: 'Report stream' },
  { icon: <BellOff size={16} />, label: 'Mute notifications' },
  { icon: <User size={16} />, label: 'View profile' },
];

export default function MoreDrawer({ open, onClose, anchorEl }: Props) {
  return (
    <Popover
      open={open && !!anchorEl}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
      transformOrigin={{ vertical: 'center', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mr: 1.5,
            width: 240,
            bgcolor: inkstashColors.bgElev,
            borderRadius: inkstashRadii.md,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
            border: `1px solid ${inkstashColors.border}`,
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ p: 1 }}>
        {ROWS.map((r, i) => (
          <Box
            key={r.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              width: '100%',
              py: 1.1,
              px: 1.25,
              color: inkstashColors.muted,
              borderBottom: i < ROWS.length - 1 ? `1px solid ${inkstashColors.border}` : 'none',
              opacity: 0.7,
            }}
          >
            {r.icon}
            <Typography sx={{ fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 13 }}>
              {r.label}
            </Typography>
            <Typography
              sx={{
                ml: 'auto',
                fontSize: 9.5,
                color: inkstashColors.muted,
                fontFamily: inkstashFonts.mono,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Soon
            </Typography>
          </Box>
        ))}
      </Box>
    </Popover>
  );
}
