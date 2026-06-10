// MentionAutocomplete — pop-up of @-matched usernames. ↑/↓ navigate, Enter/Tab
// pick, Esc dismiss (key handling lives in ChatComposer; this is the visual).
// Ported 1:1 from docs/design-system/live_stream/stream-view.jsx's ChatComposer
// suggestion list.
import { avatarGrad, gradStyle, usernameColor } from './usernameColor';
import type { Participant } from './useLivestreamChat';

type Props = {
  items: Participant[];
  active: number;
  onPick: (p: Participant) => void;
};

export function MentionAutocomplete({ items, active, onPick }: Props) {
  return (
    <div className="ls-cc-suggest">
      {items.map((p, i) => (
        <button
          type="button"
          key={p.username}
          className={'ls-cc-sug' + (i === active ? ' ls-active' : '')}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(p);
          }}
        >
          <span className="ls-cc-sug-av" style={{ background: gradStyle(avatarGrad(p.username)) }}>
            {p.username[0].toUpperCase()}
          </span>
          <span className="ls-cc-sug-name" style={{ color: usernameColor(p.username) }}>
            {p.username}
          </span>
        </button>
      ))}
    </div>
  );
}
