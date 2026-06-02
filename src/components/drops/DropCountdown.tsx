// src/components/drops/DropCountdown.tsx
//
// Big flip-card style countdown. Each unit lives in its own dark card with
// a subtle gold pulse on the seconds tick — slot-machine energy without
// crossing into kitsch. Used both on the drop detail page (large) and on
// drop cards (compact, no cards, just digits).
//
// Lightweight: setInterval at 1s, cleared on unmount or target change.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  targetDate: string | Date;
  label?: string;
  /** Compact mode: small inline digits, no flip cards. Used inside DropCard tiles. */
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

  if (t.ms <= 0) {
    return (
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: compact ? 12 : 14,
          fontWeight: 800,
          color: inkstashColors.brand,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Live now
      </Typography>
    );
  }

  if (compact) {
    return <CompactCountdown d={t.d} h={t.h} m={t.m} s={t.s} label={label} />;
  }

  return <FlipCardCountdown d={t.d} h={t.h} m={t.m} s={t.s} tick={t.s} />;
}

// ── Big flip-card style ──────────────────────────────────────────────────────

function FlipCardCountdown({ d, h, m, s, tick }: { d: number; h: number; m: number; s: number; tick: number }) {
  const showDays = d > 0;
  const units: Array<{ value: number; label: string; isSeconds?: boolean }> = [
    ...(showDays ? [{ value: d, label: 'Days' }] : []),
    { value: h, label: 'Hours' },
    { value: m, label: 'Mins' },
    { value: s, label: 'Secs', isSeconds: true },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.75, sm: 1 },
      }}
    >
      {units.map((u, i) => (
        <Box key={u.label} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1 } }}>
          <FlipCard value={u.value} label={u.label} pulse={u.isSeconds ? tick : undefined} />
          {i < units.length - 1 && (
            <Typography
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: { xs: 24, sm: 36 },
                color: inkstashColors.brand,
                lineHeight: 1,
                opacity: 0.5,
                mb: 2.5,
              }}
            >
              :
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

function FlipCard({ value, label, pulse }: { value: number; label: string; pulse?: number }) {
  const padded = String(value).padStart(2, '0');
  const isSeconds = pulse !== undefined;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6 }}>
      <Box
        key={isSeconds ? padded : undefined}
        sx={{
          position: 'relative',
          minWidth: { xs: 52, sm: 68 },
          height: { xs: 64, sm: 84 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: inkstashColors.ink,
          color: '#FFF8E7',
          borderRadius: 2,
          overflow: 'hidden',
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: { xs: 36, sm: 50 },
          letterSpacing: '0.01em',
          fontVariantNumeric: 'tabular-nums',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(255,255,255,0.08)',
          // Slot-machine gold pulse only on the seconds card.
          animation: isSeconds ? 'dropPulseGold 1s ease-out' : undefined,
          '@keyframes dropPulseGold': {
            '0%':   { boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(255,255,255,0.08), 0 0 0 0 rgba(255,184,0,0.55)' },
            '40%':  { boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(255,255,255,0.08), 0 0 0 8px rgba(255,184,0,0)' },
            '100%': { boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 -2px 0 rgba(255,255,255,0.08), 0 0 0 0 rgba(255,184,0,0)' },
          },
          // Faux split line through the middle — flip-card aesthetic.
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1,
            bgcolor: 'rgba(0,0,0,0.35)',
          },
        }}
      >
        {padded}
      </Box>
      <Typography
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          fontWeight: 700,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ── Compact (used on the grid tiles) ─────────────────────────────────────────

function CompactCountdown({ d, h, m, s, label }: { d: number; h: number; m: number; s: number; label?: string }) {
  const segments: Array<{ value: number; unit: string }> = [];
  if (d > 0) segments.push({ value: d, unit: 'd' });
  if (h > 0 || d > 0) segments.push({ value: h, unit: 'h' });
  if (m > 0 || h > 0 || d > 0) segments.push({ value: m, unit: 'm' });
  segments.push({ value: s, unit: 's' });

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75, fontFamily: inkstashFonts.mono }}>
      {label && (
        <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 10, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mr: 0.5 }}>
          {label}
        </Typography>
      )}
      {segments.map((seg, i) => (
        <Box key={seg.unit} sx={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <Typography component="span" sx={{ fontFamily: inkstashFonts.mono, fontWeight: 800, fontSize: 12, color: inkstashColors.ink, fontVariantNumeric: 'tabular-nums' }}>
            {String(seg.value).padStart(2, '0')}
          </Typography>
          <Typography component="span" sx={{ fontFamily: inkstashFonts.mono, fontSize: 10, color: inkstashColors.muted, ml: 0.2, mr: i < segments.length - 1 ? 0.4 : 0 }}>
            {seg.unit}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
