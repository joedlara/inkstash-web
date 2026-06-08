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
import CurrentItemBar from '../components/livestreams/CurrentItemBar';
import MobileAuctionCard from '../components/livestreams/MobileAuctionCard';
import StreamDescriptionPill from '../components/livestreams/StreamDescriptionPill';
import { livestreamsAPI, type Livestream, type ChatMessage } from '../api/livestreams';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { useFullBleedBlackBackground } from '../components/livestreams/useFullBleedBlackBackground';
import { supabase } from '../api/supabase/supabaseClient';
import { inkstashColors, inkstashRadii , inkstashFonts} from '../theme/inkstashTokens';

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
  // Use the full-bleed mobile surface for anything under md (900px).
  // The 600-899px band tried to fit the desktop 3-panel grid into a
  // viewport too narrow for it, leaving a blank stage. The shop/chat
  // rails were already hidden in that band anyway — only the video
  // column rendered, and the grid math left it empty.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useCollapseSidebarForLive();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Livestream | null>(null);
  const [joinData, setJoinData] = useState<{ token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  // Esc exits fullscreen. Body scroll locked while in fullscreen so the
  // bottom-overlay chat doesn't fight the rest of the page.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

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

  // Fullscreen: video card peels out of the grid and goes fixed inset:0.
  // No AppShell wrapper (sidebar + topnav are off-screen). Esc to exit.
  if (fullscreen) {
    return (
      <FullscreenVideoSurface
        stream={stream}
        joinData={joinData}
        viewerCount={viewerCount}
        onParticipantCountChange={handleParticipantCount}
        onExit={() => setFullscreen(false)}
      />
    );
  }

  // ─── Tablet/Desktop: AppShell wraps the layout so top nav + collapsed
  // sidebar stay visible. The shop/video/chat occupy the main content area
  // edge-to-edge. We tried adding ExploreMoreRail below the stage twice;
  // both times the sticky-stage + scroll-rail pattern produced bad
  // overlap because the stage's positioning context (AppShell main with
  // max-width + padding) isn't the scroll context (window). The rail
  // ended up sliding over the still-rendered stage on scroll. Discovery
  // lives on /live; the /live/:id surface stays focused on the stream.
  return (
    <AppShell>
      <LiveDesktopStage
        stream={stream}
        joinData={joinData}
        viewerCount={viewerCount}
        onParticipantCountChange={handleParticipantCount}
        onEnterFullscreen={() => setFullscreen(true)}
      />
    </AppShell>
  );
}

// ─── Tablet/Desktop stage ───────────────────────────────────────────────────
function LiveDesktopStage({
  stream, joinData, viewerCount, onParticipantCountChange, onEnterFullscreen,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
  onEnterFullscreen: () => void;
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
      {/* Left: Shop — pulls the host's marketplace listings, not the
          stream queue. Buyer tiles open a Buy modal or add to cart in-
          stream so the viewer never navigates away. */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, overflow: 'hidden', borderRadius: inkstashRadii.lg }}>
        <StreamShopRail
          livestreamId={stream.id}
          hostUserId={stream.host_user_id}
          streamTitle={stream.title}
        />
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

          {/* Click-to-fullscreen hit layer. Sits ABOVE the video stage but
              BELOW the interactive overlays (z-index 4 < HostPill/right rail's
              own z-indexes). pointerEvents on overlay wrappers stay 'auto'
              so they remain clickable. */}
          <Box
            onClick={onEnterFullscreen}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              cursor: 'zoom-in',
              background: 'transparent',
            }}
            aria-label="Enter fullscreen"
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
            <Box sx={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
              <HostPill
                username={stream.host?.username ?? null}
                avatarUrl={stream.host?.avatar_url}
                hostUserId={stream.host_user_id}
              />
              <StreamDescriptionPill description={stream.description} />
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

          {/* Bottom item info bar — design's .vf-item. Sits on a vertical
              gradient scrim so the white text reads regardless of what's
              on screen behind it. Rendered above the click-to-fullscreen
              hit layer (zIndex 5 > 1). */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5,
              pointerEvents: 'none',
              background:
                'linear-gradient(0deg, rgba(8,7,10,0.94) 0%, rgba(8,7,10,0.55) 55%, transparent 100%)',
              paddingTop: 4,
            }}
          >
            <Box sx={{ pointerEvents: 'auto' }}>
              <CurrentItemBar livestreamId={stream.id} />
            </Box>
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

// ─── Fullscreen surface (desktop click-to-zoom) ─────────────────────────────
// No AppShell wrapper — sidebar + topnav are off-screen by design. Video
// fixed inset:0. Same overlay set as mobile (HostPill, ViewerCountBadge,
// RightRailActions) plus the read-only chat overlay docked at the bottom.
// Click the video again to exit; Esc handled by parent.
function FullscreenVideoSurface({
  stream, joinData, viewerCount, onParticipantCountChange, onExit,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
  onExit: () => void;
}) {
  // Track the auction card's height so we can push the chat composer
  // above it. Card is rendered absolute at the bottom; without this
  // the composer would overlap and the input becomes untappable.
  const [auctionHeight, setAuctionHeight] = useState(0);
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        bgcolor: '#000',
        overflow: 'hidden',
        touchAction: 'manipulation',
      }}
    >
      <LiveStreamVideo
        wsUrl={joinData.wsUrl}
        token={joinData.token}
        mode="viewer"
        onParticipantCountChange={onParticipantCountChange}
      />

      {/* Click-to-exit hit layer, under the interactive overlays */}
      <Box
        onClick={onExit}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          cursor: 'zoom-out',
          background: 'transparent',
        }}
        aria-label="Exit fullscreen"
      />

      {/* Top row: host pill (left) + viewer count + close (right) */}
      <Box
        sx={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 14px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 14px)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        <Box sx={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <HostPill
            username={stream.host?.username ?? null}
            avatarUrl={stream.host?.avatar_url}
            hostUserId={stream.host_user_id}
          />
          <StreamDescriptionPill description={stream.description} />
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
          <ViewerCountBadge count={viewerCount} />
          <IconButton
            onClick={onExit}
            size="small"
            sx={{
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              width: 32,
              height: 32,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
            aria-label="Exit fullscreen"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Right rail (Share / Items / Buy) — same component as mobile */}
      <RightRailActions
        streamTitle={stream.title}
        streamUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />

      {/* Bottom chat overlay — read-only, fade-mask at top. bottomReserve
          lifts the composer above the auction card below. +10px matches
          the auction card's bottom offset so the spacing reads even. */}
      <LiveStreamChat
        livestreamId={stream.id}
        initialMessages={joinData.chat}
        isBanned={joinData.isBanned}
        bottomReserve={auctionHeight > 0 ? auctionHeight + 10 : 0}
      />

      {/* Auction info card pinned to the bottom, below the chat composer.
          Collapsible — viewers who only want to watch + chat can hide it.
          Renders null when no item is on the block. */}
      <Box
        sx={{
          position: 'absolute',
          left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          zIndex: 6,
        }}
      >
        <MobileAuctionCard
          livestreamId={stream.id}
          onHeightChange={setAuctionHeight}
        />
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
  useLockBodyScroll();
  // Mobile browsers (Chrome especially) overlay a bottom URL/nav bar
  // that eats viewport space. Track the visual viewport so the chat
  // composer + auction card can sit above that bar instead of behind
  // it. Falls back to 0 on browsers without visualViewport (no-op).
  const visualBottomOffset = useVisualViewportBottomOffset();
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        // 100dvh = dynamic viewport (shrinks when bottom nav appears).
        // Falls back to 100vh on the rare browser without dvh.
        height: '100dvh',
        bgcolor: '#000',
        overflow: 'hidden',
        touchAction: 'manipulation',
        overscrollBehavior: 'contain',
      }}
    >
      <MobileVideoStage
        stream={stream}
        joinData={joinData}
        viewerCount={viewerCount}
        onParticipantCountChange={onParticipantCountChange}
        onClose={onClose}
        bottomBarOffset={visualBottomOffset}
      />
    </Box>
  );
}

// Locks document.body scroll while the viewer surface is mounted so
// Safari's rubber-band scroll can't expose a white band underneath
// the fixed full-bleed stage.
function useLockBodyScroll() {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = '';
    };
  }, []);
}

// Returns the px offset from the bottom of the layout viewport to the
// bottom of the *visible* area. Non-zero when the browser overlays a
// bottom nav bar (Chrome mobile) or when the on-screen keyboard is up.
// Falls back to 0 on browsers without visualViewport.
function useVisualViewportBottomOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = (typeof window !== 'undefined' ? window.visualViewport : null);
    if (!vv) return;
    const update = () => {
      // Layout viewport height vs visual viewport bottom edge.
      // window.innerHeight is the layout viewport; vv.height +
      // vv.offsetTop gives us the bottom of the visible area.
      const layoutH = window.innerHeight;
      const visibleBottom = vv.height + vv.offsetTop;
      setOffset(Math.max(0, layoutH - visibleBottom));
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return offset;
}

// ─── Mobile video stage (full-bleed overlay) ────────────────────────────────
function MobileVideoStage({
  stream, joinData, viewerCount, onParticipantCountChange, onClose, bottomBarOffset,
}: {
  stream: Livestream;
  joinData: { token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean };
  viewerCount: number;
  onParticipantCountChange: (n: number) => void;
  onClose: () => void;
  /** px the browser's bottom UI (Chrome nav bar, keyboard, etc) is
   *  overlaying the layout viewport. Used to push the chat composer
   *  + auction card above those overlays so they remain tappable. */
  bottomBarOffset: number;
}) {
  // Track the auction card height so the chat composer can sit above
  // it instead of being covered (the input was untappable pre-fix).
  const [auctionHeight, setAuctionHeight] = useState(0);
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
        <Box sx={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
          <HostPill
            username={stream.host?.username ?? null}
            avatarUrl={stream.host?.avatar_url}
            hostUserId={stream.host_user_id}
          />
          <StreamDescriptionPill description={stream.description} />
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
        // Reserve = auction-card height (when shown) + the browser's
        // bottom UI overlay (Chrome mobile nav bar / iOS keyboard).
        // Without bottomBarOffset the composer sits behind Chrome's
        // bottom URL bar and becomes untappable.
        bottomReserve={(auctionHeight > 0 ? auctionHeight + 10 : 0) + bottomBarOffset}
      />

      {/* Auction info card pinned to the bottom, below the chat composer.
          Collapsible — viewers who only want to watch + chat can hide it.
          Renders null when no item is on the block. */}
      <Box
        sx={{
          position: 'absolute',
          left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
          bottom: `calc(env(safe-area-inset-bottom, 0px) + 10px + ${bottomBarOffset}px)`,
          zIndex: 6,
          transition: 'bottom 180ms ease-out',
        }}
      >
        <MobileAuctionCard
          livestreamId={stream.id}
          onHeightChange={setAuctionHeight}
        />
      </Box>
    </Box>
  );
}
