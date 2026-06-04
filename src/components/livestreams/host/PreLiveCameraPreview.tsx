// src/components/livestreams/host/PreLiveCameraPreview.tsx
//
// Live camera preview for the pre-live page. Uses getUserMedia directly
// (no LiveKit) so we don't burn a publishing session just to check framing.
// Stops the tracks on unmount so the browser camera light goes off when
// the host leaves the setup page.
//
// Default facing mode is 'environment' (back camera) to match the actual
// live stream default. Flip button toggles between front and back.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { FlipCameraIos } from '@mui/icons-material';
import { inkstashColors, inkstashRadii } from '../../../theme/inkstashTokens';

type Facing = 'user' | 'environment';

/** Imperative handle parents can call to free the camera before triggering
 *  another getUserMedia (LiveKit publish, page nav). iOS Safari fails the
 *  second concurrent grab with NotReadableError, so the preview MUST
 *  release first. */
export interface PreLiveCameraPreviewHandle {
  releaseCamera: () => void;
}

const PreLiveCameraPreview = forwardRef<PreLiveCameraPreviewHandle>(function PreLiveCameraPreview(_, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [error, setError] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [released, setReleased] = useState(false);

  // Expose a release method so LiveStreamHost can free the camera right
  // before kicking off the LiveKit publish.
  useImperativeHandle(ref, () => ({
    releaseCamera() {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setReleased(true);
    },
  }), []);

  useEffect(() => {
    // If a parent has released us, don't re-acquire the camera on
    // re-renders. The preview is effectively done.
    if (released) return;
    let cancelled = false;

    async function start() {
      try {
        // Stop any previous stream before requesting a new one (happens on
        // facing-mode swap). Without this, Safari sometimes refuses the
        // second getUserMedia call with "Could not start video source".
        if (streamRef.current) {
          for (const t of streamRef.current.getTracks()) t.stop();
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          // No audio in the preview — keeps the mic light off until the
          // host actually goes live.
          audio: false,
        });
        if (cancelled) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        if (cancelled) return;
        const e = err as Error;
        if (e.name === 'NotAllowedError') {
          setError('Camera access denied. Reload and click Allow when prompted.');
        } else if (e.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (e.name === 'NotReadableError') {
          setError('Camera is in use by another tab or app.');
        } else {
          setError(`Camera preview failed: ${e.message}`);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
    };
  }, [facing, released]);

  async function handleFlip() {
    if (flipping) return;
    setFlipping(true);
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'));
    // Slight debounce so rapid taps don't queue up getUserMedia calls.
    setTimeout(() => setFlipping(false), 400);
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '9 / 16',
        maxHeight: 420,
        bgcolor: '#0A0A0A',
        borderRadius: inkstashRadii.lg,
        overflow: 'hidden',
        border: `1px solid ${inkstashColors.border}`,
      }}
    >
      <Box
        component="video"
        ref={videoRef}
        autoPlay
        playsInline
        muted
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {error && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.78)',
            p: 3,
          }}
        >
          <Typography
            sx={{
              color: '#fff',
              textAlign: 'center',
              fontFamily: inkstashFonts.ui,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            {error}
          </Typography>
        </Box>
      )}
      {!error && !released && (
        <IconButton
          onClick={handleFlip}
          disabled={flipping}
          aria-label="Flip camera"
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            bgcolor: 'rgba(10,10,10,0.65)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(10,10,10,0.85)' },
            '&:active': { transform: 'scale(0.96)' },
          }}
        >
          <FlipCameraIos />
        </IconButton>
      )}
    </Box>
  );
});

export default PreLiveCameraPreview;
