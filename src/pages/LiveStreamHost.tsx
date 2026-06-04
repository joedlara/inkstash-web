// src/pages/LiveStreamHost.tsx
//
// /live/start — two-phase. Pre-live: title input + camera preview. Live:
// camera full-bleed with chat + controls overlaid on top (mobile-first;
// desktop gets a side rail variant). Active sellers only; redirects
// non-sellers to the seller dashboard.
//
// Refresh recovery: if the host already has a live stream when they hit this
// page (refreshed mid-stream, tab crash, etc.) we end the orphaned stream
// and let them start a fresh one — we can't re-issue a token against the
// previous LiveKit participant identity.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, CircularProgress, Alert, IconButton,
  Dialog, DialogTitle, DialogContent,
} from '@mui/material';
import { CallEnd, Close } from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import LiveStreamVideo, { type LiveStreamVideoHandle } from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import ViewerCountBadge from '../components/livestreams/ViewerCountBadge';
import PreLiveCameraPreview, { type PreLiveCameraPreviewHandle } from '../components/livestreams/host/PreLiveCameraPreview';
import ThumbnailUploader from '../components/livestreams/host/ThumbnailUploader';
import SchedulePicker from '../components/livestreams/host/SchedulePicker';
import PreStreamQueue from '../components/livestreams/host/PreStreamQueue';
import HostFloatingControls from '../components/livestreams/host/HostFloatingControls';
import HostControlDrawer from '../components/livestreams/host/HostControlDrawer';
import EndStreamConfirmModal from '../components/livestreams/host/EndStreamConfirmModal';
import { livestreamsAPI } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../api/supabase/supabaseClient';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { useFullBleedBlackBackground } from '../components/livestreams/useFullBleedBlackBackground';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../theme/inkstashTokens';

function SectionLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <Typography
      sx={{
        fontFamily: inkstashFonts.ui,
        fontSize: 12.5,
        fontWeight: 800,
        color: inkstashColors.ink,
        letterSpacing: '-0.005em',
        textTransform: 'uppercase',
        mb: 0.75,
      }}
    >
      {children}
      {optional && (
        <Box
          component="span"
          sx={{
            ml: 0.75,
            fontFamily: inkstashFonts.ui,
            fontSize: 10,
            fontWeight: 700,
            color: inkstashColors.muted,
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          optional
        </Box>
      )}
    </Typography>
  );
}

const inputSx = {
  '& .MuiInputBase-root': {
    fontFamily: inkstashFonts.ui,
    fontSize: 14,
    bgcolor: inkstashColors.bgSunken,
    borderRadius: 1.5,
  },
  '& fieldset': { borderColor: inkstashColors.border },
  '& .MuiInputBase-input': { letterSpacing: '-0.005em' },
} as const;

export default function LiveStreamHost() {
  useSuppressMobileNav();
  useFullBleedBlackBackground();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [phase, setPhase] = useState<'pre' | 'live'>('pre');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [livekit, setLivekit] = useState<{ token: string; wsUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [orphanCheck, setOrphanCheck] = useState<'checking' | 'clean' | 'cleaned'>('checking');
  const cameraPreviewRef = useRef<PreLiveCameraPreviewHandle>(null);

  // Live-phase state
  const videoRef = useRef<LiveStreamVideoHandle>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [micMuted, setMicMuted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [liveQueue, setLiveQueue] = useState<string[]>([]); // tracked just so the modal shows the current state — INSERTs happen on close

  const isActiveSeller = (user as { seller_status?: string } | null)?.seller_status === 'active';
  useEffect(() => {
    if (user && !isActiveSeller) navigate('/seller-dashboard');
  }, [user, isActiveSeller, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from('livestreams')
        .select('id')
        .eq('host_user_id', user.id)
        .eq('status', 'live')
        .maybeSingle();
      if (cancelled) return;
      if (existing) {
        try {
          await livestreamsAPI.end((existing as { id: string }).id);
        } catch (err) {
          console.warn('[LiveStreamHost] orphan end failed (continuing)', err);
        }
        if (!cancelled) setOrphanCheck('cleaned');
      } else {
        if (!cancelled) setOrphanCheck('clean');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Lock body scroll while in the live phase so the host can't drag the
  // page background up/down behind the full-bleed camera.
  useEffect(() => {
    if (phase !== 'live') return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [phase]);

  async function handleGoLive() {
    setStarting(true);
    setError(null);
    // CRITICAL: free the preview camera BEFORE LiveKit tries to publish.
    // iOS Safari throws NotReadableError when two getUserMedia calls
    // overlap on the same device. We release the preview tracks here so
    // the camera is available when LiveStreamVideo mounts.
    cameraPreviewRef.current?.releaseCamera();
    try {
      const res = await livestreamsAPI.start({
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image_url: coverImageUrl ?? undefined,
        scheduled_start_at: scheduledAt,
        queue: queue.length > 0 ? queue : undefined,
      });
      setStreamId(res.livestream_id);
      setLivekit({ token: res.livekit_token, wsUrl: res.livekit_ws_url });
      // If scheduled in the future, jump back to /live so the host can
      // come back when it's time. Otherwise enter the live phase.
      if (scheduledAt && new Date(scheduledAt).getTime() > Date.now()) {
        navigate('/live');
      } else {
        setStartedAt(new Date().toISOString());
        setPhase('live');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const goLiveLabel = scheduledAt && new Date(scheduledAt).getTime() > Date.now()
    ? 'Schedule stream'
    : 'Go Live Now';

  async function handleEnd() {
    if (!streamId || ending) return;
    setEnding(true);
    try {
      await livestreamsAPI.end(streamId);
    } finally {
      setEnding(false);
      navigate('/live');
    }
  }

  async function handleToggleMic() {
    const next = !micMuted;
    setMicMuted(next);
    await videoRef.current?.setMicMuted(next);
  }

  const handleViewerCount = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  // When the host closes the add-item modal, diff the new selection
  // against the previously committed queue and INSERT only the new ones.
  // The modal manages its own selection state via PreStreamQueue's value;
  // we just need to persist on close.
  async function handleAddItemClose(nextQueue: string[]) {
    setAddItemOpen(false);
    if (!streamId) return;
    const added = nextQueue.filter((id) => !liveQueue.includes(id));
    if (added.length === 0) return;
    // Find the current max position so new items append to the bottom.
    const { data: existing } = await supabase
      .from('livestream_items')
      .select('position')
      .eq('livestream_id', streamId)
      .order('position', { ascending: false })
      .limit(1);
    const startPos = ((existing?.[0] as { position?: number } | undefined)?.position ?? -1) + 1;
    const rows = added.map((listingId, idx) => ({
      livestream_id: streamId,
      listing_id: listingId,
      position: startPos + idx,
    }));
    const { error: insErr } = await supabase.from('livestream_items').insert(rows);
    if (insErr) {
      console.warn('[LiveStreamHost] queue insert failed', insErr);
      return;
    }
    setLiveQueue(nextQueue);
  }

  if (!user) return null;

  if (phase === 'pre') {
    return (
      <AppShell>
        <Box sx={{ maxWidth: 540, mx: 'auto', p: { xs: 2, md: 3 } }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 900,
              fontSize: { xs: 28, md: 36 },
              color: inkstashColors.ink,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              mb: 0.75,
            }}
          >
            Go Live
          </Typography>
          <Typography
            sx={{
              color: inkstashColors.muted,
              fontFamily: inkstashFonts.ui,
              fontSize: 14,
              letterSpacing: '-0.005em',
              mb: 3,
            }}
          >
            Set up your stream, then broadcast.
          </Typography>

          {orphanCheck === 'cleaned' && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Your previous stream was still marked live (likely a tab refresh). We've closed it — start a new one below.
            </Alert>
          )}

          {/* Camera preview */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel>Camera preview</SectionLabel>
            <PreLiveCameraPreview ref={cameraPreviewRef} />
          </Box>

          {/* Title */}
          <Box sx={{ mb: 2.5 }}>
            <SectionLabel>Title</SectionLabel>
            <TextField
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you streaming?"
              inputProps={{ maxLength: 120 }}
              size="small"
              sx={inputSx}
            />
          </Box>

          {/* Description */}
          <Box sx={{ mb: 2.5 }}>
            <SectionLabel optional>Description</SectionLabel>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the show about? Featured items, deals, vibe..."
              inputProps={{ maxLength: 500 }}
              size="small"
              sx={inputSx}
            />
          </Box>

          {/* Thumbnail */}
          <Box sx={{ mb: 2.5 }}>
            <SectionLabel optional>Thumbnail</SectionLabel>
            <ThumbnailUploader value={coverImageUrl} onChange={setCoverImageUrl} />
          </Box>

          {/* Schedule */}
          <Box sx={{ mb: 2.5 }}>
            <SchedulePicker value={scheduledAt} onChange={setScheduledAt} />
          </Box>

          {/* Pre-stream queue */}
          <Box sx={{ mb: 3 }}>
            <SectionLabel optional>Pre-stream queue</SectionLabel>
            <PreStreamQueue value={queue} onChange={setQueue} />
            <Typography
              sx={{
                mt: 1,
                fontSize: 11.5,
                color: inkstashColors.muted,
                fontFamily: inkstashFonts.ui,
              }}
            >
              Items appear in the shop rail when the stream goes live.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGoLive}
            disabled={!title.trim() || starting || orphanCheck === 'checking'}
            sx={{
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.ui,
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: '-0.01em',
              textTransform: 'none',
              py: 1.5,
              borderRadius: inkstashRadii.md,
              boxShadow: '0 4px 14px rgba(161,35,44,0.35)',
              '&:hover': { bgcolor: inkstashColors.brandDeep },
              '&:active': { transform: 'scale(0.99)' },
              '&.Mui-disabled': {
                bgcolor: inkstashColors.bgSunken,
                color: inkstashColors.muted,
                boxShadow: 'none',
              },
            }}
          >
            {starting ? <CircularProgress size={20} color="inherit" /> : `🔴 ${goLiveLabel}`}
          </Button>
          {orphanCheck === 'checking' && (
            <Typography sx={{ mt: 1.5, fontSize: 12, color: inkstashColors.muted, textAlign: 'center' }}>
              Checking for previous session…
            </Typography>
          )}
        </Box>
      </AppShell>
    );
  }

  if (!streamId || !livekit || !startedAt) return null;
  // Live phase: full-bleed camera. Overlays on top:
  //   - Top-left: viewer count pill
  //   - Top-right: End stream (with confirm)
  //   - Right edge: floating control stack (Mic, +Item, Control)
  //   - Bottom (via drawer): Chat / Queue / Stats tabs
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
      <Box
        sx={{
          position: 'absolute', inset: 0,
          maxWidth: { xs: '100%', md: 480 },
          mx: 'auto',
        }}
      >
        <LiveStreamVideo
          ref={videoRef}
          wsUrl={livekit.wsUrl}
          token={livekit.token}
          mode="host"
          onParticipantCountChange={handleViewerCount}
        />

        {/* Top-left: viewer count pill (engagement signal for the host) */}
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
            zIndex: 4,
          }}
        >
          <ViewerCountBadge count={viewerCount} />
        </Box>

        {/* Top-right: End stream button (with confirmation modal) */}
        <IconButton
          onClick={() => setEndConfirmOpen(true)}
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
            bgcolor: inkstashColors.live, color: '#fff',
            '&:hover': { bgcolor: '#B91C1C' },
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            zIndex: 4,
          }}
          aria-label="End stream"
        >
          <CallEnd />
        </IconButton>

        {/* Read-only chat overlay so the host can see audience messages
            without opening the drawer. Scroll-back works; composer is
            suppressed via readOnly. */}
        <LiveStreamChat
          livestreamId={streamId}
          initialMessages={[]}
          isBanned={false}
          readOnly
        />

        {/* Right-edge floating control stack */}
        <HostFloatingControls
          micMuted={micMuted}
          onToggleMic={handleToggleMic}
          onAddItem={() => setAddItemOpen(true)}
          onOpenControl={() => setDrawerOpen(true)}
        />
      </Box>

      {/* Bottom-sheet drawer: Chat / Queue / Stats */}
      <HostControlDrawer
        open={drawerOpen}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        livestreamId={streamId}
        startedAt={startedAt}
        liveViewers={viewerCount}
        totalUniqueViewers={viewerCount}
        onAddItem={() => {
          setDrawerOpen(false);
          setAddItemOpen(true);
        }}
      />

      {/* End stream confirm */}
      <EndStreamConfirmModal
        open={endConfirmOpen}
        onCancel={() => setEndConfirmOpen(false)}
        onConfirm={handleEnd}
        ending={ending}
      />

      {/* Add item to queue modal (reuses PreStreamQueue's picker UX) */}
      <Dialog
        open={addItemOpen}
        onClose={() => handleAddItemClose(liveQueue)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: inkstashRadii.lg } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            sx={{
              fontFamily: inkstashFonts.ui,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: '-0.02em',
              color: inkstashColors.ink,
            }}
          >
            Add to queue
          </Typography>
          <IconButton onClick={() => handleAddItemClose(liveQueue)} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 480, p: 2 }}>
          <PreStreamQueue value={liveQueue} onChange={setLiveQueue} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
