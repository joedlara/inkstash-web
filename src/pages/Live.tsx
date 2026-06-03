// src/pages/Live.tsx
//
// /live — three horizontally scrolling sections:
//   - Live now (status='live')
//   - Coming up (status='preparing' with scheduled_start_at in the future)
//   - Shows with momentum (highest total_unique_viewers; editorial picks later)
//
// Auto-refreshes every 15s. Mobile-first single column; sections wrap fluidly.

import { useEffect, useState } from 'react';
import { Box, Container, Typography, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import LiveStreamSection from '../components/livestreams/LiveStreamSection';
import { livestreamsAPI, type LivestreamSections } from '../api/livestreams';
import { useAuth } from '../hooks/useAuth';
import { inkstashColors } from '../theme/inkstashTokens';

const EMPTY: LivestreamSections = { live: [], upcoming: [], featured: [] };

export default function Live() {
  const [sections, setSections] = useState<LivestreamSections>(EMPTY);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isActiveSeller = (user as { seller_status?: string } | null)?.seller_status === 'active';

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const s = await livestreamsAPI.listSections();
      if (!cancelled) {
        setSections(s);
        setLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const nothingAnywhere =
    !loading &&
    sections.live.length === 0 &&
    sections.upcoming.length === 0 &&
    sections.featured.length === 0;

  return (
    <AppShell>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* Page header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: inkstashColors.muted,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              Watch + bid in real time
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: { xs: 32, md: 44 },
                color: inkstashColors.ink,
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Live
            </Typography>
          </Box>
          {isActiveSeller && (
            <Button
              variant="contained"
              onClick={() => navigate('/live/start')}
              sx={{
                bgcolor: inkstashColors.brand,
                color: '#fff',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '-0.01em',
                textTransform: 'none',
                px: 2.5,
                py: 1,
                borderRadius: 999,
                boxShadow: '0 4px 12px rgba(161,35,44,0.3)',
                '&:hover': { bgcolor: inkstashColors.brandDeep },
              }}
            >
              Go live
            </Button>
          )}
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: inkstashColors.brand }} />
          </Box>
        )}

        {nothingAnywhere && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: 22,
                color: inkstashColors.ink,
                letterSpacing: '-0.02em',
                mb: 1,
              }}
            >
              Nobody is live right now
            </Typography>
            <Typography sx={{ color: inkstashColors.muted, fontSize: 14 }}>
              {isActiveSeller ? 'Be the first — click Go Live above.' : 'Check back soon.'}
            </Typography>
          </Box>
        )}

        {!loading && !nothingAnywhere && (
          <>
            <LiveStreamSection
              label="Live now"
              streams={sections.live}
              emptyHint="No one is live right now. Scroll down for upcoming streams."
            />
            <LiveStreamSection
              label="Coming up"
              streams={sections.upcoming}
              scheduled
            />
            <LiveStreamSection
              label="Featured streams"
              streams={sections.featured}
              dark
            />
          </>
        )}
      </Container>
    </AppShell>
  );
}
