// src/components/livestreams/host/HostControlDrawer.tsx
//
// Bottom-sheet drawer the host pulls up to manage the stream without
// losing camera visibility. Three tabs: Chat / Queue / Stats. Camera
// stays in the top ~40% of the viewport; drawer takes the bottom ~60%.

import { useState } from 'react';
import { SwipeableDrawer, Box, Typography } from '@mui/material';
import HostQueuePanel from './HostQueuePanel';
import HostStatsPanel from './HostStatsPanel';
import { inkstashColors, inkstashRadii , inkstashFonts} from '../../../theme/inkstashTokens';

type Tab = 'queue' | 'stats';

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  livestreamId: string;
  startedAt: string;
  liveViewers: number;
  totalUniqueViewers: number;
  onAddItem: () => void;
}

export default function HostControlDrawer({
  open, onOpen, onClose, livestreamId, startedAt, liveViewers, totalUniqueViewers, onAddItem,
}: Props) {
  const [tab, setTab] = useState<Tab>('queue');

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableSwipeToOpen
      swipeAreaWidth={0}
      ModalProps={{ keepMounted: false }}
      PaperProps={{
        sx: {
          height: '60vh',
          borderTopLeftRadius: inkstashRadii.lg,
          borderTopRightRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Grab handle */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 999,
            bgcolor: inkstashColors.border,
          }}
        />
      </Box>

      {/* Tab strip */}
      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          px: 2,
          pb: 0,
          borderBottom: `1px solid ${inkstashColors.border}`,
          flexShrink: 0,
        }}
      >
        <TabBtn label="Queue" active={tab === 'queue'} onClick={() => setTab('queue')} />
        <TabBtn label="Stats" active={tab === 'stats'} onClick={() => setTab('stats')} />
      </Box>

      {/* Panel body */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {tab === 'queue' && <HostQueuePanel livestreamId={livestreamId} onAddItem={onAddItem} />}
        {tab === 'stats' && (
          <HostStatsPanel
            startedAt={startedAt}
            liveViewers={liveViewers}
            totalUniqueViewers={totalUniqueViewers}
          />
        )}
      </Box>
    </SwipeableDrawer>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        py: 1.25,
        cursor: 'pointer',
      }}
    >
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 14,
          fontWeight: 700,
          color: active ? inkstashColors.ink : inkstashColors.muted,
          letterSpacing: '-0.005em',
        }}
      >
        {label}
      </Typography>
      {active && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            right: 0,
            height: 2,
            bgcolor: inkstashColors.ink,
            borderRadius: 1,
          }}
        />
      )}
    </Box>
  );
}
