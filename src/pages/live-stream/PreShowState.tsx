// PreShowState — Whatnot-style pre-show shell rendered inside /live/:id when
// the livestream is `scheduled` (and not yet live). Mirrors the prototype's
// chrome (HostPill top-left, ViewerCountBadge top-right, RightRail right) but
// replaces the auction stage with a center banner card ("Show Starts" +
// Share/Add-to-Calendar CTAs) and swaps the chat composer for a read-only
// "Chat opens when the show starts" pill.
//
// Phase 2b is presentation-only: Share triggers navigator.share / clipboard
// fallback, Add to Calendar generates a local ICS download. No backend, no
// poll banner (that's a separate feature), no host-only "Start Show" CTA.
// Phase 3 wires the same component against the real `livestreams` row.

import { useState } from 'react';
import { HostPill } from './stage/HostPill';
import { ViewerCountBadge } from './stage/ViewerCountBadge';
import { RightRail } from './stage/RightRail';
import { ShopRail } from './shop/ShopRail';
import { avatarGrad } from './chat/usernameColor';
import type { Livestream } from './useLivestream';

type Props = {
  livestream: Livestream;
};

// 1h-ahead → "Today, 1:00 PM". Tomorrow → "Tomorrow, 7:30 AM". Else weekday
// + abbreviated date. The clock format honors the user's locale.
function formatShowStart(iso: string): { dayLabel: string; timeLabel: string } {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const dayLabel = sameDay(d, now)
    ? 'Today'
    : sameDay(d, tomorrow)
      ? 'Tomorrow'
      : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  const timeLabel = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return { dayLabel, timeLabel };
}

// ICS helper: minimal valid VEVENT that GCal / Apple Calendar / Outlook all
// accept. UTC timestamps (Z suffix). Defaults to a 1-hour event.
function generateICS(title: string, startISO: string, durationHours = 1): string {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationHours * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//inkstash//livestream//EN',
    'BEGIN:VEVENT',
    `UID:livestream-${start.getTime()}@inkstash`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// SVG icons match the Whatnot screenshot — outline weight matches RightRail
const ShareIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
    aria-hidden
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
    aria-hidden
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M3 11h18" />
  </svg>
);

export default function PreShowState({ livestream }: Props) {
  const { dayLabel, timeLabel } = livestream.scheduledFor
    ? formatShowStart(livestream.scheduledFor)
    : { dayLabel: 'Soon', timeLabel: '' };

  // Lightweight inline toast — auto-clears after ~2s. Not the same as the
  // AuctionBlock flash pattern (that's coupled to charge state); this is just
  // copy that fades in/out near the composer.
  const [toast, setToast] = useState<string | null>(null);
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  async function handleShare() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const data = { title: livestream.title, text: `Catch ${livestream.title} on InkStash`, url: shareUrl };
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(data);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        flash('Link copied to clipboard');
        return;
      }
      flash('Share unavailable');
    } catch {
      // Share dialog dismissed or clipboard blocked — no-op.
    }
  }

  function handleAddToCalendar() {
    if (!livestream.scheduledFor) return;
    const ics = generateICS(livestream.title, livestream.scheduledFor, 1);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${livestream.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'livestream'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Added to calendar');
  }

  // Stage background: poster image if available, else solid dark stage.
  // Scrim is layered via CSS so we keep the inline style minimal.
  const stageStyle = livestream.posterUrl
    ? { backgroundImage: `url(${livestream.posterUrl})` }
    : undefined;

  // No bidding pre-show → hide Wallet + Like. Items/Buy stay visible so
  // viewers can browse the shop rail behavior surface while waiting.
  const preShowPills = ['more', 'share', 'items', 'buy'] as const;

  return (
    <div className="ls-app">
      <main className="ls-main">
        <div className="ls-stream-grid">
          <ShopRail />

          <div className="ls-video-col ls-stream-card">
            <div className="ls-video-stage">
              <div className="ls-video-feed ls-preshow-stage" style={stageStyle}>
                {/* Same top chrome as live state. ViewerCountBadge shows 0 —
                    early arrivals before the show starts. */}
                <div className="ls-vf-top">
                  <HostPill
                    username={livestream.host.username}
                    gradient={avatarGrad(livestream.host.username)}
                    verified
                  />
                  <div className="ls-vf-top-right">
                    <ViewerCountBadge count={0} />
                  </div>
                </div>

                <RightRail
                  likes={0}
                  liked={false}
                  ringTaps={0}
                  ringTapsTarget={10}
                  celebrateKey={0}
                  onLike={() => { /* no-op pre-show */ }}
                  onShare={handleShare}
                  visiblePills={preShowPills}
                />

                {/* Center banner */}
                <div className="ls-preshow-center">
                  <div className="ls-preshow-banner">
                    <div className="ls-preshow-caption">Show Starts</div>
                    <div className="ls-preshow-time">
                      {dayLabel}{timeLabel ? `, ${timeLabel}` : ''}
                    </div>
                    <button
                      type="button"
                      className="ls-preshow-cta ls-preshow-cta--primary"
                      onClick={handleShare}
                    >
                      <ShareIcon />
                      <span>Share Show</span>
                    </button>
                    <button
                      type="button"
                      className="ls-preshow-cta ls-preshow-cta--secondary"
                      onClick={handleAddToCalendar}
                      disabled={!livestream.scheduledFor}
                    >
                      <CalendarIcon />
                      <span>Add to Calendar</span>
                    </button>
                  </div>
                </div>

                {/* Bottom: read-only composer pill + transient toast */}
                <div className="ls-vf-overlay-bottom">
                  {toast && <div className="ls-preshow-toast">{toast}</div>}
                  <div
                    className="ls-preshow-composer"
                    role="note"
                    aria-label="Chat is disabled until the show starts"
                  >
                    Chat opens when the show starts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop / 2-col placeholder column — keeps grid alignment without
              rendering the chat panel (which would call into useLivestreamChat). */}
          <div className="ls-chat-col ls-preshow-chat-placeholder">
            <div className="ls-preshow-chat-empty">
              <div className="ls-preshow-chat-empty-title">Chat starts when the show begins</div>
              <div className="ls-preshow-chat-empty-sub">
                Be the first to say something once {livestream.host.displayName} goes live.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
