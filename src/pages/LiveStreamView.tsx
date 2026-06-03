// src/pages/LiveStreamView.tsx
//
// /live/:id — viewer surface. Mobile-first portrait video full-bleed with
// chat docked at the bottom, host pill + viewer count up top, right-rail
// action stack floating on the side. Desktop centers the same layout at
// max-width 480px (phone aspect) which matches the streamer's vertical
// camera.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { Close } from '@mui/icons-material';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import LiveStreamChat from '../components/livestreams/LiveStreamChat';
import HostPill from '../components/livestreams/HostPill';
import ViewerCountBadge from '../components/livestreams/ViewerCountBadge';
import RightRailActions from '../components/livestreams/RightRailActions';
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
  const [viewerCount, setViewerCount] = useState(1);

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

  // Auto-eject viewers when the host ends the stream.
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

  // Stable ref so LiveStreamVideo's useEffect doesn't re-run on every render.
  const handleParticipantCount = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

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
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: ['100vh', '100lvh'],
        bgcolor: '#000',
        overflow: 'hidden',
        touchAction: 'manipulation',
      }}
    >
      <Box
        sx={{
          position: 'absolute', inset: 0,
          maxWidth: { xs: '100%', md: 480 },
          mx: 'auto',
        }}
      >
        <LiveStreamVideo
          wsUrl={joinData.wsUrl}
          token={joinData.token}
          mode="viewer"
          onParticipantCountChange={handleParticipantCount}
        />

        {/* Top header row: host pill on the left, viewer count + close on the right.
            Both clusters padded by safe-area-inset-top so they clear the dynamic island. */}
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            zIndex: 3,
            pointerEvents: 'none',
          }}
        >
          <Box sx={{ pointerEvents: 'auto' }}>
            <HostPill
              username={stream.host?.username ?? null}
              avatarUrl={stream.host?.avatar_url}
            />
          </Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
            <ViewerCountBadge count={viewerCount} />
            <IconButton
              onClick={() => navigate('/live')}
              size="small"
              sx={{
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Right-rail action stack (Share / Wallet / Shop / More) */}
        <RightRailActions
          streamTitle={stream.title}
          streamUrl={typeof window !== 'undefined' ? window.location.href : ''}
        />

        {/* Winner banner slot — empty in this pass. When L4 raffles ship the
            celebration banner ("Giveaway Winner 🎉 @user") slots in here
            without forcing a layout reshuffle. */}
        <Box
          id="livestream-winner-slot"
          sx={{
            position: 'absolute',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 280px)',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

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
