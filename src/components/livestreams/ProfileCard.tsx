// src/components/livestreams/ProfileCard.tsx
//
// Centered modal that opens when any chat username is clicked. Per
// the redesign (.uprofile-card in docs/design-system/live_stream/
// stream.css). Intentionally minimal: avatar, username in chat
// color, two side-by-side actions (Follow toggle + View profile).
// No @handle, no follower counts.
//
// Listens for the `inkstash:open-profile` custom event so any chat
// surface can trigger it without prop-drilling. The event detail
// carries the username; we fetch the user_id + avatar lazily and
// hand off "View profile" to the existing /@username route.
//
// Follow state is local for now (no follow backend yet) — the
// Following toggle persists per-session so the user gets feedback,
// and we can wire it to a real follows table in a later round
// without touching this component's shape.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Modal, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { supabase } from '../../api/supabase/supabaseClient';
import { colorForUsername } from './usernameColor';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface OpenDetail {
  username: string;
  /** Optional — if the chat surface already has it, skip the
   *  re-fetch. Mobile chat passes it; desktop rail will too once
   *  it's wired. */
  userId?: string;
  avatarUrl?: string | null;
}

interface ProfileState extends OpenDetail {
  /** Once we resolve username → user_id we hold it here so "View
   *  profile" can route to /user/:id if the route exists in this
   *  codebase, or /@username as a fallback. */
  resolvedUserId?: string | null;
}

export default function ProfileCard() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [following, setFollowing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail;
      if (!detail?.username) return;
      setProfile({ ...detail, resolvedUserId: detail.userId ?? undefined });
      setFollowing(false);
    };
    window.addEventListener('inkstash:open-profile', onOpen);
    return () => window.removeEventListener('inkstash:open-profile', onOpen);
  }, []);

  // If the dispatcher didn't supply user_id (desktop chat rail), look
  // it up by username so "View profile" can route correctly.
  useEffect(() => {
    if (!profile || profile.resolvedUserId !== undefined) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, avatar_url')
        .eq('username', profile.username)
        .maybeSingle();
      if (cancelled || !data) return;
      const d = data as { id: string; avatar_url: string | null };
      setProfile((p) => p && p.username === profile.username ? {
        ...p,
        resolvedUserId: d.id,
        avatarUrl: p.avatarUrl ?? d.avatar_url,
      } : p);
    })();
    return () => { cancelled = true; };
  }, [profile]);

  if (!profile) return null;

  const color = colorForUsername(profile.username);
  const initial = profile.username[0]?.toUpperCase() ?? '?';

  function viewProfile() {
    if (!profile) return;
    // /@username works regardless of whether we resolved the id;
    // user_id route is the secondary path.
    navigate(`/@${profile.username}`);
    setProfile(null);
  }

  return (
    <Modal
      open
      onClose={() => setProfile(null)}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(8,7,10,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          },
        },
      }}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
    >
      <Box
        sx={{
          width: 'min(360px, 100%)',
          bgcolor: inkstashColors.bgElev,
          color: inkstashColors.ink,
          borderRadius: '20px',
          padding: '22px 22px 18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          outline: 'none',
          position: 'relative',
          textAlign: 'center',
        }}
      >
        <IconButton
          onClick={() => setProfile(null)}
          aria-label="Close"
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8, color: inkstashColors.muted }}
        >
          <X size={16} />
        </IconButton>

        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 999,
            mx: 'auto',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 26,
            color: '#fff',
            boxShadow: '0 6px 16px -4px rgba(0,0,0,0.3)',
            ...(profile.avatarUrl
              ? {
                  backgroundImage: `url(${profile.avatarUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { bgcolor: color }),
          }}
        >
          {profile.avatarUrl ? '' : initial}
        </Box>

        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 22,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            color,
            wordBreak: 'break-word',
            mb: 2,
          }}
        >
          {profile.username}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Box
            component="button"
            type="button"
            onClick={() => setFollowing((f) => !f)}
            sx={{
              flex: 1,
              py: 1.1,
              borderRadius: 999,
              border: 0,
              cursor: 'pointer',
              fontFamily: inkstashFonts.ui,
              fontWeight: 800,
              fontSize: 13.5,
              textTransform: 'none',
              transition: 'background-color 160ms ease, color 160ms ease',
              ...(following
                ? {
                    bgcolor: inkstashColors.bgSunken,
                    color: inkstashColors.ink,
                    border: `1px solid ${inkstashColors.border}`,
                  }
                : {
                    bgcolor: inkstashColors.brand,
                    color: '#fff',
                    '&:hover': { bgcolor: inkstashColors.brandDeep },
                  }),
            }}
          >
            {following ? 'Following' : 'Follow'}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={viewProfile}
            sx={{
              flex: 1,
              py: 1.1,
              borderRadius: 999,
              border: `1px solid ${inkstashColors.border}`,
              bgcolor: 'transparent',
              color: inkstashColors.ink,
              cursor: 'pointer',
              fontFamily: inkstashFonts.ui,
              fontWeight: 800,
              fontSize: 13.5,
              textTransform: 'none',
              transition: 'background-color 160ms ease',
              '&:hover': { bgcolor: inkstashColors.bgSunken },
            }}
          >
            View profile
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}

/**
 * Helper for chat surfaces — call from a click handler to open
 * the ProfileCard with the chatter's identity. Centralized so the
 * event name + payload shape stay in one place.
 */
export function openProfileCard(detail: OpenDetail) {
  window.dispatchEvent(new CustomEvent('inkstash:open-profile', { detail }));
}
