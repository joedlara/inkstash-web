// HostPill — top-left avatar + @username + verified check + Follow.
// Ported 1:1 from the .vf-host block of docs/design-system/live_stream/stream-view.jsx.
// Follow click is a no-op in Phase 2.
import { gradStyle, type AvatarGradient } from '../chat/usernameColor';

const Verified = () => (
  <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
    <path
      d="M12 1.6l2.4 1.75 2.95-.02 .9 2.8 2.4 1.72-.93 2.8.93 2.8-2.4 1.72-.9 2.8-2.95-.02L12 22.4l-2.4-1.75-2.95.02-.9-2.8-2.4-1.72.93-2.8-.93-2.8 2.4-1.72.9-2.8 2.95.02z"
      fill="#2A85FF"
    />
    <path
      d="M8.5 12.2l2.3 2.3 4.7-4.7"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Props = {
  username: string;
  gradient: AvatarGradient;
  verified: boolean;
};

export function HostPill({ username, gradient, verified }: Props) {
  return (
    <div className="ls-vf-host" style={{ opacity: 1 }}>
      <span className="ls-vf-host-avatar" style={{ background: gradStyle(gradient) }}>
        {username[0].toUpperCase()}
      </span>
      <div>
        <div className="ls-vf-host-name">
          @{username}
          {verified && (
            <span className="ls-vf-verified" title="Certified vendor">
              <Verified />
            </span>
          )}
        </div>
      </div>
      <button type="button" className="ls-vf-follow">
        Follow
      </button>
    </div>
  );
}
