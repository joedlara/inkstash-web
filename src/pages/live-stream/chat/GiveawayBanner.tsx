// GiveawayBanner — stacks above ChatPanel on desktop. Ported 1:1 from
// docs/design-system/live_stream/stream-view.jsx's ChatPanel. Pure
// presentation in Phase 2 (Enter button is a no-op).
import { mockGiveaway } from '../_mock/streamData.mock';

const Gift = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    <path d="M12 8C12 8 11 3 8 3a2 2 0 0 0 0 4z" />
    <path d="M12 8s1-5 4-5a2 2 0 0 1 0 4z" />
  </svg>
);

const ChevronUp = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="18"
    height="18"
  >
    <path d="m6 15 6-6 6 6" />
  </svg>
);

export function GiveawayBanner() {
  return (
    <div className="ls-giveaway-banner ls-stream-card">
      <div className="ls-giveaway-top">
        <span className="ls-gift">
          <Gift />
        </span>
        <span className="ls-label">Giveaway with {mockGiveaway.entries} entries</span>
        <ChevronUp />
      </div>
      <div className="ls-giveaway-item">{mockGiveaway.item}</div>
      <button type="button" className="ls-btn-enter">
        Enter giveaway
      </button>
      <div className="ls-giveaway-terms">
        <a>Terms &amp; Conditions</a>
      </div>
    </div>
  );
}
