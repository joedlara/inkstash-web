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
import PlaceholderPanel from '../components/creatorHub/panels/PlaceholderPanel';
import { useAuth } from '../hooks/useAuth';
import { useSuppressMobileNav } from '../components/layout/MobileNavContext';
import { inkstashColors } from '../theme/inkstashTokens';

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
  // TODO(go-live): wire to the GoLiveComposer modal when that ships.
  const handleGoLive = () => {
    console.info('[CreatorHub] Go Live composer not built yet');
  };

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
        onCreateShow={handleGoLive}
        onOpenSettings={() => setTab('settings')}
        notificationCount={0}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '76px 1fr' }}>
        <HubRail active={tab} onChange={setTab} streamLive={false} />
        <Box component="main" sx={{ minWidth: 0, minHeight: 'calc(100vh - 60px)' }}>
          <Box sx={{ p: { xs: 3, md: '28px 34px 60px' }, maxWidth: 1240 }}>
            {renderPanel(tab, handleGoLive)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function renderPanel(tab: HubTabId, onGoLive: () => void) {
  switch (tab) {
    case 'home':      return <OverviewPanel onGoLive={onGoLive} />;
    case 'stream':    return <PlaceholderPanel eyebrow="Broadcast" title="Stream" sub="Schedule shows, run live, manage the queue." />;
    case 'analytics': return <PlaceholderPanel eyebrow="Insights"  title="Analytics" sub="Revenue, orders, viewers, follower growth." />;
    case 'listed':    return <PlaceholderPanel eyebrow="Inventory" title="Listed Items" sub="Everything you have on the marketplace." />;
    case 'community': return <PlaceholderPanel eyebrow="Audience"  title="Community" sub="Followers, top fans, replies to messages." />;
    case 'money':     return <PlaceholderPanel eyebrow="Earnings"  title="Monetization" sub="Available balance, payouts, fees." />;
    case 'shipping':  return <PlaceholderPanel eyebrow="Fulfill"   title="Shipping" sub="Generate labels and track orders out the door." />;
    case 'receipts':  return <PlaceholderPanel eyebrow="History"   title="Receipts" sub="Payouts, marketplace sales, fee breakdowns." />;
    case 'settings':  return <PlaceholderPanel eyebrow="Account"   title="Settings" sub="Profile, payment, brand kit, notifications." />;
  }
}
