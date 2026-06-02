// src/components/drops/DropCountdown.tsx
//
// Simple ticking countdown to a target timestamp. Renders Xd Yh Zm Ws.
// Stops updating once <= 0 (caller is responsible for switching to a
// "live" state at that point — usually a refresh of the drop data).
//
// Lightweight: setInterval at 1s, cleared on unmount or target change.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  targetDate: string | Date;
  /** Label prefix, e.g. "Drops in" or "Closes in". Defaults to no prefix. */
  label?: string;
  /** Compact mode hides the d/h/m/s separators and shrinks type. */
  compact?: boolean;
}

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  return { d, h, m, s, ms };
}

export default function DropCountdown({ targetDate, label, compact = false }: Props) {
  const target = typeof targetDate === 'string' ? new Date(targetDate).getTime() : targetDate.getTime();
  const [t, setT] = useState(diff(target));

  useEffect(() => {
    setT(diff(target));
    if (target <= Date.now()) return;
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const fontSize = compact ? 12 : 14;
  const numWeight = 800;

  if (t.ms <= 0) {
    return (
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize,
          fontWeight: 700,
          color: inkstashColors.brand,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Live now
      </Typography>
    );
  }

  // Show down to the most relevant unit. Skip days if 0, etc.
  const segments: Array<{ value: number; unit: string }> = [];
  if (t.d > 0) segments.push({ value: t.d, unit: 'd' });
  if (t.h > 0 || t.d > 0) segments.push({ value: t.h, unit: 'h' });
  if (t.m > 0 || t.h > 0 || t.d > 0) segments.push({ value: t.m, unit: 'm' });
  segments.push({ value: t.s, unit: 's' });

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, fontFamily: inkstashFonts.mono }}>
      {label && (
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: fontSize - 2,
            color: inkstashColors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mr: 0.5,
          }}
        >
          {label}
        </Typography>
      )}
      {segments.map((seg, i) => (
        <Box key={seg.unit} sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <Typography
            component="span"
            sx={{
              fontFamily: inkstashFonts.mono,
              fontWeight: numWeight,
              fontSize,
              color: inkstashColors.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(seg.value).padStart(2, '0')}
          </Typography>
          <Typography
            component="span"
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: fontSize - 2,
              color: inkstashColors.muted,
              ml: 0.2,
              mr: i < segments.length - 1 ? 0.4 : 0,
            }}
          >
            {seg.unit}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
