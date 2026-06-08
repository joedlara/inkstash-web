// src/components/creatorHub/composer/SingleDeviceCamera.tsx
//
// Step 4 alternative to DualDevicePairing. THIS device IS the camera:
// we render a live LiveStreamVideo in host mode pointing at the
// device's own camera + mic, and Publish later calls goLive() on the
// stream row we prepare on mount.
//
// Used as the default on phones (<900px viewport) where dual-device's
// QR flow is impractical (you can't scan a QR with the same device
// you're trying to host from). Desktop users can also opt in if they
// want to broadcast straight from their laptop webcam instead of
// pairing a phone.
//
// We reuse the same `prepareDualDevice` edge-fn path the dual-device
// flow uses, then on Publish swap from view-only to host token by
// calling start-livestream WITHOUT prepare_dual_device. That's the
// existing single-device path — no new edge fn needed.

import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { AlertCircle, Smartphone } from 'lucide-react';
import LiveStreamVideo from '../../livestreams/LiveStreamVideo';
import { livestreamsAPI } from '../../../api/livestreams';
import { supabase } from '../../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  title: string;
  description?: string;
  coverImageUrl?: string;
  /** Fires when start-livestream succeeds. Composer stores this so
   *  the publish path can call persistComposerItems + (already-live)
   *  flow without re-creating a row. */
  onPrepared: (livestreamId: string) => void;
  /** Fires once the local camera has joined the LiveKit room. We use
   *  this the same way DualDevicePairing's onPaired works — enables
   *  Publish. */
  onCameraReady: (ready: boolean) => void;
  /** Flips true the moment the composer's goLive call completes so
   *  the unmount cleanup knows NOT to delete the row. */
  published?: boolean;
}

type PrepareState =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'ready'; livestreamId: string; hostToken: string; wsUrl: string }
  | { kind: 'error'; message: string };

export default function SingleDeviceCamera({
  title, description, coverImageUrl, onPrepared, onCameraReady, published = false,
}: Props) {
  const [state, setState] = useState<PrepareState>({ kind: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const onPreparedRef = useRef(onPrepared);
  onPreparedRef.current = onPrepared;
  const onCameraReadyRef = useRef(onCameraReady);
  onCameraReadyRef.current = onCameraReady;
  // Track the prepared row so unmount cleanup can soft-delete it if
  // the user abandons the composer (same pattern as DualDevicePairing).
  const preparedRowRef = useRef<string | null>(null);
  const publishedRef = useRef(false);
  publishedRef.current = published;

  // Prepare on mount. start-livestream WITHOUT prepare_dual_device
  // flips the row to 'live' immediately AND mints a host LiveKit
  // token we can publish with. There's no "preparing" intermediate
  // step for single-device — once we prepare, we ARE live.
  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'preparing' });
    const TIMEOUT_MS = 20_000;
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setState({
        kind: 'error',
        message: "We couldn't reach the server. Check your connection and retry.",
      });
    }, TIMEOUT_MS);
    (async () => {
      try {
        const res = await livestreamsAPI.start({
          title,
          description: description ?? undefined,
          cover_image_url: coverImageUrl,
          // Prepare-only: row stays 'preparing' so it doesn't appear
          // on /live before the host hits Publish. Composer calls
          // goLive() on Publish to flip to 'live', same as dual-device.
          prepare_single_device: true,
        });
        window.clearTimeout(timeoutId);
        if (cancelled) {
          preparedRowRef.current = res.livestream_id;
          return;
        }
        preparedRowRef.current = res.livestream_id;
        setState({
          kind: 'ready',
          livestreamId: res.livestream_id,
          hostToken: res.livekit_token,
          wsUrl: res.livekit_ws_url,
        });
        onPreparedRef.current(res.livestream_id);
      } catch (err) {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        setState({ kind: 'error', message: (err as Error).message ?? 'Failed to prepare' });
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Component-level cleanup: if the user closes the composer without
  // hitting Publish, soft-delete the prepared row so the seller's
  // Past Shows list doesn't fill up with abandoned attempts. The row
  // is in 'preparing' state (start was called with
  // prepare_single_device:true), so delete is the right cleanup —
  // it never went live and there's no LiveKit room to orphan.
  useEffect(() => {
    return () => {
      const rowId = preparedRowRef.current;
      if (!rowId || publishedRef.current) return;
      supabase
        .from('livestreams')
        .delete()
        .eq('id', rowId)
        .eq('status', 'preparing')
        .is('started_at', null)
        .then(() => { /* swallow */ }, () => { /* swallow */ });
    };
  }, []);

  if (state.kind === 'idle' || state.kind === 'preparing') {
    return (
      <Centered>
        <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
        <Typography sx={{
          mt: 2, fontFamily: inkstashFonts.ui, fontSize: 13.5, color: inkstashColors.muted,
        }}>
          Setting up your camera…
        </Typography>
      </Centered>
    );
  }

  if (state.kind === 'error') {
    return (
      <Centered>
        <AlertCircle size={28} color={inkstashColors.brand} />
        <Typography sx={{
          mt: 1.5, fontFamily: inkstashFonts.ui, fontSize: 14, color: inkstashColors.ink, fontWeight: 600,
        }}>
          Couldn't set up the camera
        </Typography>
        <Typography sx={{
          mt: 0.5, fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
          maxWidth: 320, textAlign: 'center',
        }}>
          {state.message}
        </Typography>
        <Box
          component="button"
          onClick={() => setAttempt((n) => n + 1)}
          sx={{
            mt: 2, px: 2.25, py: 0.85, borderRadius: 999,
            bgcolor: inkstashColors.ink, color: '#fff',
            fontFamily: inkstashFonts.ui, fontWeight: 700, fontSize: 12.5,
            border: 0, cursor: 'pointer',
          }}
        >
          Retry
        </Box>
      </Centered>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Live camera preview — 9:16 portrait card with rounded border
          to mirror the viewer surface treatment. */}
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '9 / 16',
          maxHeight: 360,
          mx: 'auto',
          width: 'auto',
          bgcolor: '#0A0A0A',
          borderRadius: inkstashRadii.lg,
          overflow: 'hidden',
          boxShadow: '0 8px 24px -8px rgba(0,0,0,0.45)',
        }}
      >
        <LiveStreamVideo
          wsUrl={state.wsUrl}
          token={state.hostToken}
          mode="host"
          onConnected={() => onCameraReadyRef.current(true)}
        />
      </Box>

      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          alignSelf: 'center',
          gap: 0.85,
          px: 1.5, py: 0.85,
          borderRadius: 999,
          bgcolor: '#E6F5EB',
          border: `1px solid ${inkstashColors.success}`,
          color: inkstashColors.success,
          fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
      >
        <Smartphone size={14} strokeWidth={2.6} />
        Camera ready
      </Box>

      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
        textAlign: 'center', maxWidth: 320, mx: 'auto', lineHeight: 1.5,
      }}>
        This device is the camera. Tap Publish when you're ready to go live.
      </Typography>
    </Box>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 280, py: 4,
    }}>
      {children}
    </Box>
  );
}
