// src/components/livestreams/ChatProfileCard.tsx
//
// Singleton modal mounted once per live page. Listens for
// `inkstash:open-profile` and renders a centered card over a blurred
// scrim. Username clicks anywhere in either chat surface (overlay or
// rail) dispatch the event, so we don't have to thread modal state
// down through both.
//
// Spec reference: docs/design-system/claude-design/live_stream/live_stream/stream.css
// (.uprofile-card / .profile-scrim / .profile-* rules) — values are
// adapted to MUI sx + inkstashTokens.
//
// The follow toggle uses the existing src/api/users/profile.ts helpers
// (followUser / unfollowUser / isFollowing). "View profile" navigates
// to /profile/:userId. The event detail must include userId; username
// is what we color + display.

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  followUser,
  unfollowUser,
  isFollowing as fetchIsFollowing,
} from '../../api/users/profile';
import { userColor } from '../../utils/chatColors';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface OpenProfilePayload {
  userId: string;
  username: string;
  avatarUrl?: string | null;
}

// Type the global event detail so dispatchers + the listener stay
// aligned. Use the same string key as the spec so anything else in
// the app dispatching `inkstash:open-profile` continues to work.
const OPEN_EVENT = 'inkstash:open-profile';

export function openProfileCard(detail: OpenProfilePayload): void {
  window.dispatchEvent(new CustomEvent<OpenProfilePayload>(OPEN_EVENT, { detail }));
}

export default function ChatProfileCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const [target, setTarget] = useState<OpenProfilePayload | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followKnown, setFollowKnown] = useState(false);

  // Listen for open-profile events. Re-rendering the modal payload
  // resets follow state — see useEffect below.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<OpenProfilePayload>;
      const d = ce.detail;
      if (!d || !d.userId || !d.username) return;
      setTarget(d);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // When a new target arrives, fetch the current follow state.
  // Same-user (viewer === target) short-circuits — no "follow yourself"
  // affordance, so we don't query.
  useEffect(() => {
    if (!target || !viewerId) {
      setFollowing(false);
      setFollowKnown(true);
      return;
    }
    if (target.userId === viewerId) {
      setFollowing(false);
      setFollowKnown(true);
      return;
    }
    let cancelled = false;
    setFollowKnown(false);
    fetchIsFollowing(viewerId, target.userId)
      .then((is) => { if (!cancelled) { setFollowing(is); setFollowKnown(true); } })
      .catch(() => { if (!cancelled) { setFollowing(false); setFollowKnown(true); } });
    return () => { cancelled = true; };
  }, [target, viewerId]);

  // Esc dismiss — matches the scrim click affordance.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target]);

  const close = useCallback(() => setTarget(null), []);

  const onFollowClick = useCallback(async () => {
    if (!target || !viewerId || followBusy) return;
    if (target.userId === viewerId) return;
    setFollowBusy(true);
    // Optimistic — flip state; revert on error.
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followUser(viewerId, target.userId);
      else await unfollowUser(viewerId, target.userId);
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  }, [target, viewerId, following, followBusy]);

  const onViewProfile = useCallback(() => {
    if (!target) return;
    navigate(`/profile/${target.userId}`);
    close();
  }, [navigate, target, close]);

  if (!target) return null;

  const isSelf = !!viewerId && target.userId === viewerId;
  const titleColor = userColor(target.username);
  const initial = (target.username || '?').charAt(0).toUpperCase();

  return (
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={`${target.username} profile`}
      onClick={close}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        // Scrim — dark wash + blur so the card pops.
        bgcolor: 'rgba(8,7,10,0.55)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 320,
          padding: '24px 20px 18px',
          borderRadius: inkstashRadii.lg,
          background: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          boxShadow: '0 24px 60px -16px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          color: inkstashColors.ink,
        }}
      >
        <IconButton
          onClick={close}
          aria-label="Close"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: inkstashColors.muted,
            '&:hover': { color: inkstashColors.ink, bgcolor: inkstashColors.bgSunken },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        {/* Avatar — image if available, else letter on the username color */}
        <Box
          sx={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            backgroundImage: target.avatarUrl ? `url(${target.avatarUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            bgcolor: titleColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          {!target.avatarUrl && initial}
        </Box>

        <Typography
          component="div"
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '-0.005em',
            color: titleColor,
            textAlign: 'center',
            lineHeight: 1.1,
            // Long usernames wrap instead of overflowing.
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}
        >
          {target.username}
        </Typography>

        {/* Two side-by-side action pills */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            width: '100%',
            mt: 0.5,
          }}
        >
          {/* Follow / Following — hidden when viewing yourself */}
          {!isSelf && (
            <Button
              onClick={onFollowClick}
              disabled={followBusy || !followKnown}
              variant={following ? 'outlined' : 'contained'}
              sx={{
                flex: 1,
                borderRadius: 999,
                py: 1,
                fontFamily: inkstashFonts.ui,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: 13.5,
                ...(following
                  ? {
                      color: inkstashColors.ink,
                      borderColor: inkstashColors.border,
                      bgcolor: inkstashColors.bgElev,
                      '&:hover': { bgcolor: inkstashColors.bgSunken, borderColor: inkstashColors.borderStrong },
                    }
                  : {
                      color: '#fff',
                      bgcolor: inkstashColors.brand,
                      '&:hover': { bgcolor: inkstashColors.brandDeep },
                    }),
              }}
            >
              {followBusy
                ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                : following ? 'Following' : 'Follow'}
            </Button>
          )}
          <Button
            onClick={onViewProfile}
            variant="outlined"
            sx={{
              flex: 1,
              borderRadius: 999,
              py: 1,
              fontFamily: inkstashFonts.ui,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: 13.5,
              color: inkstashColors.ink,
              borderColor: inkstashColors.border,
              bgcolor: inkstashColors.bgElev,
              '&:hover': { bgcolor: inkstashColors.bgSunken, borderColor: inkstashColors.borderStrong },
            }}
          >
            View profile
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
