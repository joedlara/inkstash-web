// src/components/livestreams/SchedCard.tsx
//
// Horizontal "Coming Up" card. Per docs/design-system/claude-design/
// live_breaks/breaks.css :: .sched-card.
//
// Layout: 96px portrait thumb on the left (with countdown chip overlay),
// body on the right with day/time line in brand-red mono, title, host
// row, and a foot row with expected-viewer label + Remind-me button.

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Livestream } from '../../api/livestreams';
import { livestreamRemindersAPI } from '../../api/livestreamReminders';
import HostAvatar from './HostAvatar';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface Props {
  stream: Livestream;
  /** Whether the current user already has a reminder on this stream.
   *  Hydrated once by the parent row to avoid N round-trips. */
  initialReminded?: boolean;
}

const TILE_PALETTES: Array<{ from: string; to: string }> = [
  { from: '#1F3A6E', to: '#0E1D3E' },
  { from: '#C2362F', to: '#5C1116' },
  { from: '#B8893A', to: '#6B4E1E' },
  { from: '#3F6F4A', to: '#1B3024' },
  { from: '#7A1A21', to: '#2E0608' },
  { from: '#5A2A82', to: '#2A0F47' },
  { from: '#A14613', to: '#4A1F08' },
];
function paletteFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return TILE_PALETTES[Math.abs(hash) % TILE_PALETTES.length];
}

// "Today · 9:30 PM" / "Tomorrow · 11:00 AM" / "Fri · 8:00 PM" — mirrors
// formatWhen() in breaks-view.jsx.
function formatWhen(iso: string | null): string {
  if (!iso) return 'soon';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayLabel = sameDay ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' });
  return `${dayLabel} · ${time}`;
}

// "Xd Xh" / "Xh Xm" / "Xm" — no seconds (visually noisy in a pill) and no
// "in " prefix (the pill style already implies a countdown).
function formatCountdown(iso: string | null): string {
  if (!iso) return 'soon';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'starting';
  const totalMin = Math.max(1, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SchedCard({ stream, initialReminded = false }: Props) {
  const navigate = useNavigate();
  const palette = paletteFor(stream.id);
  const [, setNow] = useState(Date.now());
  // Optimistic toggle. The parent row hydrates initial state in one
  // round-trip; this card calls the API on each toggle and reverts on
  // failure so a sign-out / network blip doesn't desync the UI.
  const [reminded, setReminded] = useState(initialReminded);
  const [pending, setPending] = useState(false);

  useEffect(() => { setReminded(initialReminded); }, [initialReminded]);

  useEffect(() => {
    // Tick every 30s — display has no seconds, so 1s would just burn cycles.
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  async function toggleReminder(e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    const next = !reminded;
    setReminded(next);
    setPending(true);
    const result = next
      ? await livestreamRemindersAPI.setReminder(stream.id)
      : await livestreamRemindersAPI.clearReminder(stream.id);
    setPending(false);
    if (!result.ok) {
      setReminded(!next);
      console.warn('[SchedCard] reminder toggle failed', result.reason);
    }
  }

  const hostName = stream.host?.username ?? 'host';
  // Stream metadata doesn't have an explicit "expected viewers" field;
  // fall back to "Expected soon" so the slot stays filled visually.
  const expectLabel = stream.viewer_peak
    ? `${stream.viewer_peak.toLocaleString()}+ expected`
    : 'Expected soon';

  return (
    <Box
      onClick={() => navigate(`/live/${stream.id}`)}
      sx={{
        display: 'flex',
        gap: 2,
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        p: 1.75,
        cursor: 'pointer',
        transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: inkstashShadows.md,
          borderColor: inkstashColors.borderStrong,
        },
      }}
    >
      {/* Thumb (3:4, 96px wide) with countdown chip at top center */}
      <Box
        sx={{
          position: 'relative',
          width: 96,
          flexShrink: 0,
          aspectRatio: '3 / 4',
          borderRadius: inkstashRadii.md,
          overflow: 'hidden',
          background: `linear-gradient(160deg, ${palette.from} 0%, ${palette.to} 100%)`,
        }}
      >
        {stream.cover_image_url && (
          <Box
            component="img"
            src={stream.cover_image_url}
            alt={stream.title}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
        )}

        {/* Countdown chip */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            px: '7px',
            py: '3px',
            borderRadius: 999,
            bgcolor: 'rgba(22,17,14,0.62)',
            border: '1px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          {formatCountdown(stream.scheduled_start_at)}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* When (brand-red mono uppercase) */}
        <Typography
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            fontWeight: 600,
            color: inkstashColors.brand,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            mb: 0.75,
          }}
        >
          {formatWhen(stream.scheduled_start_at)}
        </Typography>

        {/* Title */}
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 15,
            fontWeight: 600,
            color: inkstashColors.ink,
            lineHeight: 1.25,
            mb: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {stream.title}
        </Typography>

        {/* Host row */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            if (stream.host?.username) navigate(`/@${stream.host.username}`);
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.9,
            fontFamily: inkstashFonts.ui,
            fontSize: 12.5,
            color: inkstashColors.muted,
            cursor: 'pointer',
            transition: 'color 120ms ease',
            '&:hover': { color: inkstashColors.ink2 },
          }}
        >
          <HostAvatar
            username={stream.host?.username ?? null}
            avatarUrl={stream.host?.avatar_url ?? null}
            size={20}
          />
          <Box component="span">@{hostName}</Box>
        </Box>

        {/* Foot — expect label + Remind me toggle, pushed to bottom */}
        <Box
          sx={{
            mt: 'auto',
            pt: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.25,
          }}
        >
          <Typography
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 10.5,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: inkstashColors.muted2,
            }}
          >
            {expectLabel}
          </Typography>
          <Box
            component="button"
            onClick={toggleReminder}
            disabled={pending}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              border: `1px solid ${reminded ? inkstashColors.brand : inkstashColors.borderStrong}`,
              bgcolor: reminded ? inkstashColors.brand : inkstashColors.bgElev,
              color: reminded ? '#fff' : inkstashColors.ink,
              borderRadius: 999,
              px: 1.5,
              py: 0.75,
              fontFamily: inkstashFonts.ui,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: pending ? 'progress' : 'pointer',
              whiteSpace: 'nowrap',
              opacity: pending ? 0.7 : 1,
              transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease, opacity 120ms ease',
              '&:hover': {
                bgcolor: reminded ? inkstashColors.brandDeep : inkstashColors.bgSunken,
              },
            }}
            aria-pressed={reminded}
          >
            {reminded
              ? <Check size={13} strokeWidth={2.4} />
              : <Bell size={13} strokeWidth={2.2} />}
            {reminded ? 'Reminder set' : 'Remind me'}
          </Box>
        </Box>
      </Box>

    </Box>
  );
}
