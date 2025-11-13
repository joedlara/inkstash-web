import { useState } from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardSidebar() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        left: '3.75rem',
        top: '70px',
        paddingRight:'.5rem',
        maxWidth: 380,
        height: 'calc(100vh - 70px)',
        zIndex: 10,
        overflowY: 'auto',
        display: 'block',
        '@media (max-width: 768px)': {
          display: 'none',
        },
      }}
    >
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 4,
            lineHeight: 1.2,
            fontSize: { xs: '1.75rem', md: '2rem' },
          }}
        >
          Hi {user?.username || 'there'}!
        </Typography>

        <Stack spacing={0.5}>
          <Button
            onClick={() => setActiveTab('for-you')}
            sx={{
              justifyContent: 'flex-start',
              px: 2,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: activeTab === 'for-you' ? 'primary.main' : 'text.secondary',
              bgcolor: activeTab === 'for-you' ? 'rgba(0, 120, 255, 0.08)' : 'transparent',
              '&:hover': {
                bgcolor: activeTab === 'for-you' ? 'rgba(0, 120, 255, 0.12)' : 'action.hover',
              },
            }}
          >
            For You
          </Button>
          <Button
            onClick={() => setActiveTab('following')}
            sx={{
              justifyContent: 'flex-start',
              px: 2,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              color: activeTab === 'following' ? 'primary.main' : 'text.secondary',
              bgcolor: activeTab === 'following' ? 'rgba(0, 120, 255, 0.08)' : 'transparent',
              '&:hover': {
                bgcolor: activeTab === 'following' ? 'rgba(0, 120, 255, 0.12)' : 'action.hover',
              },
            }}
          >
            Following
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
