// src/pages/LiveStreamView.tsx
//
// /live/:id — viewer surface. Mobile-first portrait video full-bleed with
// chat docked at the bottom. Desktop centers the same layout at max-width
// 480px (phone aspect) which matches the streamer's vertical camera.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, Avatar, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import { livestreamsAPI, type Livestream, type ChatMessage } from '../api/livestreams';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { useFullBleedBlackBackground } from '../components/livestreams/useFullBleedBlackBackground';
import { supabase } from '../api/supabase/supabaseClient';
import { inkstashColors } from '../theme/inkstashTokens';

export default function LiveStreamView() {
  useSuppressMobileNav();
  useFullBleedBlackBackground();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Livestream | null>(null);
  const [joinData, setJoinData] = useState<{ token: string; wsUrl: string; chat: ChatMessage[]; isBanned: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, j] = await Promise.all([
          livestreamsAPI.get(id),
          livestreamsAPI.join(id),
        ]);
        if (cancelled) return;
        if (!s) { setError('Stream not found.'); return; }
        setStream(s);
        setJoinData({
          token: j.livekit_token,
          wsUrl: j.livekit_ws_url,
          chat: j.recent_chat,
          isBanned: j.is_banned,
        });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Auto-eject viewers when the host ends the stream. Subscribes to the
  // livestreams row for UPDATEs; on status='ended' or 'aborted', navigates
  // back to /live so the viewer can pick another stream.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`livestream:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'livestreams', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as { status?: string };
          if (next.status === 'ended' || next.status === 'aborted') {
            navigate('/live', { replace: true });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, navigate]);

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!stream || !joinData) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  // Truly full-bleed: 100dvh + 100vw, video underneath ignores all safe-area.
  // Overlay controls (live badge, host pill, close button) and chat are
  // padded inward by env(safe-area-inset-*) so they clear the dynamic
  // island, notch, and Safari URL bar.
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        // 100lvh = largest viewport height: includes the area BEHIND the
        // iOS Safari URL bar so the camera extends all the way to the
        // bottom of the physical screen. Falls back to 100vh on browsers
        // without lvh support.
        height: ['100vh', '100lvh'],
        bgcolor: '#000',
        overflow: 'hidden',
        touchAction: 'manipulation', // disables double-tap-to-zoom
      }}
    >
      <Box
        sx={{
          position: 'absolute', inset: 0,
          maxWidth: { xs: '100%', md: 480 },
          mx: 'auto',
        }}
      >
        <LiveStreamVideo wsUrl={joinData.wsUrl} token={joinData.token} mode="viewer" />

        {/* Host avatar pill, top-left (offset right of the live badge).
            Pad down by safe-area so it clears the dynamic island. */}
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 60px)',
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: 'rgba(0,0,0,0.55)', px: 1.25, py: 0.5,
            borderRadius: 999, backdropFilter: 'blur(8px)',
            zIndex: 2,
          }}
        >
          <Avatar src={stream.host?.avatar_url ?? undefined} sx={{ width: 22, height: 22 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
            @{stream.host?.username ?? 'host'}
          </Typography>
        </Box>

        {/* Close button, top-right (safe-area padded) */}
        <IconButton
          onClick={() => navigate('/live')}
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
            color: '#fff', bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            zIndex: 3,
          }}
        >
          <Close />
        </IconButton>

        {/* Chat overlay (handles its own safe-area-inset-bottom) */}
        <LiveStreamChat
          livestreamId={stream.id}
          initialMessages={joinData.chat}
          isBanned={joinData.isBanned}
        />
      </Box>
    </Box>
  );
}
