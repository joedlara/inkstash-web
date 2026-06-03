// src/pages/Live.tsx
//
// /live — grid of currently live streams. Empty state nudges active sellers
// to go live. Rebuilt on the L1 schema (livestreams + livestream_chat +
// livestream_bans); the old prototype's fake demo data and legacy fixtures
// are gone.

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import LiveStreamGrid from '../components/livestreams/LiveStreamGrid';
import { livestreamsAPI, type Livestream } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function Live() {
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isActiveSeller = (user as { seller_status?: string } | null)?.seller_status === 'active';

  useEffect(() => {
    livestreamsAPI.listLive().then((s) => { setStreams(s); setLoading(false); });
  }, []);

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Watch + bid in real time
            </Typography>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: { xs: 32, md: 44 }, color: inkstashColors.ink, textTransform: 'uppercase', letterSpacing: '0.005em', lineHeight: 1 }}>
              Live
            </Typography>
          </Box>
          {isActiveSeller && (
            <Button
              variant="contained"
              onClick={() => navigate('/live/start')}
              sx={{
                bgcolor: inkstashColors.brand, color: '#fff', fontWeight: 800,
                px: 2.5, py: 1, textTransform: 'uppercase', fontFamily: inkstashFonts.ui,
                letterSpacing: '0.06em',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
              }}
            >
              Go live
            </Button>
          )}
        </Box>

        {loading && <Typography sx={{ color: inkstashColors.muted }}>Loading…</Typography>}

        {!loading && streams.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontFamily: inkstashFonts.display, fontWeight: 800, fontSize: 22, color: inkstashColors.ink, mb: 1 }}>
              Nobody is live right now
            </Typography>
            <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
              {isActiveSeller ? 'Be the first — click Go Live above.' : 'Check back soon.'}
            </Typography>
          </Box>
        )}

        {!loading && streams.length > 0 && <LiveStreamGrid streams={streams} />}
      </Container>
    </AppShell>
  );
}
