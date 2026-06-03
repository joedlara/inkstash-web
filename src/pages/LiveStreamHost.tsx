// src/pages/LiveStreamHost.tsx
//
// /live/start — two-phase. Pre-live: title input + camera preview. Live:
// camera + side panel with chat + end button. Active sellers only; redirects
// non-sellers to the seller dashboard.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, CircularProgress, Alert,
} from '@mui/material';
import AppShell from '../components/layout/AppShell';
import LiveStreamVideo from '../components/livestreams/LiveStreamVideo';
import HostControlPanel from '../components/livestreams/HostControlPanel';
import { livestreamsAPI } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function LiveStreamHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<'pre' | 'live'>('pre');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [livekit, setLivekit] = useState<{ token: string; wsUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const isActiveSeller = (user as { seller_status?: string } | null)?.seller_status === 'active';
  useEffect(() => {
    if (user && !isActiveSeller) navigate('/seller-dashboard');
  }, [user, isActiveSeller, navigate]);

  async function handleGoLive() {
    setStarting(true);
    setError(null);
    try {
      const res = await livestreamsAPI.start({ title: title.trim() });
      setStreamId(res.livestream_id);
      setLivekit({ token: res.livekit_token, wsUrl: res.livekit_ws_url });
      setPhase('live');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!streamId) return;
    await livestreamsAPI.end(streamId);
    navigate('/live');
  }

  async function handleBan(userId: string) {
    if (!streamId) return;
    await livestreamsAPI.banChatter(streamId, userId);
  }

  if (!user) return null;

  if (phase === 'pre') {
    return (
      <AppShell>
        <Box sx={{ maxWidth: 480, mx: 'auto', p: 3 }}>
          <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 32, mb: 1 }}>
            Go Live
          </Typography>
          <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
            Give your stream a title, then start broadcasting.
          </Typography>

          <TextField
            fullWidth
            label="Stream title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 120 }}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGoLive}
            disabled={!title.trim() || starting}
            sx={{
              bgcolor: inkstashColors.live, color: '#fff', fontWeight: 800,
              py: 1.4, textTransform: 'uppercase', letterSpacing: '0.06em',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {starting ? <CircularProgress size={20} color="inherit" /> : 'Start broadcasting'}
          </Button>
        </Box>
      </AppShell>
    );
  }

  if (!streamId || !livekit) return null;
  return (
    <Box sx={{ position: 'fixed', inset: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 360px' } }}>
      <LiveStreamVideo wsUrl={livekit.wsUrl} token={livekit.token} mode="host" />
      <HostControlPanel
        livestreamId={streamId}
        initialChat={[]}
        onEnd={handleEnd}
        onBanUser={handleBan}
      />
    </Box>
  );
}
