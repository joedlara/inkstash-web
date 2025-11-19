import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Bookmark,
  Favorite,
  Gavel,
  History,
  Settings,
  Dashboard,
  Menu as MenuIcon,
} from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { useAuth } from '../hooks/useAuth';
import SavedCollectiblesTab from '../components/mystash/SavedCollectiblesTab';
import LikedCollectiblesTab from '../components/mystash/LikedCollectiblesTab';
import CurrentBidsTab from '../components/mystash/CurrentBidsTab';
import PurchaseHistoryTab from '../components/mystash/PurchaseHistoryTab';
import PreferencesTab from '../components/mystash/PreferencesTab';
import DashboardTab from '../components/mystash/DashboardTab';

type TabType = 'dashboard' | 'saved' | 'liked' | 'bids' | 'history' | 'preferences';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Summary', icon: <Dashboard /> },
  { id: 'saved', label: 'Saved Collectibles', icon: <Bookmark /> },
  { id: 'liked', label: 'Liked Collectibles', icon: <Favorite /> },
  { id: 'bids', label: 'Current Bids', icon: <Gavel /> },
  { id: 'history', label: 'Purchase History', icon: <History /> },
  { id: 'preferences', label: 'Preferences', icon: <Settings /> },
];

export default function MyStash() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'dashboard'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && sidebarItems.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'saved':
        return <SavedCollectiblesTab />;
      case 'liked':
        return <LikedCollectiblesTab />;
      case 'bids':
        return <CurrentBidsTab />;
      case 'history':
        return <PurchaseHistoryTab />;
      case 'preferences':
        return <PreferencesTab />;
      default:
        return <DashboardTab />;
    }
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight="bold" color="primary">
          My Stash
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {user?.username || 'User'}
        </Typography>
      </Box>
      <List sx={{ flex: 1, py: 2 }}>
        {sidebarItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.5 }}>
            <ListItemButton
              selected={activeTab === item.id}
              onClick={() => handleTabChange(item.id)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: activeTab === item.id ? 'white' : 'text.secondary',
                  minWidth: 40,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: activeTab === item.id ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <DashboardHeader />

      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            top: 64,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {sidebarItems.find(item => item.id === activeTab)?.label || 'My Stash'}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Container maxWidth="xl" sx={{ py: 4, mt: isMobile ? 16 : 10 }}>
        <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 150px)' }}>
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Paper
              elevation={2}
              sx={{
                width: 280,
                height: 'fit-content',
                position: 'sticky',
                top: 100,
              }}
            >
              {sidebarContent}
            </Paper>
          )}

          {/* Mobile Drawer */}
          {isMobile && (
            <Drawer
              variant="temporary"
              anchor="left"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile.
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  width: 280,
                  boxSizing: 'border-box',
                },
              }}
            >
              {sidebarContent}
            </Drawer>
          )}

          {/* Main Content Area */}
          <Box sx={{ flex: 1 }}>
            {renderTabContent()}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
