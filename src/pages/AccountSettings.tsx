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
  Chip,
  Avatar,
} from '@mui/material';
import {
  Person,
  Lock,
  Notifications,
  Settings,
  Payment,
  LocalShipping,
} from '@mui/icons-material';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../hooks/useAuth';
import ProfileTab from '../components/common/ProfileTab';
import PreferencesSettingsTab from '../components/common/PreferencesSettingsTab';
import AccountTab from '../components/common/AccountTab';
import NotificationsTab from '../components/common/NotificationsTab';
import PaymentsTab from '../components/common/PaymentsTab';
import AddressesTab from '../components/common/AddressesTab';

type TabType = 'profile' | 'preferences' | 'notifications' | 'account' | 'payments' | 'addresses';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

const sidebarItems: SidebarItem[] = [
  { id: 'profile', label: 'Profile', icon: <Person />, section: 'General' },
  { id: 'preferences', label: 'Privacy Settings', icon: <Settings />, section: 'General' },
  { id: 'notifications', label: 'Notifications', icon: <Notifications />, section: 'General' },
  { id: 'account', label: 'Account', icon: <Lock />, section: 'General' },
  { id: 'payments', label: 'Payment Methods', icon: <Payment />, section: 'Billing' },
  { id: 'addresses', label: 'Shipping Addresses', icon: <LocalShipping />, section: 'Billing' },
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
      case 'payments':
        return <PaymentsTab />;
      case 'addresses':
        return <AddressesTab />;
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
              onClick={() => navigate(`/@${user?.username}`)}
            >
              View Profile
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Sections */}
      <Box sx={{ flex: 1, py: 2 }}>
        {/* General Section */}
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ px: 3, mb: 1, display: 'block' }}
        >
          General
        </Typography>
        <List sx={{ px: 1 }}>
          {sidebarItems.filter(item => item.section === 'General').map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
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

        {/* Billing Section */}
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ px: 3, mb: 1, mt: 3, display: 'block' }}
        >
          Billing
        </Typography>
        <List sx={{ px: 1 }}>
          {sidebarItems.filter(item => item.section === 'Billing').map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
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
    </Box>
  );

  return (
    <AppShell>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Mobile: horizontal scroll chips for settings tabs */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 2,
              mb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {sidebarItems.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                icon={item.icon as React.ReactElement}
                onClick={() => handleTabChange(item.id)}
                color={activeTab === item.id ? 'primary' : 'default'}
                variant={activeTab === item.id ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 200px)' }}>
          {/* Desktop sidebar */}
          {!isMobile && (
            <Paper
              elevation={2}
              sx={{
                width: 280,
                height: 'fit-content',
                position: 'sticky',
                top: 24,
              }}
            >
              {sidebarContent}
            </Paper>
          )}

          {/* Main content area */}
          <Box sx={{ flex: 1 }}>
            {renderTabContent()}
          </Box>
        </Box>
      </Container>
    </AppShell>
  );
}
