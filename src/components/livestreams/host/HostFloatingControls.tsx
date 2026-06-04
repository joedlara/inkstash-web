// src/components/livestreams/host/HostFloatingControls.tsx
//
// Right-edge floating button stack the host taps to manage the broadcast:
//   - Mic mute toggle (LiveKit local audio track enabled state)
//   - + Add item (opens picker; defers wiring to L2 auctions)
//   - Control (opens the bottom drawer with Chat / Queue / Stats tabs)
//
// Camera flip is handled by LiveStreamVideo's own button (existing).

import { Box, IconButton, Typography } from '@mui/material';
import { Mic, MicOff, Plus, LayoutGrid } from 'lucide-react';
import { inkstashColors , inkstashFonts} from '../../../theme/inkstashTokens';

interface Props {
  micMuted: boolean;
  onToggleMic: () => void;
  onAddItem: () => void;
  onOpenControl: () => void;
}

export default function HostFloatingControls({ micMuted, onToggleMic, onAddItem, onOpenControl }: Props) {
  return (
    <Box
      sx={{
        position: 'absolute',
        right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        zIndex: 4,
      }}
    >
      <ControlChip
        icon={micMuted ? <MicOff size={18} /> : <Mic size={18} />}
        label={micMuted ? 'Unmute' : 'Mute'}
        onClick={onToggleMic}
        emphasis={micMuted ? 'warn' : 'normal'}
      />
      <ControlChip
        icon={<Plus size={20} strokeWidth={2.5} />}
        label="Add"
        onClick={onAddItem}
      />
      <ControlChip
        icon={<LayoutGrid size={18} />}
        label="Control"
        onClick={onOpenControl}
      />
    </Box>
  );
}

function ControlChip({
  icon, label, onClick, emphasis = 'normal',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  emphasis?: 'normal' | 'warn';
}) {
  const isWarn = emphasis === 'warn';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
      <IconButton
        onClick={onClick}
        sx={{
          width: 48,
          height: 48,
          bgcolor: isWarn ? inkstashColors.live : 'rgba(10,10,10,0.65)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.18)',
          transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
          '&:hover': {
            bgcolor: isWarn ? '#B91C1C' : 'rgba(10,10,10,0.85)',
          },
          '&:active': { transform: 'scale(0.94)' },
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {icon}
      </IconButton>
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.005em',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
