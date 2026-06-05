// src/pages/CreatorHub.tsx
//
// /seller-dashboard — the Creator Hub. Completely separate shell from
// the buyer-side AppShell: its own top bar, its own icon rail, no
// global sidebar / topnav.
//
// Tab state is local for now (matches the prototype). A future
// follow-up can promote tab to a URL search param for deep linking.

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HubTopBar from '../components/creatorHub/HubTopBar';
import HubRail, { type HubTabId } from '../components/creatorHub/HubRail';
import OverviewPanel from '../components/creatorHub/panels/OverviewPanel';
import ShowsPanel from '../components/creatorHub/panels/ShowsPanel';
import LiveControlPanel from '../components/creatorHub/panels/LiveControlPanel';
import PlaceholderPanel from '../components/creatorHub/panels/PlaceholderPanel';
import GoLiveComposer from '../components/creatorHub/composer/GoLiveComposer';
import type { ComposerMode } from '../components/creatorHub/composer/types';
import { useAuth } from '../hooks/useAuth';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function CreatorHub() {
  // The hub has its own chrome; suppress the buyer-side mobile nav bar
  // so the surface is fully ours on phones / small screens.
  useSuppressMobileNav();

  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Active sellers only. Anyone else gets bounced to /sell where they
  // can start Stripe Connect.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/'); return; }
    if (user.seller_status !== 'active') { navigate('/sell'); return; }
  }, [user, loading, navigate]);

  const [tab, setTab] = useState<HubTabId>('home');
  const [streamSub, setStreamSub] = useState<'shows' | 'live'>('shows');
  const [composer, setComposer] = useState<ComposerMode | null>(null);

  const openLiveNow = () => setComposer('live');
  const openSchedule = () => setComposer('schedule');
  const handleGoLive = openLiveNow;

  function handlePublished(_livestreamId: string, mode: ComposerMode) {
    if (mode === 'live') {
      // Land on Live Control so the producer can immediately start
      // pushing items to the block.
      setTab('stream');
      setStreamSub('live');
    } else {
      // Scheduled — drop back to Shows so the new entry appears in
      // the Upcoming tab.
      setTab('stream');
      setStreamSub('shows');
    }
  }

  if (loading || !user) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: inkstashColors.bg }}>
        <CircularProgress sx={{ color: inkstashColors.brand }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: inkstashColors.bg, color: inkstashColors.ink }}>
      <HubTopBar
        onCreateShow={openSchedule}
        onOpenSettings={() => setTab('settings')}
        notificationCount={0}
      />
      <HubRail active={tab} onChange={setTab} streamLive={false} />
      {/* Main offsets pl: 76px so the page content sits to the right of the
          fixed rail. The whole main area is what scrolls. */}
      <Box
        component="main"
        sx={{
          pl: '76px',
          minWidth: 0,
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        <Box sx={{ p: { xs: 3, md: '28px 34px 60px' }, maxWidth: 1240 }}>
          {renderPanel({ tab, streamSub, setStreamSub, openLiveNow, openSchedule })}
        </Box>
      </Box>

      <GoLiveComposer
        open={composer !== null}
        mode={composer ?? 'live'}
        onClose={() => setComposer(null)}
        onPublished={handlePublished}
      />
    </Box>
  );
}

function renderPanel({
  tab, streamSub, setStreamSub, openLiveNow, openSchedule,
}: {
  tab: HubTabId;
  streamSub: 'shows' | 'live';
  setStreamSub: (s: 'shows' | 'live') => void;
  openLiveNow: () => void;
  openSchedule: () => void;
}) {
  switch (tab) {
    case 'home':      return <OverviewPanel onGoLive={openLiveNow} />;
    case 'stream':    return (
      <StreamTab
        sub={streamSub}
        onSubChange={setStreamSub}
        openLiveNow={openLiveNow}
        openSchedule={openSchedule}
      />
    );
    case 'analytics': return <PlaceholderPanel eyebrow="Insights"  title="Analytics" sub="Revenue, orders, viewers, follower growth." />;
    case 'listed':    return <PlaceholderPanel eyebrow="Inventory" title="Listed Items" sub="Everything you have on the marketplace." />;
    case 'community': return <PlaceholderPanel eyebrow="Audience"  title="Community" sub="Followers, top fans, replies to messages." />;
    case 'money':     return <PlaceholderPanel eyebrow="Earnings"  title="Monetization" sub="Available balance, payouts, fees." />;
    case 'shipping':  return <PlaceholderPanel eyebrow="Fulfill"   title="Shipping" sub="Generate labels and track orders out the door." />;
    case 'receipts':  return <PlaceholderPanel eyebrow="History"   title="Receipts" sub="Payouts, marketplace sales, fee breakdowns." />;
    case 'settings':  return <PlaceholderPanel eyebrow="Account"   title="Settings" sub="Profile, payment, brand kit, notifications." />;
  }
}

// Thin wrapper around the two Stream sub-tabs (Shows / Live Control).
// Sub-tab strip lives in the panel chrome itself so its layout reads
// the same as the rest of the hub.
function StreamTab({
  sub, onSubChange, openLiveNow, openSchedule,
}: {
  sub: 'shows' | 'live';
  onSubChange: (s: 'shows' | 'live') => void;
  openLiveNow: () => void;
  openSchedule: () => void;
}) {
  return (
    <Box>
      <Box sx={{
        display: 'flex',
        gap: 3.25,
        borderBottom: `1px solid ${inkstashColors.border}`,
        mb: 2.5,
      }}>
        <SubTab label="Shows" active={sub === 'shows'} onClick={() => onSubChange('shows')} />
        <SubTab label="Live Control" active={sub === 'live'} onClick={() => onSubChange('live')} />
      </Box>
      {sub === 'shows'
        ? <ShowsPanel onSchedule={openSchedule} onGoLive={openLiveNow} />
        : <LiveControlPanel onGoLive={openLiveNow} />}
    </Box>
  );
}

function SubTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        position: 'relative',
        background: 'none',
        border: 0,
        cursor: 'pointer',
        fontFamily: inkstashFonts.ui,
        fontWeight: 600,
        fontSize: 14,
        color: active ? inkstashColors.ink : inkstashColors.muted,
        pb: 1.4,
        transition: 'color 120ms ease',
        '&:hover': { color: inkstashColors.ink2 },
        '&::after': active ? {
          content: '""',
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          height: 2,
          bgcolor: inkstashColors.brand,
        } : undefined,
      }}
    >
      {label}
    </Box>
  );
}
