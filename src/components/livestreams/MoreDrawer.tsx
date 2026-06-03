// src/components/livestreams/MoreDrawer.tsx
//
// Right-rail "More" placeholder drawer. Lists overflow actions (Report,
// Mute notifications, View profile, etc.) as stubs in this visual pass.
// Real wiring lands when the underlying features ship.

import { Drawer, Box, Typography, Button } from '@mui/material';
import { Flag, BellOff, User } from 'lucide-react';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ROWS = [
  { icon: <Flag size={18} />, label: 'Report stream' },
  { icon: <BellOff size={18} />, label: 'Mute notifications' },
  { icon: <User size={18} />, label: 'View profile' },
];

export default function MoreDrawer({ open, onClose }: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: inkstashColors.bgElev,
          borderTopLeftRadius: inkstashRadii.lg,
          borderTopRightRadius: inkstashRadii.lg,
          pb: 'max(env(safe-area-inset-bottom), 16px)',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 18,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            mb: 2,
          }}
        >
          More
        </Typography>

        {ROWS.map((r) => (
          <Box
            key={r.label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              width: '100%',
              py: 1.5,
              px: 1,
              color: inkstashColors.muted,
              borderBottom: `1px solid ${inkstashColors.border}`,
              opacity: 0.6,
            }}
          >
            {r.icon}
            <Typography sx={{ fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 14 }}>
              {r.label}
            </Typography>
            <Typography sx={{ ml: 'auto', fontSize: 10, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Soon
            </Typography>
          </Box>
        ))}

        <Button
          fullWidth
          onClick={onClose}
          sx={{
            mt: 1,
            py: 1.2,
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: inkstashColors.muted,
          }}
        >
          Close
        </Button>
      </Box>
    </Drawer>
  );
}
