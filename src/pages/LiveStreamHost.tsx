// src/pages/LiveStreamHost.tsx
//
// /live/start — two-phase. Pre-live: title input + camera preview. Live:
// camera + side panel with chat + end button. Active sellers only; redirects
// non-sellers to the seller dashboard.
//
// Refresh recovery: if the host already has a live stream when they hit this
// page (refreshed mid-stream, tab crash, etc.) we need to re-issue a publish
// token and resume. We can't re-use the previous token because LiveKit tokens
// are scoped to a participant identity that we've already disconnected from;
// instead we end the orphaned stream and prompt the host to start a fresh one
// with a new title. This matches user mental model ("my stream broke; I'll
// click Go Live again") better than silently resuming a possibly-stale row.

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
import { supabase } from '../api/supabase/supabaseClient';
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
  const [orphanCheck, setOrphanCheck] = useState<'checking' | 'clean' | 'cleaned'>('checking');

  const isActiveSeller = (user as { seller_status?: string } | null)?.seller_status === 'active';
  useEffect(() => {
    if (user && !isActiveSeller) navigate('/seller-dashboard');
  }, [user, isActiveSeller, navigate]);

  // Refresh recovery: if the user already has a status='live' stream, end it.
  // We can't resume because the original LiveKit token + participant identity
  // are gone with the previous tab. Cleaner to wipe + restart than to fake a
  // session that's actually dead.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from('livestreams')
        .select('id')
        .eq('host_user_id', user.id)
        .eq('status', 'live')
        .maybeSingle();
      if (cancelled) return;
      if (existing) {
        try {
          await livestreamsAPI.end((existing as { id: string }).id);
        } catch (err) {
          console.warn('[LiveStreamHost] orphan end failed (continuing)', err);
        }
        if (!cancelled) setOrphanCheck('cleaned');
      } else {
        if (!cancelled) setOrphanCheck('clean');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

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

          {orphanCheck === 'cleaned' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Your previous stream was still marked live (likely a tab refresh). We've closed it — start a new one below.
            </Alert>
          )}

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
            disabled={!title.trim() || starting || orphanCheck === 'checking'}
            sx={{
              bgcolor: inkstashColors.live, color: '#fff', fontWeight: 800,
              py: 1.4, textTransform: 'uppercase', letterSpacing: '0.06em',
              '&:hover': { bgcolor: '#B91C1C' },
            }}
          >
            {starting ? <CircularProgress size={20} color="inherit" /> : 'Start broadcasting'}
          </Button>
          {orphanCheck === 'checking' && (
            <Typography sx={{ mt: 1.5, fontSize: 12, color: inkstashColors.muted, textAlign: 'center' }}>
              Checking for previous session…
            </Typography>
          )}
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
