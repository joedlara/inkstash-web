// ProfileCard — mini profile sheet opened by HostPill click or any
// chat-username click. Phase 3d wires it to real `public.users` rows and
// the `follows` table.
//
// Visual structure remains 1:1 with docs/design-system/live_stream/
// stream-view.jsx (the prototype's `.uprofile-card`). Note: the
// prototype's classes are `.profile-scrim` / `.uprofile-card`; the
// prefixed CSS exposes `.ls-uprofile-card` to match.
import { useCallback, useEffect, useState } from 'react';
import { gradStyle, avatarGrad, usernameColor } from './usernameColor';
import { supabase } from '../../../api/supabase/supabaseClient';
import { followUser, isFollowing, unfollowUser } from '../../../api/users/profile';
import { useAuth } from '../../../hooks/useAuth';

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
  /** Target user id. When null the card is hidden. */
  userId: string | null;
  onClose: () => void;
};

type UserRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export function ProfileCard({ userId, onClose }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;

  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Fetch the target user + follow state whenever a new card opens.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setFollowing(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, username, avatar_url')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) console.error('[ProfileCard] user fetch failed', error);
        setProfile((data as UserRow | null) ?? null);

        if (viewerId && viewerId !== userId) {
          try {
            const yes = await isFollowing(viewerId, userId);
            if (!cancelled) setFollowing(yes);
          } catch {
            if (!cancelled) setFollowing(false);
          }
        } else {
          if (!cancelled) setFollowing(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, viewerId]);

  // Esc dismiss.
  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userId, onClose]);

  const toggleFollow = useCallback(async () => {
    if (!viewerId || !userId || viewerId === userId || busy) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);  // optimistic
    setBusy(true);
    try {
      if (wasFollowing) {
        await unfollowUser(viewerId, userId);
      } else {
        await followUser(viewerId, userId);
      }
    } catch (err) {
      console.error('[ProfileCard] follow toggle failed', err);
      setFollowing(wasFollowing);  // revert
    } finally {
      setBusy(false);
    }
  }, [busy, following, userId, viewerId]);

  if (!userId) return null;

  // Use the fetched username when we have it, else fall back to a short
  // user-id stub so the card doesn't render blank during the fetch.
  const displayName = profile?.username ?? (loading ? '...' : 'Unknown');
  const initial = (profile?.username ?? '?')[0]?.toUpperCase() ?? '?';
  // Self-view: hide Follow button (matches HostPill's rule).
  const showFollow = !!viewerId && viewerId !== userId;

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
          style={{ background: gradStyle(avatarGrad(displayName)) }}
        >
          {initial}
        </span>
        <div className="ls-profile-name" style={{ color: usernameColor(displayName) }}>
          {displayName}
        </div>
        <div className="ls-profile-actions">
          {showFollow && (
            <button
              type="button"
              className={'ls-profile-follow' + (following ? ' ls-following' : '')}
              onClick={toggleFollow}
              disabled={busy}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          <button type="button" className="ls-profile-view">
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}
