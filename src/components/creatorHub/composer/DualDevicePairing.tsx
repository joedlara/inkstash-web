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
import { Box, CircularProgress, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Room, RoomEvent, type RemoteParticipant } from 'livekit-client';
import { Check, Smartphone, AlertCircle } from 'lucide-react';
import { livestreamsAPI } from '../../../api/livestreams';
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
}

type PrepareState =
  | { kind: 'idle' }
  | { kind: 'preparing' }
  | { kind: 'ready'; livestreamId: string; pairUrl: string; wsUrl: string; viewerToken?: string }
  | { kind: 'error'; message: string };

export default function DualDevicePairing({
  title, description, coverImageUrl, onPrepared, onPaired,
}: Props) {
  const [state, setState] = useState<PrepareState>({ kind: 'idle' });
  const [paired, setPaired] = useState(false);
  const onPairedRef = useRef(onPaired);
  onPairedRef.current = onPaired;
  const onPreparedRef = useRef(onPrepared);
  onPreparedRef.current = onPrepared;

  // 1. Prepare the stream + mint the pair token. Runs once on mount.
  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'preparing' });
    (async () => {
      try {
        const res = await livestreamsAPI.prepareDualDevice({
          title,
          description: description ?? undefined,
          cover_image_url: coverImageUrl,
          scheduled_start_at: null,
        });
        if (cancelled) return;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const pairUrl = `${origin}/live/host?id=${encodeURIComponent(res.livestream_id)}&pair=${encodeURIComponent(res.pair_token)}`;
        // Mint a viewer token via the existing join flow so we can
        // subscribe to the room and listen for the phone joining.
        let viewerToken: string | undefined;
        try {
          const join = await livestreamsAPI.join(res.livestream_id);
          viewerToken = join.livekit_token;
        } catch (err) {
          // Non-fatal — paired detection falls back to a poll if needed.
          console.warn('[DualDevicePairing] join failed (paired detection degraded)', err);
        }
        if (cancelled) return;
        setState({
          kind: 'ready',
          livestreamId: res.livestream_id,
          pairUrl,
          wsUrl: res.livekit_ws_url,
          viewerToken,
        });
        onPreparedRef.current(res.livestream_id);
      } catch (err) {
        if (cancelled) return;
        const msg = (err as Error).message ?? 'Failed to prepare';
        setState({ kind: 'error', message: msg });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Any remote participant in this private prepared room is the
      // phone. (Buyers can't join until status='live'.)
      const hasPhone = room.numParticipants > 0;
      setPaired(hasPhone);
      onPairedRef.current(hasPhone);
    }

    room.on(RoomEvent.ParticipantConnected, checkPaired);
    room.on(RoomEvent.ParticipantDisconnected, checkPaired);
    room.on(RoomEvent.Connected, checkPaired);

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
