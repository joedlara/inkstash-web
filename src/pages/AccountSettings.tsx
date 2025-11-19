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
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import {
  Person,
  Lock,
  Notifications,
  Settings,
  Menu as MenuIcon,
} from '@mui/icons-material';
import DashboardHeader from '../components/home/DashboardHeader';
import { useAuth } from '../hooks/useAuth';
import ProfileTab from '../components/common/ProfileTab';
import PreferencesSettingsTab from '../components/common/PreferencesSettingsTab';
import AccountTab from '../components/common/AccountTab';
import NotificationsTab from '../components/common/NotificationsTab';

type TabType = 'profile' | 'preferences' | 'notifications' | 'account';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'profile', label: 'Profile', icon: <Person />, section: 'General' },
  { id: 'preferences', label: 'Preferences', icon: <Settings />, section: 'General' },
  { id: 'notifications', label: 'Notifications', icon: <Notifications />, section: 'General' },
  { id: 'account', label: 'Account', icon: <Lock />, section: 'General' },
];

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'profile'
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
      case 'profile':
        return <ProfileTab />;
      case 'preferences':
        return <PreferencesSettingsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'account':
        return <AccountTab />;
      default:
        return <ProfileTab />;
    }
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* User Profile Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar
            src={user?.avatar_url}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.main',
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              {user?.username || 'User'}
            </Typography>
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              View Profile
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* General Section */}
      <Box sx={{ flex: 1, py: 2 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ px: 3, mb: 1, display: 'block' }}
        >
          General
        </Typography>
        <List sx={{ px: 1 }}>
          {sidebarItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={activeTab === item.id}
                onClick={() => handleTabChange(item.id)}
                sx={{
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: '#2e2e2e',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#3e3e3e',
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
              {sidebarItems.find(item => item.id === activeTab)?.label || 'Settings'}
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
                keepMounted: true,
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
