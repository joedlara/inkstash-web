// GiveawayPill — top-right giveaway count pill. Ported 1:1 from .vf-giveaway
// in stream-view.jsx. Lives in the top-right cluster alongside ViewerCountBadge.
import { mockGiveaway } from '../_mock/streamData.mock';

const Gift = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="16"
    height="16"
  >
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    <path d="M12 8C12 8 11 3 8 3a2 2 0 0 0 0 4z" />
    <path d="M12 8s1-5 4-5a2 2 0 0 1 0 4z" />
  </svg>
);

export function GiveawayPill() {
  return (
    <div className="ls-vf-giveaway">
      <span className="ls-gift">
        <Gift />
      </span>
      <div>
        <b>Giveaway</b>
        <span>{mockGiveaway.entries} entries</span>
      </div>
    </div>
  );
}
