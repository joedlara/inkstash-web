// src/components/livestreams/LiveStreamVideo.tsx
//
// Wraps a LiveKit Room and renders the host's video track full-bleed.
// Two modes:
//   - host: publishes camera + mic to the room
//   - viewer: subscribe-only (audio + video)
//
// Cleanup on unmount: leave room, stop tracks. Critical to prevent zombie
// cameras (browser tab keeps streaming if we don't tear down properly).

import { useEffect, useRef, useState } from 'react';
import { Room, Track, RoomEvent, createLocalTracks, type RemoteTrack, type LocalTrack } from 'livekit-client';
import { Box, Typography } from '@mui/material';
import { inkstashColors } from '../../theme/inkstashTokens';

interface Props {
  wsUrl: string;
  token: string;
  mode: 'host' | 'viewer';
  /** Called once the room is connected. Useful for switching the UI from
   *  "preparing" to "live". */
  onConnected?: () => void;
}

export default function LiveStreamVideo({ wsUrl, token, mode, onConnected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Hold tracks across re-renders so we can re-attach if the videoRef changes
  // (StrictMode double-effects, conditional parent renders, etc.).
  const tracksRef = useRef<Array<LocalTrack | RemoteTrack>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    let cancelled = false;

    function attachVideoTrack(track: LocalTrack | RemoteTrack) {
      tracksRef.current.push(track);
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    }

    async function connect() {
      try {
        // Subscribe to track events BEFORE connecting so we don't race the
        // first published track from a fast host. Viewer-only — host
        // publishes its own tracks below.
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

        await room.connect(wsUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        if (mode === 'host') {
          // This call triggers the browser's camera + mic permission prompt.
          // If the user denies, it rejects with a NotAllowedError.
          const tracks = await createLocalTracks({ audio: true, video: true });
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            attachVideoTrack(track);
          }
        }

        onConnected?.();
      } catch (err) {
        const e = err as Error;
        console.error('[LiveStreamVideo] connect failed', e);
        if (cancelled) return;
        // Surface common errors to the user so they aren't staring at a
        // black screen wondering what happened.
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
      // Detach the tracks before disconnecting so the video tag doesn't
      // freeze on the last frame.
      for (const track of tracksRef.current) {
        try { track.detach(); } catch { /* ignore */ }
      }
      tracksRef.current = [];
      room.disconnect();
    };
  }, [wsUrl, token, mode, onConnected]);

  // Re-attach any pending video track when the videoRef becomes available.
  // Handles the race where the video element isn't mounted yet at connect time.
  useEffect(() => {
    if (!videoRef.current) return;
    const videoEl = videoRef.current;
    for (const track of tracksRef.current) {
      if (track.kind === Track.Kind.Video) {
        try { track.attach(videoEl); } catch { /* track may have been detached */ }
      }
    }
  });

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#000' }}>
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        playsInline
        muted={mode === 'host'} // host doesn't hear themselves
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
      {!error && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
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
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fff' }} />
          Live
        </Box>
      )}
    </Box>
  );
}
