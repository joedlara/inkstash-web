// src/pages/LiveStreamView.tsx
//
// /live/:id — viewer surface. Three layouts based on viewport:
//
//   Mobile (< sm):     Single-column overlay. Video full-bleed background;
//                      host pill, chat, right rail all overlay the video.
//   Tablet (sm-md):    Centered black video card with breathing room. Chat
//                      overlays the video. Right rail along the video edge.
//                      Side rails (shop/chat panels) hidden.
//   Desktop (md+):     Three-column layout. Shop rail (left, light theme),
//                      centered black video card (middle), chat rail (right,
//                      light theme). All inside the standard AppShell so the
//                      global sidebar + cream app bg are preserved.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import HostPill from '../components/livestreams/HostPill';
import ViewerCountBadge from '../components/livestreams/ViewerCountBadge';
import RightRailActions from '../components/livestreams/RightRailActions';
import StreamShopRail from '../components/livestreams/StreamShopRail';
import StreamChatRail from '../components/livestreams/StreamChatRail';
import { livestreamsAPI, type Livestream, type ChatMessage } from '../api/livestreams';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { useFullBleedBlackBackground } from '../components/livestreams/useFullBleedBlackBackground';
import { supabase } from '../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii } from '../theme/inkstashTokens';

export default function LiveStreamView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // Only force black backgrounds on the pure-mobile layout (full-bleed
  // overlay). Tablet + desktop render inside AppShell with the normal cream
  // app background, so suppressing nav + tinting body is incorrect there.
  useSuppressMobileNav();
  useFullBleedBlackBackgroundIf(isMobile);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Livestream | null>(null);
  const [joinData, setJoinData] = useState<{ token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, j] = await Promise.all([
          livestreamsAPI.get(id),
          livestreamsAPI.join(id),
        ]);
        if (cancelled) return;
        if (!s) { setError('Stream not found.'); return; }
        setStream(s);
        setJoinData({
          token: j.livekit_token,
          wsUrl: j.livekit_ws_url,
          chat: j.recent_chat,
          isBanned: j.is_banned,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Auto-eject viewers when the host ends the stream.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`livestream:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'livestreams', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next.status === 'ended' || next.status === 'aborted') {
            navigate('/live', { replace: true });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, navigate]);

  const handleParticipantCount = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!stream || !joinData) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  // ─── The video "stage" card — black rounded box with all overlays inside ──
  // Used in all three layouts. Sized to phone aspect (9:16). On desktop /
  // tablet the parent gives it a max width so it doesn't stretch.
  const videoStage = (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        bgcolor: '#000',
        borderRadius: isMobile ? 0 : inkstashRadii.lg,
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 12px 32px rgba(22,17,14,0.25)',
      }}
    >
      <LiveStreamVideo
        wsUrl={joinData.wsUrl}
        token={joinData.token}
        mode="viewer"
        onParticipantCountChange={handleParticipantCount}
      />

      {/* Top header row */}
      <Box
        sx={{
          position: 'absolute',
          top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 10px)' : 10,
          left: isMobile ? 'calc(env(safe-area-inset-left, 0px) + 10px)' : 10,
          right: isMobile ? 'calc(env(safe-area-inset-right, 0px) + 10px)' : 10,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ pointerEvents: 'auto' }}>
          <HostPill
            username={stream.host?.username ?? null}
            avatarUrl={stream.host?.avatar_url}
          />
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
          <ViewerCountBadge count={viewerCount} />
          {isMobile && (
            <IconButton
              onClick={() => navigate('/live')}
              size="small"
              sx={{
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Right-rail action stack (Share / Wallet / Shop / More).
          Shown on mobile + tablet (anywhere the side panels aren't
          rendered). Desktop replaces these with the dedicated rails. */}
      {!isDesktop && (
        <RightRailActions
          streamTitle={stream.title}
          streamUrl={typeof window !== 'undefined' ? window.location.href : ''}
        />
      )}

      {/* Winner banner slot (L4) */}
      <Box
        id="livestream-winner-slot"
        sx={{
          position: 'absolute',
          bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 280px)' : 280,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Chat overlay — mobile + tablet only. Desktop moves chat to the
          right rail. */}
      {!isDesktop && (
        <LiveStreamChat
          livestreamId={stream.id}
          initialMessages={joinData.chat}
          isBanned={joinData.isBanned}
        />
      )}
    </Box>
  );

  // ─── Layout branch ────────────────────────────────────────────────────────
  // Mobile: keep the previous full-bleed overlay treatment.
  if (isMobile) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: ['100vh', '100lvh'],
          bgcolor: '#000',
          overflow: 'hidden',
          touchAction: 'manipulation',
        }}
      >
        {videoStage}
      </Box>
    );
  }

  // Tablet + desktop: render inside AppShell so the global sidebar + cream
  // app background stay visible. Stream is a centered card layout.
  return (
    <AppShell>
      <Box
        sx={{
          p: { xs: 1.5, md: 3 },
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {isDesktop ? (
          // Desktop: three-column layout with light-themed rails flanking
          // the black video card.
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '260px 380px 320px',
              gap: 2,
              alignItems: 'stretch',
              // Phone-aspect height for the video; rails match it.
              height: 'min(82vh, 720px)',
            }}
          >
            <StreamShopRail hostUserId={stream.host_user_id} />
            {videoStage}
            <StreamChatRail
              livestreamId={stream.id}
              initialMessages={joinData.chat}
              isBanned={joinData.isBanned}
            />
          </Box>
        ) : (
          // Tablet: rails hidden. Centered video card at phone aspect with
          // overlays + right-rail action buttons floating on the card edge.
          <Box
            sx={{
              width: 'min(420px, 90vw)',
              height: 'min(82vh, 760px)',
            }}
          >
            {videoStage}
          </Box>
        )}
      </Box>
    </AppShell>
  );
}

/**
 * Conditionally apply the full-bleed black html/body treatment. The hook
 * itself unconditionally registers a useEffect, so we can't call it inline
 * behind a ternary — this thin wrapper hides the rules-of-hooks gymnastics.
 */
function useFullBleedBlackBackgroundIf(active: boolean) {
  // Always call the hook to keep call order stable; the no-op branch handles
  // the "don't black out" case by short-circuiting before any mutations.
  if (active) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFullBleedBlackBackground();
  }
}
