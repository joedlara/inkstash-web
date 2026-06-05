// src/components/creatorHub/composer/DualDevicePairing.tsx
//
// Renders the QR + paired-state indicator inside Step 4 of the composer
// when mode='live'. Mounting this calls prepareDualDevice() to mint the
// livestream row + pair token, encodes ${origin}/live/host?id=&pair=
// into a QR, and subscribes to the LiveKit room as a viewer so we know
// the moment the phone joins as a publisher.
//
// Once paired, calls onPaired(livestream_id) so the composer can enable
// its Go Live button. The Publish handler then calls goLive() (NOT
// start()) since the stream already exists at 'preparing'.

import { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Room, RoomEvent, type RemoteParticipant } from 'livekit-client';
import { Check, Smartphone, AlertCircle } from 'lucide-react';
import { livestreamsAPI } from '../../../api/livestreams';
import { supabase } from '../../../api/supabase/supabaseClient';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../../theme/inkstashTokens';

interface Props {
  title: string;
  description?: string;
  coverImageUrl?: string;
  /** Fires when prepare succeeds with the new stream id. Composer
   *  stores this so it can call persistComposerItems + goLive later. */
  onPrepared: (livestreamId: string) => void;
  /** Fires when the phone publishes its camera track. Composer uses
   *  this to enable Publish. */
  onPaired: (paired: boolean) => void;
  /** Set by the composer to true the moment goLive() flips the row to
   *  status='live'. After that, the unmount cleanup below MUST NOT
   *  delete the row — it's a real stream now. */
  published?: boolean;
}

type PrepareState =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'ready'; livestreamId: string; pairUrl: string; wsUrl: string; viewerToken?: string }
  | { kind: 'error'; message: string };

export default function DualDevicePairing({
  title, description, coverImageUrl, onPrepared, onPaired, published = false,
}: Props) {
  const [state, setState] = useState<PrepareState>({ kind: 'idle' });
  const [paired, setPaired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onPairedRef = useRef(onPaired);
  onPairedRef.current = onPaired;
  const onPreparedRef = useRef(onPrepared);
  onPreparedRef.current = onPrepared;
  // Holds the in-flight or completed livestream_id so the unmount
  // cleanup can soft-delete orphaned 'preparing' rows. Without this, a
  // refresh / Back / close-without-going-live leaks a row that shows up
  // in the host's Shows -> Past tab as an empty entry.
  const preparedRowRef = useRef<string | null>(null);
  // Mirrors the `published` prop into a ref so the unmount cleanup's
  // stable empty-dep closure can read the latest value (effect with
  // [] deps captures props at first render only).
  const publishedRef = useRef(false);
  publishedRef.current = published;

  // 1. Prepare the stream + mint the pair token. Runs once per mount
  // OR when the user hits Retry from the error UI. A 20s timeout
  // surfaces network/auth hangs as an error instead of an infinite
  // spinner. Note: we do NOT guard against StrictMode double-fire here;
  // the cleanup correctly cancels the first attempt, and the leaked
  // 'preparing' row is cleaned up by the unmount soft-delete below.
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
        const res = await livestreamsAPI.prepareDualDevice({
          title,
          description: description ?? undefined,
          cover_image_url: coverImageUrl,
          scheduled_start_at: null,
        });
        window.clearTimeout(timeoutId);
        if (cancelled) {
          // Still record the row so the unmount cleanup can delete it,
          // even when this attempt was cancelled by StrictMode.
          preparedRowRef.current = res.livestream_id;
          return;
        }
        preparedRowRef.current = res.livestream_id;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pairUrl = `${origin}/live/host?id=${encodeURIComponent(res.livestream_id)}&pair=${encodeURIComponent(res.pair_token)}`;
        setState({
          kind: 'ready',
          livestreamId: res.livestream_id,
          pairUrl,
          wsUrl: res.livekit_ws_url,
          viewerToken: res.composer_token,
        });
        onPreparedRef.current(res.livestream_id);
      } catch (err) {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        const msg = (err as Error).message ?? 'Failed to prepare';
        setState({ kind: 'error', message: msg });
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // 1b. Component-level cleanup: when the composer unmounts (refresh,
  // close, navigate away) AND we have a prepared row that never went
  // live, soft-delete it so it doesn't pollute the host's Past Shows
  // tab as an empty entry. Runs only on the final unmount, not on the
  // per-attempt re-runs above (those have their own per-effect cleanup).
  useEffect(() => {
    return () => {
      const rowId = preparedRowRef.current;
      if (!rowId || publishedRef.current) return;
      // Best-effort delete — the row is host-scoped by RLS so an
      // un-authed cleanup would fail anyway. If the request doesn't
      // make it before the tab unloads, the listMyShows() filter on
      // started_at=null catches it on the next page load.
      supabase
        .from('livestreams')
        .delete()
        .eq('id', rowId)
        .eq('status', 'preparing')
        .is('started_at', null)
        .then(() => { /* swallow */ }, () => { /* swallow */ });
    };
  }, []);

  // 2. When ready, join the LiveKit room as a viewer and listen for the
  // phone (a publisher participant) joining. Once we see a remote
  // participant, the phone is paired.
  useEffect(() => {
    if (state.kind !== 'ready' || !state.viewerToken) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });

    function checkPaired() {
      if (cancelled) return;
      // Use remoteParticipants.size — numParticipants doesn't always
      // update synchronously inside the ParticipantDisconnected event.
      // Any remote participant in this prepared room IS the phone since
      // buyers can't join until status='live'.
      const hasPhone = room.remoteParticipants.size > 0;
      setPaired(hasPhone);
      onPairedRef.current(hasPhone);
    }

    function forceUnpair() {
      if (cancelled) return;
      // Room-level disconnect (composer lost its viewer connection, or
      // LiveKit kicked us). Without this, an abrupt phone tab close
      // that also drops the composer's connection would leave the UI
      // claiming the phone is still paired.
      setPaired(false);
      onPairedRef.current(false);
    }

    room.on(RoomEvent.ParticipantConnected, checkPaired);
    room.on(RoomEvent.ParticipantDisconnected, checkPaired);
    room.on(RoomEvent.Connected, checkPaired);
    room.on(RoomEvent.Disconnected, forceUnpair);
    room.on(RoomEvent.Reconnecting, forceUnpair);

    (async () => {
      try {
        await room.connect(state.wsUrl, state.viewerToken!);
        checkPaired();
      } catch (err) {
        console.warn('[DualDevicePairing] room connect failed', err);
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect().catch(() => { /* ignore */ });
    };
  }, [state]);

  if (state.kind === 'idle' || state.kind === 'preparing') {
    return (
      <Centered>
        <CircularProgress size={28} sx={{ color: inkstashColors.brand }} />
        <Typography sx={{
          mt: 2, fontFamily: inkstashFonts.ui, fontSize: 13.5, color: inkstashColors.muted,
        }}>
          Setting up your show…
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
          Couldn't set up the show
        </Typography>
        <Typography sx={{
          mt: 0.5, fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
          maxWidth: 320, textAlign: 'center',
        }}>
          {state.message}
        </Typography>
        <Button
          onClick={() => setAttempt((n) => n + 1)}
          variant="contained"
          sx={{
            mt: 2,
            bgcolor: inkstashColors.ink,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 12.5,
            textTransform: 'none',
            px: 2.25,
            py: 0.85,
            borderRadius: 999,
            boxShadow: 'none',
            '&:hover': { bgcolor: inkstashColors.ink, boxShadow: 'none' },
          }}
        >
          Retry
        </Button>
      </Centered>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* QR — flat white card */}
      <Box sx={{
        p: 2,
        bgcolor: '#fff',
        borderRadius: inkstashRadii.lg,
        border: `1px solid ${inkstashColors.border}`,
        boxShadow: '0 8px 24px -12px rgba(0,0,0,0.18)',
      }}>
        <QRCodeSVG
          value={state.pairUrl}
          size={184}
          fgColor={inkstashColors.ink}
          bgColor="#FFFFFF"
          level="M"
        />
      </Box>

      {/* Status pill */}
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.85,
        px: 1.5, py: 0.85, borderRadius: 999,
        bgcolor: paired ? '#E6F5EB' : inkstashColors.bgSunken,
        border: `1px solid ${paired ? inkstashColors.success : inkstashColors.border}`,
        color: paired ? inkstashColors.success : inkstashColors.muted,
        fontFamily: inkstashFonts.mono, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        transition: 'background-color 200ms ease, color 200ms ease, border-color 200ms ease',
      }}>
        {paired ? <Check size={14} strokeWidth={2.6} /> : <Smartphone size={14} strokeWidth={2.2} />}
        {paired ? 'Phone connected' : 'Waiting for phone…'}
      </Box>

      <Typography sx={{
        fontFamily: inkstashFonts.ui, fontSize: 12.5, color: inkstashColors.muted,
        textAlign: 'center', maxWidth: 280, lineHeight: 1.5,
      }}>
        {paired
          ? "You're ready. Hit Go live when you're set."
          : 'Scan with your phone camera. Your phone becomes the broadcast camera; this laptop is the control panel.'}
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
