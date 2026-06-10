// HostPill — top-left avatar + @username + verified check + Follow.
// Ported 1:1 from the .vf-host block of docs/design-system/live_stream/stream-view.jsx.
// Phase 3d wires up two affordances:
//   - clicking the avatar/username region opens the ProfileCard sheet
//     (via `onClick` prop, owned upstream)
//   - the inline Follow button is a quick-action shortcut that calls
//     followUser directly — purely visual mass in the prototype, but
//     it would be a UX regression to drop it entirely now that
//     ProfileCard has its own Follow button. Optimistic flip; revert on
//     error. Disabled when no viewer is signed in or the host is
//     the viewer (self-follow makes no sense).
import { useCallback, useEffect, useState } from 'react';
import { gradStyle, type AvatarGradient } from '../chat/usernameColor';
import { followUser, isFollowing, unfollowUser } from '../../../api/users/profile';

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
  /** Host's user_id — needed for the follow API. When omitted (or empty
   *  string for the not-found fallback), the inline Follow button is
   *  rendered but inert. */
  hostId?: string;
  /** Current viewer id (from useAuth). When this matches `hostId` we
   *  hide the Follow button — no self-follow. When null, the button
   *  still renders but clicking is a no-op until the viewer signs in. */
  viewerId?: string | null;
  /** Click on the avatar+username region opens the ProfileCard. The
   *  inline Follow button stops propagation so it doesn't double-fire. */
  onClick?: () => void;
};

export function HostPill({ username, gradient, verified, hostId, viewerId, onClick }: Props) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hydrate follow state when both ids are known.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!viewerId || !hostId || viewerId === hostId) return;
      try {
        const yes = await isFollowing(viewerId, hostId);
        if (!cancelled) setFollowing(yes);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [viewerId, hostId]);

  const handleFollow = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewerId || !hostId || viewerId === hostId || busy) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);  // optimistic
    setBusy(true);
    try {
      if (wasFollowing) {
        await unfollowUser(viewerId, hostId);
      } else {
        await followUser(viewerId, hostId);
      }
    } catch (err) {
      console.warn('[HostPill] follow toggle failed', err);
      setFollowing(wasFollowing);  // revert
    } finally {
      setBusy(false);
    }
  }, [busy, following, hostId, viewerId]);

  // Self-view: hide Follow button entirely (matches ProfileCard's rule).
  const showFollow = !!hostId && viewerId !== hostId;

  return (
    <div className="ls-vf-host" style={{ opacity: 1 }}>
      <button
        type="button"
        className="ls-vf-host-tap"
        onClick={onClick}
        aria-label={`Open ${username}'s profile`}
        style={{
          // Make the avatar+name region a no-chrome tap target without
          // disrupting the prototype's inline flex layout.
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
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
      </button>
      {showFollow && (
        <button
          type="button"
          className={'ls-vf-follow' + (following ? ' ls-following' : '')}
          onClick={handleFollow}
          disabled={busy}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}
