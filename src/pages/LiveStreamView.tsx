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
import { inkstashColors } from '../theme/inkstashTokens';

export default function LiveStreamView() {
  useSuppressMobileNav();
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

  return (
    <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#000', overflow: 'hidden' }}>
      <Box
        sx={{
          position: 'absolute', inset: 0,
          maxWidth: { xs: '100%', md: 480 },
          mx: 'auto',
        }}
      >
        <LiveStreamVideo wsUrl={joinData.wsUrl} token={joinData.token} mode="viewer" />

        {/* Host avatar pill, top-left (offset right of the live badge) */}
        <Box
          sx={{
            position: 'absolute', top: 12, left: 60,
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

        {/* Close button, top-right */}
        <IconButton
          onClick={() => navigate('/live')}
          sx={{
            position: 'absolute', top: 8, right: 8,
            color: '#fff', bgcolor: 'rgba(0,0,0,0.4)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            zIndex: 3,
          }}
        >
          <Close />
        </IconButton>

        {/* Chat overlay */}
        <LiveStreamChat
          livestreamId={stream.id}
          initialMessages={joinData.chat}
          isBanned={joinData.isBanned}
        />
      </Box>
    </Box>
  );
}
