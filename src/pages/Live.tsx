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
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

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
        {/* Page header — display title + lede. Design spec: align end,
            wrap on small screens. */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 2.5,
            mb: 4,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: '1 1 auto', minWidth: 240 }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: inkstashFonts.display,
                fontWeight: 900,
                fontSize: 'clamp(40px, 5vw, 60px)',
                color: inkstashColors.ink,
                letterSpacing: '-0.005em',
                lineHeight: 0.95,
                textTransform: 'uppercase',
                mb: 1,
              }}
            >
              Live Breaks
            </Typography>
            <Typography
              sx={{
                fontFamily: inkstashFonts.ui,
                fontSize: 15,
                color: inkstashColors.ink2,
                maxWidth: 440,
                lineHeight: 1.5,
              }}
            >
              Watch hosts open packs in real time, bid on what they pull, and tune into
              tonight's featured spotlight.
            </Typography>
          </Box>
          {isActiveSeller && (
            <Button
              variant="contained"
              onClick={() => navigate('/live/start')}
              sx={{
                bgcolor: inkstashColors.brand,
                color: '#fff',
                fontFamily: inkstashFonts.ui,
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
                fontFamily: inkstashFonts.ui,
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
              label="Live Now"
              sub="Jump into a stream and start bidding."
              streams={sections.live}
              emptyHint="No one is live right now. Scroll down for upcoming streams."
            />
            <LiveStreamSection
              label="Coming Up"
              sub="Set a reminder so you don't miss the drop."
              streams={sections.upcoming}
              scheduled
            />
            <LiveStreamSection
              label="Featured Streams"
              sub="Tonight's hand-picked spotlights."
              streams={sections.featured}
              dark
            />
          </>
        )}
      </Container>
    </AppShell>
  );
}
