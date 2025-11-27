import { ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import MobileBottomNav from '../home/MobileBottomNav';

interface AppLayoutProps {
  children: ReactNode;
  showMobileNav?: boolean;
}

export default function AppLayout({ children, showMobileNav = true }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Main content */}
      <Box
        sx={{
          pb: isMobile && showMobileNav ? '80px' : 0, // Add padding for mobile nav
        }}
      >
        {children}
      </Box>

      {/* Mobile Bottom Navigation - only show on mobile */}
      {isMobile && showMobileNav && <MobileBottomNav />}
    </Box>
  );
}
