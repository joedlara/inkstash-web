// src/components/livestreams/ScheduledShowSheet.tsx
//
// Pre-show overlay rendered when /live/:id resolves to a scheduled
// stream (status='preparing' AND scheduled_start_at > now()). Shows
// the host's cover_image_url as the backdrop and a centered glass
// sheet with the show's start time, a Share Show CTA, and an
// Add-to-Calendar menu (Apple / Google / Outlook deep links).
//
// Sits inside the same surface shell as the live viewer so the right
// rail, chat composer, and (eventually) shop rail can all coexist
// without duplicating layout.

import { useMemo, useState, type MouseEvent } from 'react';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import { Upload, CalendarDays } from 'lucide-react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';
import type { Livestream } from '../../api/livestreams';

interface Props {
  stream: Livestream;
  /** Window URL used for the Share Show share intent / clipboard. */
  shareUrl: string;
}

function formatShowStart(iso: string): { dayLabel: string; timeLabel: string } {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  let dayLabel: string;
  if (sameDay(d, now)) dayLabel = 'Today';
  else if (sameDay(d, tomorrow)) dayLabel = 'Tomorrow';
  else dayLabel = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const timeLabel = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { dayLabel, timeLabel };
}

/** Format a Date as YYYYMMDDTHHMMSSZ for Google / Outlook calendar URLs. */
function isoForCalendar(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Build a calendar event payload for a given service. */
function buildCalendarUrls(stream: Livestream, watchUrl: string) {
  const startISO = stream.scheduled_start_at;
  if (!startISO) return null;
  const start = new Date(startISO);
  // Default to a 1-hour event; most livestreams in this app are ~30-60min.
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const title = stream.title || 'Inkstash livestream';
  const description = `Catch the show on InkStash: ${watchUrl}`;

  const startStr = isoForCalendar(start);
  const endStr = isoForCalendar(end);

  const google = `https://www.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(title)}`
    + `&dates=${startStr}/${endStr}`
    + `&details=${encodeURIComponent(description)}`;

  // Outlook web (works for live.com / hotmail). Same fields, different
  // URL shape. enddt/startdt are ISO with offset; Outlook accepts UTC.
  const outlook = `https://outlook.live.com/calendar/0/deeplink/compose`
    + `?path=/calendar/action/compose&rru=addevent`
    + `&subject=${encodeURIComponent(title)}`
    + `&startdt=${encodeURIComponent(start.toISOString())}`
    + `&enddt=${encodeURIComponent(end.toISOString())}`
    + `&body=${encodeURIComponent(description)}`;

  // Apple Calendar / native iCal — standards-based .ics body. We
  // wrap it in a Blob at click time (not here) because data: URLs
  // get blocked by Safari + several mobile browsers as file
  // downloads. Returning the raw body lets the click handler
  // create a Blob URL with a real download attribute.
  const icsBody = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InkStash//Livestream//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:livestream-${stream.id}@inkstash`,
    `DTSTAMP:${isoForCalendar(new Date())}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${description.replace(/\n/g, ' ')}`,
    `URL:${watchUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return { google, outlook, icsBody, title };
}

export default function ScheduledShowSheet({ stream, shareUrl }: Props) {
  const [calMenuAnchor, setCalMenuAnchor] = useState<HTMLElement | null>(null);
  const calendarUrls = useMemo(() => buildCalendarUrls(stream, shareUrl), [stream, shareUrl]);

  const startLabels = stream.scheduled_start_at
    ? formatShowStart(stream.scheduled_start_at)
    : null;

  async function handleShare() {
    const data = {
      title: stream.title || 'Inkstash livestream',
      text: `Catch ${stream.host?.username ?? 'this show'} on InkStash`,
      url: shareUrl,
    };
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(data);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // last-resort no-op; the URL is in the address bar already
    }
  }

  function openCalendarMenu(e: MouseEvent<HTMLElement>) {
    setCalMenuAnchor(e.currentTarget);
  }
  function closeCalendarMenu() {
    setCalMenuAnchor(null);
  }
  function pickCalendarUrl(href: string) {
    closeCalendarMenu();
    // Google / Outlook open the compose page in a new tab. _blank is
    // important so we don't navigate the viewer away from the show.
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function downloadIcs(body: string, title: string) {
    closeCalendarMenu();
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    // Blob URL with a download attribute. Safari mobile + most desktop
    // browsers refuse data:text/calendar as a download, but accept a
    // Blob URL fine. Filename has to end in .ics so iOS Safari hands
    // it to the Calendar app instead of rendering as plaintext.
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'event'}.ics`;
    // Some browsers ignore download on cross-origin / blob URLs unless
    // the anchor is in the DOM at click time.
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the browser a tick to start the download before we revoke.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Box
      // Full-bleed inside the parent video container. Cover image is the
      // backdrop; a soft dark scrim improves text contrast over busy art.
      sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: stream.cover_image_url ? `url(${stream.cover_image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#100b08',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,7,10,0.55) 0%, rgba(8,7,10,0.35) 40%, rgba(8,7,10,0.7) 100%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Centered glass sheet */}
      <Box
        sx={{
          position: 'absolute',
          top: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(420px, calc(100% - 32px))',
          padding: '20px 22px 22px',
          borderRadius: '20px',
          background: 'rgba(14,10,12,0.55)',
          border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.22), 0 18px 48px -16px rgba(0,0,0,0.7)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          zIndex: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: 13.5,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.01em',
          }}
        >
          Show Starts
        </Typography>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.005em',
            lineHeight: 1.05,
            textAlign: 'center',
            color: '#fff',
          }}
        >
          {startLabels ? `${startLabels.dayLabel}, ${startLabels.timeLabel}` : 'Soon'}
        </Typography>

        <Button
          fullWidth
          onClick={handleShare}
          startIcon={<Upload size={18} strokeWidth={2.4} />}
          sx={{
            mt: 0.5,
            borderRadius: 999,
            py: 1.25,
            fontFamily: inkstashFonts.ui,
            fontWeight: 800,
            fontSize: 14.5,
            textTransform: 'none',
            color: '#fff',
            bgcolor: inkstashColors.brand,
            '&:hover': { bgcolor: inkstashColors.brandDeep },
          }}
        >
          Share Show
        </Button>

        <Button
          fullWidth
          onClick={openCalendarMenu}
          startIcon={<CalendarDays size={18} strokeWidth={2.4} />}
          disabled={!calendarUrls}
          sx={{
            borderRadius: 999,
            py: 1.25,
            fontFamily: inkstashFonts.ui,
            fontWeight: 800,
            fontSize: 14.5,
            textTransform: 'none',
            color: inkstashColors.ink,
            bgcolor: '#fff',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.85)' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.5)', color: 'rgba(0,0,0,0.4)' },
          }}
        >
          Add to Calendar
        </Button>
        <Menu
          anchorEl={calMenuAnchor}
          open={!!calMenuAnchor}
          onClose={closeCalendarMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: 2,
                bgcolor: 'rgba(20,14,12,0.92)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(14px) saturate(160%)',
                WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                minWidth: 200,
              },
            },
          }}
        >
          <MenuItem onClick={() => calendarUrls && downloadIcs(calendarUrls.icsBody, calendarUrls.title)}>
            Apple Calendar
          </MenuItem>
          <MenuItem onClick={() => calendarUrls && pickCalendarUrl(calendarUrls.google)}>
            Google Calendar
          </MenuItem>
          <MenuItem onClick={() => calendarUrls && pickCalendarUrl(calendarUrls.outlook)}>
            Outlook
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
