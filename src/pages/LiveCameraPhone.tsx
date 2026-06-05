// src/pages/LiveCameraPhone.tsx
//
// Dual-device camera page. The seller scans the QR from the Creator
// Hub's composer; this page reads ?id=&pair= from the URL, calls
// livestreamsAPI.pair() to exchange the pair token for a host LiveKit
// token, then publishes camera + mic to the room.
//
// Full-bleed, mobile-first, completely standalone (no AppShell, no
// auth required — the pair token IS the auth for the broadcast).
// The composer on the laptop is the producer console; this page only
// owns camera + mic + end-stream.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import { CallEnd } from '@mui/icons-material';
import LiveStreamVideo, { type LiveStreamVideoHandle } from '../components/livestreams/LiveStreamVideo';
import HostFloatingControls from '../components/livestreams/host/HostFloatingControls';
import EndStreamConfirmModal from '../components/livestreams/host/EndStreamConfirmModal';
import { livestreamsAPI } from '../api/livestreams';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../theme/inkstashTokens';

type Phase = 'loading' | 'error' | 'broadcasting';

export default function LiveCameraPhone() {
  useSuppressMobileNav();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const livestreamId = params.get('id') ?? '';
  const pairToken = params.get('pair') ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [livekit, setLivekit] = useState<{ token: string; wsUrl: string } | null>(null);
  const videoRef = useRef<LiveStreamVideoHandle>(null);

  // Live-phase state (same pattern as Phase 2 host page).
  const [micMuted, setMicMuted] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  // Lock body scroll while broadcasting so accidental drags don't move
  // the page underneath the full-bleed camera.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Pair → get host token. Runs once on mount.
  useEffect(() => {
    if (!livestreamId || !pairToken) {
      setErrorMsg('Missing pairing info. Scan the QR from your Creator Hub again.');
      setPhase('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await livestreamsAPI.pair({
          livestream_id: livestreamId,
          pair_token: pairToken,
        });
        if (cancelled) return;
        setLivekit({ token: res.livekit_token, wsUrl: res.livekit_ws_url });
        setPhase('broadcasting');
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error).message ?? 'Failed to pair';
        // Friendlier copy for the common cases.
        if (msg.includes('invalid_pair_token') || msg.includes('not_preparing')) {
          setErrorMsg('This QR has expired. Open the Creator Hub on your laptop and scan a fresh one.');
        } else if (msg.includes('not_found')) {
          setErrorMsg('Stream not found. The host may have ended it.');
        } else {
          setErrorMsg(msg);
        }
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [livestreamId, pairToken]);

  async function handleToggleMic() {
    const next = !micMuted;
    setMicMuted(next);
    try {
      await videoRef.current?.setMicMuted(next);
    } catch (err) {
      console.warn('[LiveCameraPhone] mic toggle failed', err);
      setMicMuted(!next);
    }
  }

  async function handleEnd() {
    if (ending) return;
    setEnding(true);
    try {
      // end-livestream is idempotent across statuses and the edge fn
      // is the authoritative way to tear down the LiveKit room +
      // mark the row 'ended'. Errors are still navigated-past so the
      // seller never gets stuck.
      await livestreamsAPI.end(livestreamId).catch((err) => {
        console.warn('[LiveCameraPhone] end failed (continuing)', err);
      });
    } finally {
      setEnding(false);
      setEndConfirmOpen(false);
      // Land on a friendly confirmation surface instead of trying to
      // close the tab (window.close() is a no-op for tabs that weren't
      // opened via script).
      navigate('/');
    }
  }

  if (phase === 'loading') {
    return (
      <CenteredCard>
        <CircularProgress size={32} sx={{ color: inkstashColors.brand }} />
        <Typography sx={{
          mt: 2, fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
        }}>
          Pairing your phone with the show…
        </Typography>
      </CenteredCard>
    );
  }

  if (phase === 'error' || !livekit) {
    return (
      <CenteredCard>
        <Typography sx={{
          fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
          textTransform: 'uppercase', letterSpacing: '-0.005em',
          color: inkstashColors.ink, mb: 1.5,
        }}>
          Couldn't pair
        </Typography>
        <Typography sx={{
          fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.muted,
          maxWidth: 360, mx: 'auto', lineHeight: 1.5,
        }}>
          {errorMsg ?? 'Unknown error.'}
        </Typography>
      </CenteredCard>
    );
  }

  // Broadcasting — full-bleed camera + minimal overlays
  return (
    <Box
      sx={{
        position: 'fixed', inset: 0,
        width: '100vw', height: ['100vh', '100lvh'],
        bgcolor: '#000', overflow: 'hidden', touchAction: 'manipulation',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, maxWidth: { xs: '100%', md: 480 }, mx: 'auto' }}>
        <LiveStreamVideo
          ref={videoRef}
          wsUrl={livekit.wsUrl}
          token={livekit.token}
          mode="host"
        />

        {/* Top-left: "Paired" badge so the seller knows the laptop sees them */}
        <Box sx={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
          zIndex: 4,
          display: 'inline-flex', alignItems: 'center', gap: 0.6,
          px: 1.25, py: 0.5, borderRadius: 999,
          bgcolor: 'rgba(46,111,79,0.78)',
          color: '#fff',
          fontFamily: inkstashFonts.mono, fontSize: 10.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ADE80' }} />
          Paired
        </Box>

        {/* Top-right: End stream button */}
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

        {/* Right-edge mic toggle. Reuses the Phase 2 floating controls
            component with the queue/drawer buttons hidden (phone is
            camera-only; queue lives on the laptop). */}
        <HostFloatingControls
          micMuted={micMuted}
          onToggleMic={handleToggleMic}
          onAddItem={() => { /* no-op on phone */ }}
          onOpenControl={() => { /* no-op on phone */ }}
        />

        {/* Bottom helper — tells the seller where the controls live now */}
        <Box sx={{
          position: 'absolute',
          left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          zIndex: 4,
          px: 1.5, py: 1, borderRadius: inkstashRadii.md,
          bgcolor: 'rgba(8,7,10,0.55)',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: inkstashFonts.ui, fontSize: 12.5, textAlign: 'center',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}>
          Hold the camera steady. The queue + bids live on your laptop.
        </Box>
      </Box>

      <EndStreamConfirmModal
        open={endConfirmOpen}
        onCancel={() => setEndConfirmOpen(false)}
        onConfirm={handleEnd}
        ending={ending}
      />
    </Box>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      minHeight: '100dvh',
      bgcolor: inkstashColors.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 3,
    }}>
      <Box sx={{
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        borderRadius: inkstashRadii.lg,
        p: 4, textAlign: 'center',
        maxWidth: 420, width: '100%',
      }}>
        {children}
      </Box>
    </Box>
  );
}
