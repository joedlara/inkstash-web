// src/components/creatorHub/panels/LiveControlPanel.tsx
//
// Live Control — the dual-device producer surface. The host's phone is
// the camera; this is the laptop control panel that joins the same
// LiveKit room as a viewer and gives the seller a queue + push-to-block
// + stream health at a glance.
//
// No active stream → empty state with a Go Live CTA that opens the
// composer (parent wires this via onGoLive).

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, CircularProgress, Snackbar, Typography, ButtonBase, useMediaQuery, useTheme } from '@mui/material';
import { ArrowUpCircle, Gift, GripVertical, Pencil, Plus, Radio, Smartphone, Square, Zap } from 'lucide-react';
import HubPanelFrame from '../HubPanelFrame';
import HBtn from '../HBtn';
import LiveStreamVideo from '../../livestreams/LiveStreamVideo';
import LiveStreamChat from '../../livestreams/LiveStreamChat';
import EndStreamConfirmModal from '../../livestreams/host/EndStreamConfirmModal';
import { livestreamsAPI, type Livestream } from '../../../api/livestreams';
import { supabase } from '../../../api/supabase/supabaseClient';
import { useAuth } from '../../../hooks/useAuth';
import { PLACEHOLDER_IMAGE_URL } from '../../../utils/placeholders';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  /** Opens the Go Live composer in Live mode. */
  onGoLive: () => void;
}

interface ActiveStream {
  stream: Livestream;
  livekit: { token: string; wsUrl: string; isHost: boolean };
}

interface QueueRow {
  id: string;
  position: number;
  status: 'queued' | 'live' | 'sold' | 'sold_pending_payment' | 'passed' | 'removed';
  // Auction state. Null on items that have never had bidding started.
  current_price_cents: number | null;
  bid_count: number;
  bidding_ends_at: string | null;
  // Charge state. Null until charge-auction-win fires; charge_error
  // carries the Stripe error code on failed off-session charges.
  payment_intent_id: string | null;
  winner_charged_at: string | null;
  charge_error: string | null;
  listing: {
    id: string;
    title: string;
    buy_now_price: number | null;
    photos: Array<{ url?: string }> | null;
  } | null;
}

export default function LiveControlPanel({ onGoLive }: Props) {
  const { user } = useAuth();
  const [active, setActive] = useState<ActiveStream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    livestreamsAPI.getMyActiveStream(user.id).then((res) => {
      if (cancelled) return;
      setActive(res);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <HubPanelFrame
      eyebrow="Stream management"
      title="Live Control"
      sub="Run the show from this laptop while your phone is the camera. Push items to the block, watch the room, moderate chat."
    >
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
        </Box>
      ) : active ? (
        <LiveSurface active={active} />
      ) : (
        <EmptyState onGoLive={onGoLive} />
      )}
    </HubPanelFrame>
  );
}

// ────────────────────────────────────────────────────────────────────
// Empty state
// ────────────────────────────────────────────────────────────────────

function EmptyState({ onGoLive }: { onGoLive: () => void }) {
  return (
    <Box sx={{
      bgcolor: inkstashColors.bgElev,
      border: `1px dashed ${inkstashColors.border}`,
      borderRadius: inkstashRadii.lg,
      p: { xs: 4, md: 8 },
      textAlign: 'center',
    }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
        bgcolor: inkstashColors.brandSoft,
        color: inkstashColors.brand,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Radio size={26} strokeWidth={2.2} />
      </Box>
      <Typography sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
        textTransform: 'uppercase', letterSpacing: '-0.005em',
        color: inkstashColors.ink, mb: 1.25,
      }}>
        You're not broadcasting
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
        maxWidth: 440, mx: 'auto', mb: 3, lineHeight: 1.5,
      }}>
        When you go live, this becomes your producer console — queue items,
        push them to the block, watch bids roll in, and moderate chat
        without touching your phone.
      </Typography>
      <HBtn
        variant="primary"
        size="lg"
        onClick={onGoLive}
        icon={<Radio size={16} strokeWidth={2.4} />}
      >
        Go live now
      </HBtn>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────
// Live surface (when actively broadcasting)
// ────────────────────────────────────────────────────────────────────

function LiveSurface({ active }: { active: ActiveStream }) {
  const { stream, livekit } = active;
  // On mobile single-device, this panel IS the camera. The composer's
  // publisher track dies the moment the modal closes (component
  // unmounts → LiveKit disconnects), so the Live Control surface has
  // to take over publishing — otherwise viewers see a dead stream.
  // join-livestream detects when the requester is the host and mints
  // a publish-capable token; we use that to mount LiveStreamVideo in
  // host mode here, which keeps the camera alive for the full session.
  // Desktop hosts use dual-device (phone publishes from /live/host),
  // so the laptop joins as a viewer and the in-room preview works
  // normally.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const videoMode: 'host' | 'viewer' = isMobile && livekit.isHost ? 'host' : 'viewer';
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  // Stub toast for Add/Edit affordances. The real editor surface lives
  // in a future phase alongside the auction backend; for now the
  // buttons render to communicate intent. Also used for auction error
  // surface ("Couldn't start bidding", etc).
  const [stubToast, setStubToast] = useState<string | null>(null);
  // The host pressed Start Bidding; we lock the CTA while the edge fn
  // round-trips so they can't double-fire.
  const [startingBid, setStartingBid] = useState(false);
  // Local tick to drive the countdown display + resolver firing. We
  // can't trust the realtime broadcast as the only timer source — the
  // realtime row update fires when bidding_ends_at changes (each bid),
  // but the SOLD transition needs a client-side observer because no
  // row event fires when the timer simply elapses.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      await livestreamsAPI.end(stream.id);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('active_bidding') || msg.includes('item_on_block_with_bids')) {
        setStubToast("Wait for the current bidding to finish before ending the stream.");
        setEnding(false);
        setEndConfirmOpen(false);
        return;
      }
      console.warn('[LiveControlPanel] end stream failed', err);
    } finally {
      setEnding(false);
      setEndConfirmOpen(false);
      // The parent panel polls getMyActiveStream on mount; reload the
      // page so it re-renders the empty state cleanly.
      window.location.reload();
    }
  }

  // Queue state, hydrated from livestream_items + listings (same pattern
  // as StreamShopRail). Realtime keeps it in sync with whatever the
  // phone or another tab does.
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [viewerCount, setViewerCount] = useState(1);
  const [likes, setLikes] = useState(0);
  // Mock bitrate for now — wiring to LiveKit getStats() is a follow-up.
  const [bitrate, setBitrate] = useState(6.2);

  // Pulse likes + bitrate so the producer surface feels alive even
  // without real telemetry.
  useEffect(() => {
    const id = setInterval(() => {
      setLikes((l) => l + Math.floor(Math.random() * 3));
      setBitrate(Number((5.8 + Math.random() * 0.7).toFixed(1)));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const refreshQueue = useCallback(async () => {
    const { data: items } = await supabase
      .from('livestream_items')
      .select('id, position, status, listing_id, current_price_cents, bid_count, bidding_ends_at, payment_intent_id, winner_charged_at, charge_error')
      .eq('livestream_id', stream.id)
      .neq('status', 'removed')
      .order('position', { ascending: true });
    const ids = (items ?? []).map((i: { listing_id: string }) => i.listing_id);
    if (ids.length === 0) { setQueue([]); return; }
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, buy_now_price, photos')
      .in('id', ids);
    type LRow = { id: string; title: string; buy_now_price: number | null; photos: Array<{ url?: string }> | null };
    type IRow = {
      id: string; position: number; status: QueueRow['status']; listing_id: string;
      current_price_cents: number | null; bid_count: number | null; bidding_ends_at: string | null;
      payment_intent_id: string | null; winner_charged_at: string | null; charge_error: string | null;
    };
    const byId = new Map((listings ?? []).map((l: LRow) => [l.id, l] as const));
    setQueue(
      (items ?? []).map((i: IRow) => ({
        id: i.id,
        position: i.position,
        status: i.status,
        current_price_cents: i.current_price_cents,
        bid_count: i.bid_count ?? 0,
        bidding_ends_at: i.bidding_ends_at,
        payment_intent_id: i.payment_intent_id,
        winner_charged_at: i.winner_charged_at,
        charge_error: i.charge_error,
        listing: byId.get(i.listing_id) ?? null,
      })),
    );
  }, [stream.id]);

  useEffect(() => {
    refreshQueue();
    const channel = supabase
      .channel(`live_control_queue:${stream.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'livestream_items', filter: `livestream_id=eq.${stream.id}` },
        () => { refreshQueue(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stream.id, refreshQueue]);

  const onBlock = queue.find((q) => q.status === 'live') ?? null;
  const upNext = queue.find((q) => q.status === 'queued') ?? null;

  async function pushToBlock(row: QueueRow) {
    // Demote whatever's currently live to 'passed' (so it leaves the
    // active block visually but stays in the history), then mark the
    // chosen row as 'live'.
    if (onBlock && onBlock.id !== row.id) {
      await supabase.from('livestream_items').update({ status: 'passed' }).eq('id', onBlock.id);
    }
    await supabase.from('livestream_items').update({ status: 'live' }).eq('id', row.id);
  }

  // Auction action: flip the on-block item into bidding-active state.
  // Backend defaults start_price_cents to listing.buy_now_price; host
  // can override later via an Edit Start Price modal (not in scope).
  async function handleStartBidding() {
    if (!onBlock || startingBid) return;
    setStartingBid(true);
    try {
      await livestreamsAPI.startBidding(onBlock.id);
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('bidding_already_started')) {
        setStubToast('Bidding has already started on this item.');
      } else if (msg.includes('item_not_on_block')) {
        setStubToast('Push the item onto the block before starting bidding.');
      } else {
        setStubToast("Couldn't start bidding — try again.");
      }
    } finally {
      setStartingBid(false);
    }
  }

  // Soft-close resolver: when the on-block item's bidding_ends_at
  // passes, flip it to 'sold' or 'passed' via the RPC, then chain
  // chargeWin if the result was 'sold'. We watch from the host's
  // surface so only one client fires both calls — chargeWin is
  // idempotent server-side but we don't want every viewer hitting it.
  // Realtime then broadcasts the status flip + charge state to all
  // viewers' MobileAuctionCards.
  useEffect(() => {
    if (!onBlock?.bidding_ends_at) return;
    const endsMs = new Date(onBlock.bidding_ends_at).getTime();
    const fire = async () => {
      // Re-read from latest queue snapshot; row may have been
      // resolved by realtime before this fires.
      const fresh = queueRef.current.find((q) => q.id === onBlock.id);
      if (!fresh || fresh.status !== 'live') return;
      let resolved: string;
      try {
        resolved = await livestreamsAPI.resolveBidding(onBlock.id);
      } catch (err) {
        // Swallow expected races (bidding_still_open if a late bid
        // resets the timer between checks; item not found if
        // someone deleted the row).
        const msg = (err as Error).message ?? '';
        if (!msg.includes('bidding_still_open')) {
          console.warn('[LiveControlPanel] resolveBidding failed', err);
        }
        return;
      }
      if (resolved !== 'sold') return; // 'passed' — nothing to charge
      // Show transient "Charging..." while the edge fn runs. The
      // realtime row update will replace this once the item flips
      // charge state.
      setStubToast('Charging the winner…');
      try {
        const result = await livestreamsAPI.chargeWin(onBlock.id);
        if (result.status === 'charged') {
          const amt = ((result.amount_cents ?? 0) / 100).toFixed(2).replace(/\.00$/, '');
          setStubToast(`Sold — $${amt} charged.`);
        } else if (result.status === 'charge_failed') {
          setStubToast(`Charge failed: ${result.error ?? 'unknown'} — see dashboard.`);
        } else if (result.status === 'no_winner') {
          // resolveBidding returned 'sold' but the edge fn says
          // current_winner_id is null — should be impossible, but
          // surface it so we notice.
          setStubToast('Auction resolved but no winner was found.');
        }
        // 'already_charged' = silent (re-fire from StrictMode)
      } catch (err) {
        console.warn('[LiveControlPanel] chargeWin failed', err);
        setStubToast("Couldn't reach the charge service — see dashboard.");
      }
    };
    const delay = endsMs - Date.now();
    if (delay <= 0) { fire(); return; }
    const id = window.setTimeout(fire, delay + 150);
    return () => window.clearTimeout(id);
  }, [onBlock?.id, onBlock?.bidding_ends_at]);

  // Latest queue snapshot, accessible from inside setTimeout closures
  // without re-firing the effect on every refresh.
  const queueRef = useRef<QueueRow[]>([]);
  queueRef.current = queue;

  // For the end-stream guard: any item currently in bidding-active
  // state blocks the End Stream click. We check it BEFORE the modal
  // opens so the host sees the toast immediately instead of a stale
  // modal that then errors on confirm.
  const hasActiveBidding = queue.some((q) =>
    q.status === 'live'
    && !!q.bidding_ends_at
    && new Date(q.bidding_ends_at).getTime() > Date.now()
  );
  function handleEndClick() {
    if (hasActiveBidding) {
      setStubToast("Wait for the current bidding to finish before ending the stream.");
      return;
    }
    setEndConfirmOpen(true);
  }

  // Remaining seconds on the on-block timer. Negative ⇒ resolver
  // fired but realtime hasn't caught up yet.
  const secondsRemaining = onBlock?.bidding_ends_at
    ? Math.max(0, Math.ceil((new Date(onBlock.bidding_ends_at).getTime() - Date.now()) / 1000))
    : null;

  const fmtLikes = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const soldCount = queue.filter((q) =>
    q.status === 'sold' || q.status === 'sold_pending_payment'
  ).length;

  return (
    <>
      {/* Live banner */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        p: 2, mb: 2.5,
        borderRadius: inkstashRadii.lg,
        bgcolor: inkstashColors.brand,
        color: '#fff',
      }}>
        <Box sx={{
          width: 10, height: 10, borderRadius: '50%', bgcolor: '#fff',
          animation: 'lc-pulse 1.4s ease-in-out infinite',
          '@keyframes lc-pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.35 },
          },
        }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{
            fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 16,
            textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1,
          }}>
            You're live
          </Box>
          <Box sx={{
            fontFamily: inkstashFonts.ui, fontSize: 12.5, color: 'rgba(255,255,255,0.85)',
            mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stream.title} — running the block from this laptop
          </Box>
        </Box>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: { xs: 1.25, md: 2 },
          flexShrink: 0, flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}>
          {/* Stream health + counts. Bitrate / connection / likes /
              viewers used to live in a separate card below the camera —
              consolidated into the banner so the host sees everything
              that matters at a glance. */}
          <Stat value={`${bitrate}`} unit="Mbps" label="Bitrate" />
          <Stat value="Good" label="Connection" tone="ok" />
          <Stat value={fmtLikes(likes)} label="Likes" />
          <Stat value={String(viewerCount)} label="Viewers" />
          <Stat value={String(queue.filter((q) => q.status === 'queued').length)} label="Queue" />
          <ButtonBase
            onClick={handleEndClick}
            sx={{
              ml: { md: 1 }, height: 40, px: 1.75, borderRadius: 999,
              bgcolor: 'rgba(0,0,0,0.22)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.28)',
              fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 13,
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              transition: 'background-color 120ms ease, transform 120ms ease',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.4)' },
              '&:active': { transform: 'translateY(1px)' },
            }}
          >
            <Square size={13} strokeWidth={2.6} fill="currentColor" />
            End stream
          </ButtonBase>
        </Box>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
        gap: 2.25,
        alignItems: 'start',
      }}>
        {/* LEFT — camera + health + dual-device */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, minWidth: 0 }}>
          {/* Block card */}
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'relative',
              // Vertical — matches the phone-as-camera framing.
              // Capped to a reasonable laptop height so the producer
              // still sees the rest of the panel without scrolling.
              aspectRatio: '9 / 16',
              maxHeight: 720,
              mx: 'auto',
              maxWidth: 'min(100%, 405px)',
              bgcolor: inkstashColors.stage,
              overflow: 'hidden',
            }}>
              <LiveStreamVideo
                wsUrl={livekit.wsUrl}
                token={livekit.token}
                mode={videoMode}
                onParticipantCountChange={videoMode === 'viewer' ? setViewerCount : undefined}
              />
              {videoMode === 'host' && (
                // Tiny corner badge so the mobile host knows their
                // device is broadcasting (no self-preview confusion
                // — they see their own camera output and that means
                // it's working).
                <Box sx={{
                  position: 'absolute', top: 12, right: 12, zIndex: 3,
                  display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  px: 1, py: '4px', borderRadius: 999,
                  bgcolor: 'rgba(0,0,0,0.55)', color: '#fff',
                  fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  <Smartphone size={11} strokeWidth={2.6} />
                  This device
                </Box>
              )}
              {/* ON AIR */}
              <Box sx={{
                position: 'absolute', top: 12, left: 12, zIndex: 3,
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 1, py: '5px', borderRadius: 999,
                bgcolor: inkstashColors.live, color: '#fff',
                fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.08em', lineHeight: 1,
                boxShadow: '0 2px 8px rgba(220,38,38,0.4)',
              }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
                  animation: 'lc-pulse 1.4s ease-in-out infinite',
                }} />
                ON AIR
              </Box>
              {/* Read-only chat overlay docked at the bottom of the
                  camera. Reuses the same LiveStreamChat the buyer-side
                  viewer page renders so the host sees exactly what the
                  audience sees. Composer / input is suppressed via
                  readOnly because moderation lives on the laptop. */}
              <LiveStreamChat
                livestreamId={stream.id}
                initialMessages={[]}
                isBanned={false}
                readOnly
              />
            </Box>

            {/* Block info */}
            <Box sx={{ p: 2 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
                color: inkstashColors.muted, mb: 0.75,
              }}>
                On the block
              </Typography>
              {onBlock?.listing ? (
                (() => {
                  // Display values come from the auction state when
                  // bidding is active, otherwise fall back to the
                  // listing's buy_now_price as the proposed start.
                  const bidActive = !!onBlock.bidding_ends_at
                    && new Date(onBlock.bidding_ends_at).getTime() > Date.now();
                  const showCents = onBlock.current_price_cents
                    ?? Math.round(Number(onBlock.listing.buy_now_price ?? 1) * 100);
                  const priceLabel = `$${(showCents / 100).toFixed(2).replace(/\.00$/, '')}`;
                  return (
                <Box sx={{
                  // Brand-edge treatment so the on-block item reads as
                  // the "next thing to do" instead of a passive readout.
                  position: 'relative',
                  p: 2,
                  borderRadius: inkstashRadii.md,
                  bgcolor: inkstashColors.brandSoft,
                  border: `1.5px solid ${inkstashColors.brand}`,
                  boxShadow: `0 0 0 4px ${inkstashColors.brand}14`,
                }}>
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.65,
                    px: 0.85, py: 0.3, borderRadius: 999,
                    bgcolor: inkstashColors.brand, color: '#fff',
                    fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    mb: 1, lineHeight: 1,
                  }}>
                    <Box sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff',
                      animation: 'inkstashOnBlockPulse 1.4s ease-in-out infinite',
                      '@keyframes inkstashOnBlockPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.35 },
                      },
                    }} />
                    On the block
                  </Box>
                  <Typography sx={{
                    fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
                    textTransform: 'uppercase', letterSpacing: '-0.005em',
                    color: inkstashColors.ink, mb: 1.25, lineHeight: 1.1,
                  }}>
                    {onBlock.listing.title}
                  </Typography>
                  <Box sx={{
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    gap: 1.5, mb: 1.5,
                  }}>
                    <Box>
                      <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.75 }}>
                        <Typography sx={{
                          fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 30,
                          color: inkstashColors.ink, lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {priceLabel}
                        </Typography>
                        {!bidActive && (
                          <ButtonBase
                            onClick={() => setStubToast('Editing the start price comes in the next phase.')}
                            title="Edit start price"
                            sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.35,
                              color: inkstashColors.muted,
                              px: 0.6, py: 0.25, borderRadius: 1,
                              fontFamily: inkstashFonts.ui, fontSize: 11, fontWeight: 600,
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: inkstashColors.ink },
                            }}
                          >
                            <Pencil size={11} strokeWidth={2.2} />
                            Edit
                          </ButtonBase>
                        )}
                      </Box>
                      <Typography sx={{
                        fontFamily: inkstashFonts.ui, fontSize: 12, color: inkstashColors.muted, mt: 0.5,
                      }}>
                        {bidActive ? 'Current bid' : 'Starting bid'}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{
                        fontFamily: inkstashFonts.mono, fontSize: 11.5, color: inkstashColors.muted,
                      }}>
                        {onBlock.bid_count} bid{onBlock.bid_count === 1 ? '' : 's'}
                      </Typography>
                      {bidActive && secondsRemaining != null && (
                        <Typography sx={{
                          fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
                          color: secondsRemaining <= 3 ? inkstashColors.live : inkstashColors.ink,
                          lineHeight: 1, mt: 0.4, fontVariantNumeric: 'tabular-nums',
                        }}>
                          {secondsRemaining}s
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  {/* Start bidding CTA. Once bidding is active the
                      button is replaced with a passive "Bidding live"
                      readout — the host can't restart bidding on the
                      same item. The auction will resolve itself when
                      the timer elapses (resolver effect above). */}
                  {bidActive ? (
                    <Box sx={{
                      width: '100%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: 0.85, py: 1.1, borderRadius: 999,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      color: inkstashColors.ink2,
                      fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 800,
                    }}>
                      <Zap size={15} strokeWidth={2.4} />
                      Bidding live
                    </Box>
                  ) : (
                    <ButtonBase
                      onClick={handleStartBidding}
                      disabled={startingBid}
                      sx={{
                        width: '100%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        gap: 0.85,
                        py: 1.1, borderRadius: 999,
                        bgcolor: inkstashColors.brand, color: '#fff',
                        fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 800,
                        letterSpacing: '0.005em',
                        transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease',
                        '&:hover': { bgcolor: inkstashColors.brandDeep },
                        '&:active': { transform: 'scale(0.985)' },
                        '&.Mui-disabled': { opacity: 0.65, color: '#fff' },
                      }}
                    >
                      <Zap size={15} strokeWidth={2.4} />
                      {startingBid ? 'Starting…' : 'Start bidding'}
                    </ButtonBase>
                  )}
                </Box>
                  );
                })()
              ) : (
                <Typography sx={{
                  fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
                  fontStyle: 'italic', mb: upNext ? 1.5 : 0,
                }}>
                  Nothing on the block yet — push the next item up when you're ready.
                </Typography>
              )}

              {/* Next up */}
              {upNext?.listing && (
                <NextUpRow
                  row={upNext}
                  onPush={() => pushToBlock(upNext)}
                />
              )}
            </Box>
          </Box>

          {/* Stream Health card lived here. Stats moved into the live
              banner so the host has everything at a glance up top. */}

          {/* Start a giveaway — sits above the dual-device card so the
              host has an obvious mid-stream action without crowding the
              on-block area. Stub until the raffles backend ships. */}
          <ButtonBase
            onClick={() => setStubToast('Giveaways launch alongside the raffles backend.')}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: 1.75,
              borderRadius: inkstashRadii.lg,
              bgcolor: inkstashColors.bgElev,
              border: `1px dashed ${inkstashColors.borderStrong}`,
              color: inkstashColors.ink, textAlign: 'left',
              transition: 'background-color 160ms ease, border-color 160ms ease, transform 120ms ease',
              '&:hover': {
                bgcolor: inkstashColors.bgSunken,
                borderColor: inkstashColors.brand,
              },
              '&:active': { transform: 'scale(0.992)' },
            }}
          >
            <Box sx={{
              width: 38, height: 38, borderRadius: 1.5,
              bgcolor: inkstashColors.brandSoft, color: inkstashColors.brand,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Gift size={18} strokeWidth={2.2} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 14,
                color: inkstashColors.ink,
              }}>
                Start a giveaway
              </Typography>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
                mt: 0.25, lineHeight: 1.5,
              }}>
                Pull viewers in mid-stream with a free item drop. Wires up with raffles.
              </Typography>
            </Box>
            <Plus size={18} strokeWidth={2.4} color={inkstashColors.muted} />
          </ButtonBase>

          {/* Dual-device card */}
          <Box sx={{
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.lg,
            p: 2,
            display: 'flex', alignItems: 'center', gap: 1.75,
          }}>
            <Box sx={{
              width: 42, height: 42, borderRadius: 1.5,
              bgcolor: inkstashColors.bgSunken,
              color: inkstashColors.ink,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Smartphone size={20} strokeWidth={2.2} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 14,
                color: inkstashColors.ink,
              }}>
                Dual-device mode
              </Typography>
              <Typography sx={{
                fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
                mt: 0.25, lineHeight: 1.5,
              }}>
                Your phone is the camera. Queue items and watch bids from here —
                no need to touch the phone.
              </Typography>
            </Box>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.6,
              px: 1.25, py: 0.5, borderRadius: 999,
              bgcolor: '#E6F5EB',
              color: inkstashColors.success,
              fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              flexShrink: 0,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: inkstashColors.success }} />
              Linked
            </Box>
          </Box>
        </Box>

        {/* RIGHT — Run of show. Compact roster: Add at top, per-row
            Edit. The per-row Push action moved under the camera (it's
            in the on-block card as "Next up"). The roster is now an
            at-a-glance list, not an action panel — keeps the producer
            surface camera-first. */}
        <Box sx={{
          bgcolor: inkstashColors.bgElev,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: inkstashRadii.lg,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: { lg: 720 },
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 1,
            p: 2, borderBottom: `1px solid ${inkstashColors.border}`,
          }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 1.25, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 16,
                textTransform: 'uppercase', letterSpacing: '0.01em',
                color: inkstashColors.ink,
              }}>
                Run of show
              </Typography>
              <Typography sx={{
                fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 600,
                color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {queue.length} queued
              </Typography>
            </Box>
            <ButtonBase
              onClick={() => setStubToast('Adding items mid-stream is coming next phase.')}
              title="Add item to queue"
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1.25, py: 0.6, borderRadius: 999,
                bgcolor: inkstashColors.ink, color: '#fff',
                fontFamily: inkstashFonts.ui, fontSize: 12, fontWeight: 700,
                lineHeight: 1, flexShrink: 0,
                transition: 'transform 120ms cubic-bezier(0.23, 1, 0.32, 1)',
                '&:hover': { bgcolor: inkstashColors.ink2 },
                '&:active': { transform: 'scale(0.96)' },
              }}
            >
              <Plus size={13} strokeWidth={2.6} />
              Add item
            </ButtonBase>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {queue.length === 0 ? (
              <Typography sx={{
                p: 3, textAlign: 'center', fontFamily: inkstashFonts.ui, fontSize: 13,
                color: inkstashColors.muted,
              }}>
                Queue empty — add items from the composer or hit Add item above.
              </Typography>
            ) : queue.map((row) => (
              <QueueRowItem
                key={row.id}
                row={row}
                onEdit={() => setStubToast('Editing queued items is coming next phase.')}
                isLive={row.id === onBlock?.id}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <EndStreamConfirmModal
        open={endConfirmOpen}
        onCancel={() => setEndConfirmOpen(false)}
        onConfirm={handleEnd}
        ending={ending}
      />

      <Snackbar
        open={!!stubToast}
        autoHideDuration={3200}
        onClose={() => setStubToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={stubToast ?? ''}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────

function Stat({
  value, label, unit, tone,
}: {
  value: string;
  label: string;
  unit?: string;
  tone?: 'ok';
}) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 56 }}>
      <Typography sx={{
        fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
        color: tone === 'ok' ? '#4ADE80' : '#fff',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        display: 'inline-flex', alignItems: 'baseline', gap: 0.4,
        justifyContent: 'center',
      }}>
        {value}
        {unit && (
          <Box component="span" sx={{
            fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
          }}>
            {unit}
          </Box>
        )}
      </Typography>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 10, fontWeight: 600,
        color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.06em',
        mt: 0.5,
      }}>
        {label}
      </Typography>
    </Box>
  );
}

// GlassStat + HStat used to live here. Both stats moved into the live
// banner via the simpler `Stat` component above, so they're gone.

function NextUpRow({ row, onPush }: { row: QueueRow; onPush: () => void }) {
  if (!row.listing) return null;
  const cover = row.listing.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
  return (
    <Box sx={{
      mt: 2, p: 1.25, display: 'grid',
      gridTemplateColumns: 'auto 48px 1fr auto',
      alignItems: 'center', gap: 1.25,
      bgcolor: inkstashColors.bgSunken,
      border: `1px solid ${inkstashColors.border}`,
      borderRadius: inkstashRadii.md,
    }}>
      <Typography sx={{
        fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 700,
        color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.08em',
        textAlign: 'center', lineHeight: 1.1,
      }}>
        Next<br />up
      </Typography>
      <Box sx={{
        width: 48, height: 48, borderRadius: inkstashRadii.sm,
        backgroundImage: `url(${cover})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        bgcolor: '#ddd',
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13, fontWeight: 700,
          color: inkstashColors.ink, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.listing.title}
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, mt: 0.25,
        }}>
          ${row.listing.buy_now_price ?? 0}
        </Typography>
      </Box>
      <ButtonBase
        onClick={onPush}
        title="Put on the block now"
        sx={{
          width: 38, height: 38, borderRadius: '50%',
          bgcolor: inkstashColors.brand,
          color: '#fff',
          '&:hover': { bgcolor: inkstashColors.brandDeep },
          '&:active': { transform: 'scale(0.96)' },
        }}
      >
        <ArrowUpCircle size={20} strokeWidth={2.2} />
      </ButtonBase>
    </Box>
  );
}

function QueueRowItem({
  row, onEdit, isLive,
}: {
  row: QueueRow;
  onEdit: () => void;
  isLive: boolean;
}) {
  if (!row.listing) return null;
  const cover = row.listing.photos?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
  const isSold = row.status === 'sold';
  const isSoldPending = row.status === 'sold_pending_payment';
  // Sold-but-charge-failed rows stay visually present (not greyed out)
  // because the host needs to see them to act on the failure.
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: 'auto 44px 1fr auto',
      alignItems: 'center', gap: 1.25,
      px: 1.5, py: 1.25,
      borderBottom: `1px solid ${inkstashColors.border}`,
      bgcolor: isLive ? inkstashColors.brandSoft
        : isSoldPending ? '#FFF8E1' // soft amber so the host can spot failed charges
        : 'transparent',
      opacity: isSold ? 0.55 : 1,
      '&:last-of-type': { borderBottom: 0 },
    }}>
      {/* Drag handle — visual affordance. Reorder wiring lands with the
          auction phase; for now it conveys "you can rearrange this".
          Cursor stays grab-style so the intent is obvious. */}
      <Box sx={{
        display: 'inline-flex', color: inkstashColors.muted2,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}>
        <GripVertical size={14} strokeWidth={2.2} />
      </Box>
      <Box sx={{
        width: 44, height: 44, borderRadius: inkstashRadii.sm,
        backgroundImage: `url(${cover})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        bgcolor: '#ddd',
      }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 13.5, fontWeight: 600,
          color: inkstashColors.ink, letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.listing.title}
        </Typography>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.75, mt: 0.25,
          fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted,
        }}>
          <span>${row.listing.buy_now_price ?? 0}</span>
          {isLive && (
            <Box component="span" sx={{
              px: 0.6, py: '1px', borderRadius: 0.5,
              bgcolor: inkstashColors.live, color: '#fff',
              fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              On block
            </Box>
          )}
          {isSold && (
            <Box component="span" sx={{
              fontWeight: 700, color: inkstashColors.ink2,
              textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9.5,
            }}>
              Sold · paid
            </Box>
          )}
          {isSoldPending && (
            <Box component="span" sx={{
              px: 0.6, py: '1px', borderRadius: 0.5,
              bgcolor: '#F0AD4E', color: '#fff',
              fontFamily: inkstashFonts.mono, fontSize: 9.5, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }} title={row.charge_error ?? undefined}>
              Charge failed
            </Box>
          )}
        </Box>
      </Box>
      {!isSold && (
        <ButtonBase
          onClick={onEdit}
          title="Edit item"
          sx={{
            width: 32, height: 32, borderRadius: '50%',
            color: inkstashColors.muted,
            border: `1px solid ${inkstashColors.border}`,
            transition: 'background-color 160ms ease, color 160ms ease, transform 120ms ease',
            '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
            '&:active': { transform: 'scale(0.94)' },
          }}
        >
          <Pencil size={14} strokeWidth={2.2} />
        </ButtonBase>
      )}
    </Box>
  );
}
