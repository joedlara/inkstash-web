// src/pages/LiveStreamView.tsx
//
// /live/:id — viewer surface.
//
// Mobile (< sm):     Full-bleed video, overlays + chat docked bottom.
// Tablet+ (sm+):     Immersive edge-to-edge three-region layout. No
//                    AppShell, no global sidebar — the stream is a focused
//                    surface that fills the entire viewport.
//                    Shop column | video column | chat column.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';
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

  useSuppressMobileNav();
  useFullBleedBlackBackground(); // tint html/body black for true edge-to-edge

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
      <Box sx={{ p: 4, textAlign: 'center', color: '#fff' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!stream || !joinData) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  // ─── Mobile: full-bleed overlay layout ────────────────────────────────────
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
        <MobileVideoStage
          stream={stream}
          joinData={joinData}
          viewerCount={viewerCount}
          onParticipantCountChange={handleParticipantCount}
          onClose={() => navigate('/live')}
        />
      </Box>
    );
  }

  // ─── Tablet/Desktop: immersive three-column edge-to-edge ─────────────────
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: '#000',
        display: 'grid',
        gridTemplateColumns: {
          sm: '0 1fr 0',          // tablet: shop+chat collapse, video gets it all
          md: '280px 1fr 320px',  // small desktop
          lg: '320px 1fr 360px',  // full desktop
        },
        overflow: 'hidden',
      }}
    >
      {/* Left: Shop */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, overflow: 'hidden' }}>
        <StreamShopRail hostUserId={stream.host_user_id} streamTitle={stream.title} />
      </Box>

      {/* Center: Video card, vertically centered with breathing room */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#000',
          p: { xs: 0, md: 2 },
          position: 'relative',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            // Phone aspect ratio (9:16). Constrain height so it fits the
            // viewport with margin; width follows from aspect.
            height: 'min(94vh, 880px)',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            bgcolor: '#0A0A0A',
            borderRadius: inkstashRadii.lg,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
        >
          <LiveStreamVideo
            wsUrl={joinData.wsUrl}
            token={joinData.token}
            mode="viewer"
            onParticipantCountChange={handleParticipantCount}
          />

          {/* Top header row inside the video card */}
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
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
            </Box>
          </Box>

          {/* Winner banner slot (L4) */}
          <Box
            id="livestream-winner-slot"
            sx={{
              position: 'absolute',
              bottom: 200,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* L2 auction strip — stub for now: "Awaiting next item" placeholder
              pinned to the bottom of the video card */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              borderRadius: inkstashRadii.md,
              bgcolor: inkstashColors.gold,
              color: '#16110E',
              py: 1.25,
              textAlign: 'center',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: '-0.005em',
              zIndex: 2,
            }}
          >
            Awaiting next item
          </Box>
        </Box>
      </Box>

      {/* Right: Chat */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, overflow: 'hidden' }}>
        <StreamChatRail
          livestreamId={stream.id}
          initialMessages={joinData.chat}
          isBanned={joinData.isBanned}
        />
      </Box>

      {/* Floating close button (top-right of entire viewport on tablet/desktop) */}
      <IconButton
        onClick={() => navigate('/live')}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          color: '#fff',
          bgcolor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          width: 36,
          height: 36,
          zIndex: 10,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
        }}
      >
        <Close />
      </IconButton>
    </Box>
  );
}

// ─── Mobile video stage (full-bleed overlay) ────────────────────────────────
function MobileVideoStage({
  stream, joinData, viewerCount, onParticipantCountChange, onClose,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <LiveStreamVideo
        wsUrl={joinData.wsUrl}
        token={joinData.token}
        mode="viewer"
        onParticipantCountChange={onParticipantCountChange}
      />

      <Box
        sx={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
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
          <IconButton
            onClick={onClose}
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
        </Box>
      </Box>

      <RightRailActions
        streamTitle={stream.title}
        streamUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      <LiveStreamChat
        livestreamId={stream.id}
        initialMessages={joinData.chat}
        isBanned={joinData.isBanned}
      />
    </Box>
  );
}
