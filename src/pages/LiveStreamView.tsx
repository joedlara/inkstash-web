// LiveStreamView — page shell. Ported 1:1 from docs/design-system/live_stream/
// stream-view.jsx. Phase 2 wires every component to the mocked data layer so
// the surface is fully interactive in isolation; Phase 3 wires real data.
//
// Responsive modes match the CSS breakpoints:
//   ≥1240px  desktop  (Shop · Video · Chat)
//   1024–1239 2-col   (Shop hidden; Video + Chat)
//   ≤1024px  immersive (Video fills; chat overlays inside the video stage)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './live-stream/stream.css';

import { useLiveAuction } from './live-stream/auction/useLiveAuction';
import { AuctionBlock } from './live-stream/auction/AuctionBlock';
import { WinnerBanner } from './live-stream/auction/WinnerBanner';

import { useLivestreamChat } from './live-stream/chat/useLivestreamChat';
import { ChatPanel } from './live-stream/chat/ChatPanel';
import { GiveawayBanner } from './live-stream/chat/GiveawayBanner';
import { ProfileCard } from './live-stream/chat/ProfileCard';

import { ShopRail } from './live-stream/shop/ShopRail';
import { VideoStage } from './live-stream/stage/VideoStage';

import { useLivestream, type Livestream } from './live-stream/useLivestream';
import PreShowState from './live-stream/PreShowState';

type ResponsiveMode = 'desktop' | 'two-col' | 'immersive';

function useResponsiveMode(): ResponsiveMode {
  const compute = (): ResponsiveMode => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.matchMedia('(max-width: 1024px)').matches) return 'immersive';
    if (window.matchMedia('(max-width: 1240px)').matches) return 'two-col';
    return 'desktop';
  };
  const [mode, setMode] = useState<ResponsiveMode>(compute);
  useEffect(() => {
    const onResize = () => setMode(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mode;
}

// Phase 2 demo knobs (the prototype exposes these as a Tweaks panel; here they
// match the prototype's defaults so visual parity is exact).
const VIEWER_ID = 'you';
const HAS_CARD = true;
const BOT_SPEED = 3;
const GLASS = false;
const LIKES_KEY = 'inkstash.stream.likes.thundervault';

// TikTok-style like meter knobs. The ring around the heart fills as taps
// arrive within RING_WINDOW_MS of each other; reaching RING_TAPS_TO_COMPLETE
// (or going idle) triggers a celebration burst. Phase 3d will sync the count
// to Supabase; the meter + celebration animation stay pure-local.
const RING_TAPS_TO_COMPLETE = 10;
const RING_WINDOW_MS = 600;

export default function LiveStreamView() {
  const { id = 'mock-stream' } = useParams();

  // Top-level livestream state. Pre-show short-circuits to a different
  // component tree (which uses a different set of hooks); Phase 2 reads
  // from a URL-param mock, Phase 3 from Supabase. Routing happens here
  // BEFORE any live-state-only hooks (useLiveAuction / useLivestreamChat)
  // are called — pre-show streams never instantiate them.
  const livestream = useLivestream(id);

  // Initial DB fetch in flight — render a quick dark frame so the live hooks
  // don't mount against the wrong id, and the pre-show banner doesn't flash
  // for streams that are actually live.
  if (livestream.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#08070A',
      }} aria-busy="true" />
    );
  }

  if (livestream.status === 'scheduled' || livestream.status === 'preparing') {
    return <PreShowState livestream={livestream} />;
  }

  if (livestream.status === 'ended') {
    // Phase 2: no dedicated ended UI yet. Show a minimal "stream ended" card
    // so the page doesn't sit blank or try to render live state for a
    // not-found / ended row. Phase 3 adds a proper recap surface.
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#08070A',
        color: '#FAF7F2',
        fontFamily: 'Geist, system-ui, sans-serif',
        padding: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>This show has ended</h1>
          <p style={{ marginTop: 12, opacity: 0.7 }}>
            {livestream.title || 'Check back later for more from this seller.'}
          </p>
        </div>
      </div>
    );
  }

  return <LiveStreamLiveView id={id} livestream={livestream} />;
}

// Live-state body. Split out so the hooks below (useLiveAuction, etc.) only
// instantiate when status === 'live' — pre-show takes a different branch.
// `livestream` is passed in (already resolved by the outer view) so the
// ShopRail can read host.id without us double-fetching the row.
function LiveStreamLiveView({ id, livestream }: { id: string; livestream: Livestream }) {
  const mode = useResponsiveMode();

  // Profile-card open state — chat clicks bubble up via onUsernameClick.
  const [profileUser, setProfileUser] = useState<string | null>(null);

  const auction = useLiveAuction({
    viewerId: VIEWER_ID,
    hasCard: HAS_CARD,
    botSpeed: BOT_SPEED,
  });

  const { messages, participants, sendMessage } = useLivestreamChat(id);

  // ─── Like state (Phase 2: local only; Phase 3d adds backend) ──────────
  // Lifted here so TapLayer's double-tap and RightRail's heart button share
  // a single source of truth (count + ring meter + celebration).
  const [likes, setLikes] = useState<number>(() => {
    if (typeof window === 'undefined') return 1240;
    const saved = Number(window.localStorage.getItem(LIKES_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 1240;
  });
  const [liked, setLiked] = useState(false);
  const [ringTaps, setRingTaps] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const ringResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LIKES_KEY, String(likes));
    }
  }, [likes]);

  useEffect(() => () => {
    if (ringResetTimer.current) clearTimeout(ringResetTimer.current);
  }, []);

  const triggerCelebration = useCallback(() => {
    setCelebrateKey((k) => k + 1);
  }, []);

  // Every tap increments the count, the ring, and re-arms the idle timer.
  // Hitting RING_TAPS_TO_COMPLETE early-triggers the celebration and resets
  // the ring. Idle for RING_WINDOW_MS also resets (no celebration).
  const onLike = useCallback(() => {
    setLikes((n) => n + 1);
    setLiked(true);
    setRingTaps((t) => {
      const next = t + 1;
      if (next >= RING_TAPS_TO_COMPLETE) {
        triggerCelebration();
        return 0;
      }
      return next;
    });
    if (ringResetTimer.current) clearTimeout(ringResetTimer.current);
    ringResetTimer.current = setTimeout(() => {
      setRingTaps(0);
      ringResetTimer.current = null;
    }, RING_WINDOW_MS);
  }, [triggerCelebration]);

  // Container class chooses the layout. The CSS handles the breakpoint-specific
  // hiding/stacking — `mode` is mostly for choosing which JSX to render.
  const isImmersive = mode === 'immersive';

  const auctionOverlay = useMemo(
    () => (
      <AuctionBlock
        auction={auction}
        viewerId={VIEWER_ID}
        hasCard={HAS_CARD}
        onNeedCard={() => {
          /* Phase 2: no wallet sheet — hasCard is locked true. */
        }}
        glass={GLASS}
      />
    ),
    [auction],
  );

  // Bottom overlay inside the video stage: winner banner + immersive chat
  // + composer + auction block. The prototype renders the immersive chat
  // surface ALWAYS — CSS (.ls-vf-chat is display:none by default, flips to
  // flex at ≤1024px) handles whether it's visible. We mirror that exactly.
  const stageBottomOverlay = (
    <>
      <WinnerBanner winner={auction.winnerBanner} onDismiss={auction.dismissWinnerBanner} />
      <ChatPanel
        messages={messages}
        participants={participants}
        variant="immersive"
        onSend={sendMessage}
        onUsernameClick={setProfileUser}
      />
      {auctionOverlay}
    </>
  );

  return (
    <div className="ls-app">
      <main className="ls-main">
        <div className="ls-stream-grid">
          <ShopRail hostUserId={livestream.host.id} />

          <VideoStage
            bottomOverlay={stageBottomOverlay}
            likes={likes}
            liked={liked}
            ringTaps={ringTaps}
            ringTapsTarget={RING_TAPS_TO_COMPLETE}
            celebrateKey={celebrateKey}
            onLike={onLike}
          />

          {/* Desktop / 2-col chat column. Hidden by CSS at ≤1024px. */}
          {!isImmersive && (
            <div className="ls-chat-col">
              <GiveawayBanner />
              <ChatPanel
                messages={messages}
                participants={participants}
                variant="panel"
                onSend={sendMessage}
                onUsernameClick={setProfileUser}
              />
            </div>
          )}
        </div>
      </main>

      <ProfileCard username={profileUser} onClose={() => setProfileUser(null)} />
    </div>
  );
}
