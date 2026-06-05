// src/components/livestreams/HostPill.tsx
//
// Top-left of the video card / fullscreen surface. Per the design spec at
// docs/design-system/claude-design/live_stream/stream.css :: .vf-host,
// the pill is a single horizontal glass capsule:
//
//   [gradient initial avatar] [ name + verified check     ] [Follow]
//                             [ rating row (4.9 + star)   ]
//
// The avatar gets a brand gradient (no external image fetch) so the pill
// always renders, including when there's no avatar_url. The verified blue
// check and the rating row are optional — they only render when the
// corresponding props are set.

import { useEffect, useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HostAvatar from './HostAvatar';
import { useAuth } from '../../hooks/useAuth';
import { followUser, isFollowing, unfollowUser } from '../../api/users/profile';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  username: string | null;
  /** Reserved — currently unused because the design uses the initial-only
   *  gradient avatar. Kept so existing call sites don't break. */
  avatarUrl?: string | null;
  /** Show the blue verified check next to the username. */
  verified?: boolean;
  /** Show the rating row (e.g. 4.9) under the username. */
  rating?: number | null;
  /** Host's user id. Required for the Follow button to persist; without
   *  it the button hides (we never want a button that pretends to work). */
  hostUserId?: string | null;
}

function VerifiedCheck() {
  // Twitter/whatnot-style blue check. Sized to ride the username baseline.
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ width: 15, height: 15, display: 'inline-block', flexShrink: 0 }}
      aria-label="Verified"
    >
      <path
        d="M12 2 L14.5 4.5 L18 4 L18.5 7.5 L21.5 9 L20 12 L21.5 15 L18.5 16.5 L18 20 L14.5 19.5 L12 22 L9.5 19.5 L6 20 L5.5 16.5 L2.5 15 L4 12 L2.5 9 L5.5 7.5 L6 4 L9.5 4.5 Z"
        fill="#1D9BF0"
      />
      <path
        d="M8 12.5 L11 15 L16.5 9.5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Box>
  );
}

export default function HostPill({
  username, avatarUrl, verified = false, rating = null, hostUserId = null,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const viewerId = user?.id ?? null;
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const displayName = username ?? 'host';
  const showRating = rating != null && rating > 0;
  // Hide the button when there's no host id (we don't know who to follow)
  // or when the viewer is the host themselves (no self-follow per the
  // follows table's CHECK constraint).
  const canFollow = !!viewerId && !!hostUserId && viewerId !== hostUserId;

  // Hydrate the followed state on mount + when the (viewer, host) pair
  // changes. Without this the button always renders as 'Follow' on
  // page load, then jumps to 'Following' only after the viewer clicks.
  useEffect(() => {
    if (!canFollow || !viewerId || !hostUserId) {
      setFollowed(false);
      return;
    }
    let cancelled = false;
    isFollowing(viewerId, hostUserId)
      .then((f) => { if (!cancelled) setFollowed(f); })
      .catch(() => { /* leave default */ });
    return () => { cancelled = true; };
  }, [canFollow, viewerId, hostUserId]);

  async function handleToggle() {
    if (!canFollow || !viewerId || !hostUserId || busy) return;
    setBusy(true);
    // Optimistic toggle; revert on failure.
    const nextState = !followed;
    setFollowed(nextState);
    try {
      if (nextState) await followUser(viewerId, hostUserId);
      else await unfollowUser(viewerId, hostUserId);
    } catch (err) {
      console.warn('[HostPill] follow toggle failed', err);
      setFollowed(!nextState);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        // Glass: lighter blur + slightly higher tint so you can still see
        // the video moving through but @username + Follow read cleanly.
        bgcolor: 'rgba(10,10,10,0.32)',
        border: '1px solid rgba(255,255,255,0.22)',
        backdropFilter: 'blur(6px) saturate(160%)',
        WebkitBackdropFilter: 'blur(6px) saturate(160%)',
        borderRadius: 999,
        pl: '6px',
        pr: '12px',
        py: '6px',
        // Inner top highlight + drop shadow lift the pill off the video
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 18px -6px rgba(0,0,0,0.4)',
      }}
    >
      {/* Avatar links to the host's profile when we know who they are. */}
      <ButtonBase
        onClick={() => username && navigate(`/@${username}`)}
        disabled={!username}
        sx={{ borderRadius: '50%', '&:active': { transform: 'scale(0.96)' } }}
        aria-label={username ? `View ${displayName}'s profile` : undefined}
      >
        <HostAvatar
          username={username}
          avatarUrl={avatarUrl ?? null}
          size={34}
        />
      </ButtonBase>

      {/* Name + rating column. Username itself is a tap target that
       *  navigates to the host's profile page (same path used by the
       *  rest of the app: /@username). */}
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ButtonBase
          onClick={() => username && navigate(`/@${username}`)}
          disabled={!username}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.6,
            fontFamily: inkstashFonts.ui,
            fontSize: 13.5,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.1,
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            borderRadius: 0.5,
            transition: 'opacity 120ms ease',
            '&:hover': { opacity: 0.85, textDecoration: 'underline' },
          }}
        >
          <Box
            component="span"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            @{displayName}
          </Box>
          {verified && <VerifiedCheck />}
        </ButtonBase>
        {showRating && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              mt: 0.3,
              fontFamily: inkstashFonts.mono,
              fontSize: 11,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1,
            }}
          >
            <Star size={11} fill="#FFC53D" stroke="none" />
            <Box component="span">{rating.toFixed(1)}</Box>
          </Box>
        )}
      </Box>

      {/* Follow button — brand-red pill, separate from the name block.
          Hidden when there's no host id OR the viewer is the host. */}
      {canFollow && (
        <ButtonBase
          onClick={handleToggle}
          disabled={busy}
          sx={{
            ml: 0.5,
            px: 1.5,
            py: 0.7,
            borderRadius: 999,
            bgcolor: followed ? 'rgba(255,255,255,0.18)' : inkstashColors.brand,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            transition: 'background-color 160ms ease, transform 120ms ease',
            '&:hover': {
              bgcolor: followed ? 'rgba(255,255,255,0.26)' : inkstashColors.brandDeep,
            },
            '&:active': { transform: 'scale(0.97)' },
            '&.Mui-disabled': { opacity: 0.65 },
          }}
          aria-pressed={followed}
        >
          {followed ? 'Following' : 'Follow'}
        </ButtonBase>
      )}
    </Box>
  );
}
