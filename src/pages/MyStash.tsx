import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Stack } from '@mui/material';
import { LayoutGrid, Bookmark, Heart, Gavel, History, Settings, Vault } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAuth';
import SavedCollectiblesTab from '../components/mystash/SavedCollectiblesTab';
import LikedCollectiblesTab from '../components/mystash/LikedCollectiblesTab';
import CurrentBidsTab from '../components/mystash/CurrentBidsTab';
import PurchaseHistoryTab from '../components/mystash/PurchaseHistoryTab';
import PreferencesTab from '../components/mystash/PreferencesTab';
import DashboardTab from '../components/mystash/DashboardTab';
import InventoryTab from '../components/mystash/InventoryTab';
import RubiesTab from '../components/mystash/RubiesTab';
import RubyIcon from '../components/ui/RubyIcon';
import { inkstashColors, inkstashFonts, inkstashShadows } from '../theme/inkstashTokens';
import type { LucideIcon } from 'lucide-react';

type TabType = 'dashboard' | 'inventory' | 'rubies' | 'saved' | 'liked' | 'bids' | 'history' | 'preferences';

interface TabItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { id: 'dashboard',   label: 'Summary',             icon: LayoutGrid },
  { id: 'inventory',   label: 'Inventory',           icon: Vault },
  { id: 'rubies',      label: 'Rubies',              icon: LayoutGrid }, // overridden below
  { id: 'saved',       label: 'Saved',               icon: Bookmark },
  { id: 'liked',       label: 'Liked',               icon: Heart },
  { id: 'bids',        label: 'Bids',                icon: Gavel },
  { id: 'history',     label: 'Purchases',           icon: History },
  { id: 'preferences', label: 'Preferences',         icon: Settings },
];

export default function MyStash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'dashboard'
  );

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && TABS.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <DashboardTab />;
      case 'inventory':   return <InventoryTab />;
      case 'rubies':      return <RubiesTab />;
      case 'saved':       return <SavedCollectiblesTab />;
      case 'liked':       return <LikedCollectiblesTab />;
      case 'bids':        return <CurrentBidsTab />;
      case 'history':     return <PurchaseHistoryTab />;
      case 'preferences': return <PreferencesTab />;
      default:            return <DashboardTab />;
    }
  };

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ pb: 8 }}>
        <Box sx={{ mb: 3.5 }}>
          <Box component="h1" sx={{
            fontFamily: inkstashFonts.display, fontWeight: 800,
            fontSize: 'clamp(28px, 4vw, 44px)',
            letterSpacing: '0.005em', m: 0, textTransform: 'uppercase', lineHeight: 1,
            color: inkstashColors.ink,
          }}>
            My Stash
          </Box>
          <Box sx={{
            color: inkstashColors.muted, fontSize: 13.5, mt: 0.75, lineHeight: 1.5,
          }}>
            {user?.username ? `@${user.username}` : 'Your collection'} — saved, liked, bid, owned, and tuned.
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', gap: 0.5, padding: 0.5,
          bgcolor: inkstashColors.bgSunken,
          borderRadius: 999,
          mb: 4,
          overflowX: 'auto',
          width: 'fit-content',
          maxWidth: '100%',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
            {TABS.map(t => {
              const active = t.id === activeTab;
              const Icon = t.icon;
              return (
                <Box
                  key={t.id}
                  component="button"
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.85,
                    padding: '8px 16px',
                    borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 500, fontFamily: inkstashFonts.ui,
                    bgcolor: active ? inkstashColors.bgElev : 'transparent',
                    color: active ? inkstashColors.ink : inkstashColors.ink2,
                    boxShadow: active ? inkstashShadows.sm : 'none',
                    transition: 'all 140ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.id === 'rubies' ? <RubyIcon size={14} /> : <Icon size={14} />}
                  {t.label}
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box>
          {renderTabContent()}
        </Box>
      </Container>
    </AppShell>
  );
}
