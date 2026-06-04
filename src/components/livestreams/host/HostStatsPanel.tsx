// src/components/livestreams/host/HostStatsPanel.tsx
//
// At-a-glance metrics for the host while streaming:
//   - Live viewers (LiveKit room.numParticipants reported by parent)
//   - Total unique viewers (DB count; ticks via the same refresh
//     interval as Stream duration)
//   - Stream duration (clock from started_at)
//   - Items sold (always 0 until L2 auctions ship)

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { inkstashColors, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  startedAt: string;
  liveViewers: number;
  totalUniqueViewers: number;
  itemsSold?: number;
}

function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function HostStatsPanel({ startedAt, liveViewers, totalUniqueViewers, itemsSold = 0 }: Props) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
      <Tile label="Live viewers" value={liveViewers} accent />
      <Tile label="Total joined" value={totalUniqueViewers} />
      <Tile label="Duration" value={formatDuration(now - start)} />
      <Tile label="Items sold" value={itemsSold} />
    </Box>
  );
}

function Tile({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.md,
      }}
    >
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 10.5,
          fontWeight: 700,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: inkstashFonts.ui,
          fontWeight: 900,
          fontSize: 22,
          color: accent ? inkstashColors.brand : inkstashColors.ink,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
