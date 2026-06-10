// ProfileCard — mini profile sheet opened by any chat-username click. Ported
// 1:1 from docs/design-system/live_stream/stream-view.jsx. Phase 2 uses a
// dummy follow toggle; Phase 3d wires it to the real follows table.
//
// Note: the prototype's classes are .profile-scrim / .uprofile-card (not
// .profile-card). The prefixed CSS exposes .ls-uprofile-card to match.
import { gradStyle, avatarGrad, usernameColor } from './usernameColor';
import { useState, useEffect } from 'react';

const Close = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="20"
    height="20"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

type Props = {
  username: string | null;
  onClose: () => void;
};

export function ProfileCard({ username, onClose }: Props) {
  const [following, setFollowing] = useState(false);

  // Reset follow state whenever a different profile is opened.
  useEffect(() => {
    setFollowing(false);
  }, [username]);

  if (!username) return null;
  const initial = username[0].toUpperCase();
  return (
    <div className="ls-profile-scrim" onClick={onClose}>
      <div className="ls-uprofile-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ls-profile-close"
          onClick={onClose}
          aria-label="Close"
        >
          <Close />
        </button>
        <span
          className="ls-profile-av"
          style={{ background: gradStyle(avatarGrad(username)) }}
        >
          {initial}
        </span>
        <div className="ls-profile-name" style={{ color: usernameColor(username) }}>
          {username}
        </div>
        <div className="ls-profile-actions">
          <button
            type="button"
            className={'ls-profile-follow' + (following ? ' ls-following' : '')}
            onClick={() => setFollowing((f) => !f)}
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <button type="button" className="ls-profile-view">
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}
