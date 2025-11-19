import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import { Home as HomeIcon, People } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

type TabType = 'for-you' | 'following';

interface SidebarItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  { id: 'for-you', label: 'For You', icon: <HomeIcon /> },
  { id: 'following', label: 'Following', icon: <People /> },
];

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('for-you');

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
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
              onClick={() => navigate('/settings?tab=profile')}
            >
              View Profile
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Feed Section */}
      <Box sx={{ flex: 1, py: 2 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ px: 3, mb: 1, display: 'block' }}
        >
          Feed
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
    <Paper
      elevation={2}
      sx={{
        position: 'fixed',
        left: '3.75rem',
        top: '100px',
        width: 280,
        height: 'fit-content',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        display: { xs: 'none', md: 'block' },
      }}
    >
      {sidebarContent}
    </Paper>
  );
}
