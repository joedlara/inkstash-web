// src/components/creatorHub/ShowCard.tsx
//
// One card in the Shows grid. Two variants based on the parent tab:
//   - upcoming: shows "when" + duration + reminder count + item count
//   - past:     shows revenue + order count + peak viewers
// Portrait gradient thumb on top with a 2-letter seal (initials of the
// title or category fallback).

import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  variant: 'upcoming' | 'past';
}

const PALETTES: Array<{ from: string; to: string }> = [
  { from: '#1F3A6E', to: '#0E1D3E' },
  { from: '#C2362F', to: '#5C1116' },
  { from: '#B8893A', to: '#6B4E1E' },
  { from: '#3F6F4A', to: '#1B3024' },
  { from: '#7A1A21', to: '#2E0608' },
  { from: '#5A2A82', to: '#2A0F47' },
];
function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length];
}

function sealFor(title: string) {
  // First letter of the first two words, or first two letters of the title.
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (title.slice(0, 2) || 'IK').toUpperCase();
}

function formatWhen(stream: Livestream): string {
  // Live now: "On now". Scheduled: weekday + time. Past: started_at.
  if (stream.status === 'live') return 'On now';
  const iso = stream.scheduled_start_at ?? stream.started_at;
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const day = sameDay
    ? 'Today'
    : isTomorrow
      ? 'Tomorrow'
      : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function ShowCard({ stream, variant }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);
  const seal = sealFor(stream.title);

  // TODO(data): items / reminders / revenue / orders aren't on the
  // Livestream type yet. Show placeholders that read honestly until
  // the analytics rollup lands.
  const meta = variant === 'upcoming'
    ? [
        // Items queued (we have livestream_items but no count on the row); use a dash
        { label: 'Items', value: '—' },
        // Reminders (we built livestream_reminders this round); query separately later
        { label: 'Reminders', value: '—' },
      ]
    : [
        { label: 'Revenue', value: '—' },
        { label: 'Orders', value: '—' },
        { label: 'Peak', value: stream.viewer_peak ? `${stream.viewer_peak}` : '—' },
      ];

  return (
    <Box
      onClick={() => navigate(stream.status === 'live' ? `/live/${stream.id}` : `/seller-dashboard`)}
      sx={{
        cursor: 'pointer',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: inkstashColors.borderStrong,
        },
      }}
    >
      {/* Thumb */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '3 / 2',
          background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Halftone dot overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.10) 1px, transparent 1.3px)',
          backgroundSize: '10px 10px',
        }} />
        {/* Seal */}
        <Typography sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 56,
          color: 'rgba(255,255,255,0.95)',
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {seal}
        </Typography>
        {/* Live pill when applicable */}
        {stream.status === 'live' && (
          <Box sx={{
            position: 'absolute', top: 10, left: 10,
            px: 1, py: '4px', borderRadius: 999,
            bgcolor: inkstashColors.live, color: '#fff',
            fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.08em', lineHeight: 1,
            boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
          }}>
            ON AIR
          </Box>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: stream.status === 'live' ? inkstashColors.brand : inkstashColors.muted,
          mb: 0.75,
        }}>
          {formatWhen(stream)}
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 15,
          fontWeight: 600,
          color: inkstashColors.ink,
          lineHeight: 1.3,
          mb: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {stream.title}
        </Typography>

        {/* Meta pills */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {meta.map((m) => (
            <Box key={m.label} sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: '4px',
              borderRadius: 999,
              bgcolor: inkstashColors.bgSunken,
              border: `1px solid ${inkstashColors.border}`,
              fontFamily: inkstashFonts.ui,
              fontSize: 11.5,
              color: inkstashColors.ink2,
            }}>
              <Box component="span" sx={{ color: inkstashColors.muted }}>{m.label}</Box>
              <Box component="span" sx={{ fontWeight: 700, color: inkstashColors.ink }}>{m.value}</Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
