// src/components/livestreams/LiveStreamVideo.tsx
//
// Wraps a LiveKit Room and renders the host's video track full-bleed.
// Two modes:
//   - host: publishes camera + mic to the room
//   - viewer: subscribe-only (audio + video)
//
// Cleanup on unmount: leave room, stop tracks. Critical to prevent zombie
// cameras (browser tab keeps streaming if we don't tear down properly).

import { useEffect, useRef } from 'react';
import { Room, Track, RoomEvent, createLocalTracks } from 'livekit-client';
import { Box } from '@mui/material';
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

  useEffect(() => {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    let cancelled = false;

    async function connect() {
      try {
        await room.connect(wsUrl, token);
        if (cancelled) {
          await room.disconnect();
          return;
        }

        if (mode === 'host') {
          const tracks = await createLocalTracks({ audio: true, video: true });
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            }
          }
        } else {
          // Viewer: subscribe to the host's published tracks as they arrive.
          room.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Video && videoRef.current) {
              track.attach(videoRef.current);
            } else if (track.kind === Track.Kind.Audio) {
              // Audio attaches to a hidden audio element; mute toggling
              // is handled at the player UI level (not in v1).
              const audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              track.attach(audioEl);
            }
          });
        }
        onConnected?.();
      } catch (err) {
        console.error('[LiveStreamVideo] connect failed', err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      room.disconnect();
    };
  }, [wsUrl, token, mode, onConnected]);

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
      {/* Live indicator pill */}
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
    </Box>
  );
}
