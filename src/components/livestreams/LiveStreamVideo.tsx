// src/components/livestreams/LiveStreamVideo.tsx
//
// Wraps a LiveKit Room and renders the host's video track full-bleed.
// Two modes:
//   - host: publishes camera + mic to the room. Defaults to the back-facing
//     ("environment") camera since the stream is meant for showing comics,
//     not the host's face. Flip button swaps to front camera if the host
//     wants to talk to camera.
//   - viewer: subscribe-only (audio + video)
//
// Cleanup on unmount: leave room, stop tracks. Critical to prevent zombie
// cameras (browser tab keeps streaming if we don't tear down properly).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Room, Track, RoomEvent, createLocalTracks,
  type RemoteTrack, type LocalTrack, type LocalVideoTrack, type LocalAudioTrack,
} from 'livekit-client';
import { Box, Typography, IconButton } from '@mui/material';
import { FlipCameraIos } from '@mui/icons-material';
import { inkstashColors } from '../../theme/inkstashTokens';

export interface LiveStreamVideoHandle {
  /** Toggle the host's local audio track on/off. No-op for viewers. */
  setMicMuted: (muted: boolean) => Promise<void>;
}

interface Props {
  wsUrl: string;
  token: string;
  mode: 'host' | 'viewer';
  /** Called once the room is connected. */
  onConnected?: () => void;
  /** Fires whenever someone joins or leaves the LiveKit room. The number
   *  reflects subscribers + the publishing host. */
  onParticipantCountChange?: (count: number) => void;
}

type Facing = 'user' | 'environment';

const LiveStreamVideo = forwardRef<LiveStreamVideoHandle, Props>(function LiveStreamVideo({
  wsUrl, token, mode, onConnected, onParticipantCountChange,
}, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  // Hold tracks across re-renders so we can re-attach if the videoRef changes.
  const tracksRef = useRef<Array<LocalTrack | RemoteTrack>>([]);
  // Held separately so the flip button can replace it without touching audio.
  const localVideoRef = useRef<LocalVideoTrack | null>(null);
  // Kept so the host page can mute/unmute mic without re-publishing tracks.
  const localAudioRef = useRef<LocalAudioTrack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [flipping, setFlipping] = useState(false);

  useImperativeHandle(ref, () => ({
    async setMicMuted(muted: boolean) {
      const track = localAudioRef.current;
      if (!track) return;
      // LiveKit's mute method toggles the published track's enabled state
      // and signals subscribers; we don't need to unpublish/republish.
      if (muted) await track.mute();
      else await track.unmute();
    },
  }), []);

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    let cancelled = false;

    function attachVideoTrack(track: LocalTrack | RemoteTrack) {
      tracksRef.current.push(track);
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    }

    async function connect() {
      try {
        if (mode === 'viewer') {
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (cancelled) return;
            if (track.kind === Track.Kind.Video) {
              attachVideoTrack(track);
            } else if (track.kind === Track.Kind.Audio) {
              const audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              track.attach(audioEl);
              tracksRef.current.push(track);
            }
          });
        }

        // Presence subscription: emit numParticipants every time someone
        // joins or leaves. numParticipants reports remote participants only,
        // so add 1 for the local participant (host or viewer) to get the
        // actual head count.
        if (onParticipantCountChange) {
          const emit = () => {
            if (!cancelled) onParticipantCountChange(room.numParticipants + 1);
          };
          room.on(RoomEvent.ParticipantConnected, emit);
          room.on(RoomEvent.ParticipantDisconnected, emit);
          room.on(RoomEvent.Connected, emit);
        }

        await room.connect(wsUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        if (mode === 'host') {
          // createLocalTracks can fail AFTER room.connect succeeded — most
          // commonly when iOS holds the camera/mic for an active phone call
          // or when another tab/app has the device. Surfacing the error
          // here keeps the host from staring at a black screen wondering
          // why their face isn't showing up.
          let tracks
          try {
            tracks = await createLocalTracks({
              audio: true,
              // Default to back camera so the host can show comics. Prefer
              // exact match but fall back if the device only has a front
              // camera (laptops, iPads without ultra-wide).
              video: { facingMode: { ideal: 'environment' } },
            });
          } catch (tracksErr) {
            const te = tracksErr as Error
            // Disconnect from the room so we don't leave a publisher slot
            // open + a dead participant the LiveKit room thinks is publishing.
            try { await room.disconnect() } catch { /* ignore */ }
            if (cancelled) return
            if (te.name === 'NotReadableError') {
              setError('Camera or microphone is busy. End any active phone call or close other apps using the camera, then reload.')
            } else if (te.name === 'NotAllowedError') {
              setError('Camera/microphone access denied. Tap the address bar lock icon, allow camera + mic, then reload.')
            } else {
              setError(`Couldn't start camera: ${te.message}`)
            }
            return
          }
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            attachVideoTrack(track);
            if (track.kind === Track.Kind.Video) {
              localVideoRef.current = track as LocalVideoTrack;
            } else if (track.kind === Track.Kind.Audio) {
              localAudioRef.current = track as LocalAudioTrack;
            }
          }
        }

        onConnected?.();
      } catch (err) {
        const e = err as Error;
        console.error('[LiveStreamVideo] connect failed', e);
        if (cancelled) return;
        if (e.name === 'NotAllowedError') {
          setError('Camera/microphone access denied. Reload the page and click "Allow" when your browser prompts.');
        } else if (e.name === 'NotFoundError') {
          setError('No camera or microphone found on this device.');
        } else if (e.name === 'NotReadableError') {
          setError('Camera or microphone is already in use by another tab or app.');
        } else {
          setError(`Connection failed: ${e.message}`);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      for (const track of tracksRef.current) {
        try { track.detach(); } catch { /* ignore */ }
      }
      tracksRef.current = [];
      localVideoRef.current = null;
      roomRef.current = null;
      room.disconnect();
    };
  }, [wsUrl, token, mode, onConnected]);

  // Re-attach any pending video track when the videoRef becomes available.
  useEffect(() => {
    if (!videoRef.current) return;
    const videoEl = videoRef.current;
    for (const track of tracksRef.current) {
      if (track.kind === Track.Kind.Video) {
        try { track.attach(videoEl); } catch { /* track may have been detached */ }
      }
    }
  });

  // Flip between front + back camera. Replace the published video track in
  // place so subscribers see the swap without reconnecting.
  async function handleFlipCamera() {
    if (flipping || !roomRef.current || !localVideoRef.current) return;
    setFlipping(true);
    const next: Facing = facing === 'environment' ? 'user' : 'environment';
    try {
      const newTracks = await createLocalTracks({
        audio: false,
        video: { facingMode: { ideal: next } },
      });
      const newVideo = newTracks.find((t) => t.kind === Track.Kind.Video) as LocalVideoTrack | undefined;
      if (!newVideo) return;

      const old = localVideoRef.current;
      const lp = roomRef.current.localParticipant;
      // Replace the published track. LiveKit handles the SDP renegotiation.
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.track) {
        await lp.unpublishTrack(pub.track, true);
      }
      await lp.publishTrack(newVideo);

      // Swap the ref + attach the new track to the existing video element.
      tracksRef.current = tracksRef.current.filter((t) => t !== old);
      tracksRef.current.push(newVideo);
      localVideoRef.current = newVideo;
      if (videoRef.current) newVideo.attach(videoRef.current);

      try { old.detach(); } catch { /* ignore */ }
      try { old.stop(); } catch { /* ignore */ }

      setFacing(next);
    } catch (err) {
      console.warn('[LiveStreamVideo] flip camera failed', err);
    } finally {
      setFlipping(false);
    }
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000' }}>
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        playsInline
        muted={mode === 'host'}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {error && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.85)',
            p: 3,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 14,
              maxWidth: 320,
              lineHeight: 1.5,
            }}
          >
            {error}
          </Typography>
        </Box>
      )}
      {/* The previous baked-in "LIVE" badge has been removed — HostPill is
          the authoritative top-left treatment now and the badge was
          overlapping it. Viewer state is conveyed by the ViewerCountBadge
          and the host-pill cluster instead. */}
      {false && !error && (
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
            px: 1,
            py: 0.5,
            borderRadius: 999,
            bgcolor: inkstashColors.live,
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            zIndex: 2,
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />
          Live
        </Box>
      )}
      {/* Flip-camera button (host only). Positioned next to the live badge. */}
      {mode === 'host' && !error && (
        <IconButton
          onClick={handleFlipCamera}
          disabled={flipping}
          aria-label="Flip camera"
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 90px)',
            bgcolor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
            zIndex: 2,
          }}
        >
          <FlipCameraIos fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
});

export default LiveStreamVideo;
