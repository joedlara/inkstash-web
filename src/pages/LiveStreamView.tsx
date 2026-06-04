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
import AppShell from '../components/layout/AppShell';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import HostPill from '../components/livestreams/HostPill';
import ViewerCountBadge from '../components/livestreams/ViewerCountBadge';
import RightRailActions from '../components/livestreams/RightRailActions';
import StreamShopRail from '../components/livestreams/StreamShopRail';
import StreamChatRail from '../components/livestreams/StreamChatRail';
import GiveawayBanner from '../components/livestreams/GiveawayBanner';
import { livestreamsAPI, type Livestream, type ChatMessage } from '../api/livestreams';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { useFullBleedBlackBackground } from '../components/livestreams/useFullBleedBlackBackground';
import { supabase } from '../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii } from '../theme/inkstashTokens';

// Collapse the global sidebar by default on the live page so the immersive
// stream surface gets the maximum horizontal real estate while keeping the
// top nav (cart / bell / rubies / logo) visible. We write the localStorage
// key AppShell reads on mount so the collapse is in place before AppShell
// renders.
function useCollapseSidebarForLive() {
  useEffect(() => {
    const KEY = 'inkstash.sidebar.collapsed';
    const prev = localStorage.getItem(KEY);
    if (prev !== 'true') localStorage.setItem(KEY, 'true');
    return () => {
      // Restore the user's previous preference on unmount so other pages
      // don't suddenly find their sidebar collapsed without consent.
      if (prev === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, prev);
    };
  }, []);
}

export default function LiveStreamView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useCollapseSidebarForLive();

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

  // ─── Mobile: full-bleed overlay layout (unchanged) ────────────────────────
  if (isMobile) {
    return (
      <MobileLiveSurface
        stream={stream}
        joinData={joinData}
        viewerCount={viewerCount}
        onParticipantCountChange={handleParticipantCount}
        onClose={() => navigate('/live')}
      />
    );
  }

  // ─── Tablet/Desktop: AppShell wraps the layout so top nav + collapsed
  // sidebar stay visible. The shop/video/chat occupy the main content area
  // edge-to-edge.
  return (
    <AppShell>
      <LiveDesktopStage
        stream={stream}
        joinData={joinData}
        viewerCount={viewerCount}
        onParticipantCountChange={handleParticipantCount}
      />
    </AppShell>
  );
}

// ─── Tablet/Desktop stage ───────────────────────────────────────────────────
function LiveDesktopStage({
  stream, joinData, viewerCount, onParticipantCountChange,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
}) {
  // Negative margins escape the AppShell main padding so the live surface
  // can run flush to the edges of the content area for the immersive feel
  // while AppShell handles the top nav + collapsed sidebar above/beside.
  return (
    <Box
      sx={{
        // Cancel out AppShell's main padding so we stretch the live grid
        // edge-to-edge inside the content area, then add our own
        // breathing-room padding inside.
        mx: { md: -3 },
        mt: { md: -3 },
        mb: { md: -3 },
        height: 'calc(100dvh - 64px)', // 64 = topnav height
        bgcolor: inkstashColors.bg,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '0 1fr 0',
          md: '300px 1fr 340px',
          lg: '340px 1fr 380px',
        },
        gap: { md: 2 },
        p: { md: 2 },
        overflow: 'hidden',
      }}
    >
      {/* Left: Shop */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, overflow: 'hidden', borderRadius: inkstashRadii.lg }}>
        <StreamShopRail hostUserId={stream.host_user_id} streamTitle={stream.title} />
      </Box>

      {/* Center: Video card, vertically centered with breathing room */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: 'min(calc(100dvh - 96px), 880px)',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            bgcolor: '#0A0A0A',
            borderRadius: inkstashRadii.lg,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <LiveStreamVideo
            wsUrl={joinData.wsUrl}
            token={joinData.token}
            mode="viewer"
            onParticipantCountChange={onParticipantCountChange}
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

          {/* Floating right-rail actions (Share / Wallet / Shop / More)
              on top of the video card on desktop too. RightRailActions is
              internally absolutely positioned, so dropping it here anchors
              it to the card's right edge. */}
          <RightRailActions
            streamTitle={stream.title}
            streamUrl={typeof window !== 'undefined' ? window.location.href : ''}
          />

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

          {/* L2 auction-strip stub. Crimson to match brand. */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              borderRadius: inkstashRadii.md,
              bgcolor: inkstashColors.brand,
              color: '#fff',
              py: 1.25,
              textAlign: 'center',
              fontFamily: inkstashFonts.ui,
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

      {/* Right column: giveaway banner (own card) stacked above the chat rail */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
        }}
      >
        <Box sx={{ borderRadius: inkstashRadii.lg, flexShrink: 0 }}>
          <GiveawayBanner entryCount={0} />
        </Box>
        <Box sx={{ overflow: 'hidden', borderRadius: inkstashRadii.lg, flex: 1, minHeight: 0 }}>
          <StreamChatRail
            livestreamId={stream.id}
            initialMessages={joinData.chat}
            isBanned={joinData.isBanned}
          />
        </Box>
      </Box>
    </Box>
  );
}

// ─── Mobile (unchanged) ─────────────────────────────────────────────────────
function MobileLiveSurface({
  stream, joinData, viewerCount, onParticipantCountChange, onClose,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
  onClose: () => void;
}) {
  // Mobile keeps its own full-bleed black treatment.
  useFullBleedBlackBackground();
  useSuppressMobileNav();
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
        onParticipantCountChange={onParticipantCountChange}
        onClose={onClose}
      />
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
