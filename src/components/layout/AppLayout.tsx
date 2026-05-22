import { ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import MobileBottomNav from '../home/MobileBottomNav';
import { MobileNavProvider, useMobileNav } from './MobileNavContext';
import { RubyBalanceProvider } from '../../contexts/RubyBalanceContext';

interface AppLayoutProps {
  children: ReactNode;
  showMobileNav?: boolean;
}

function AppLayoutInner({ children, showMobileNav = true }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { hidden } = useMobileNav();
  const visible = isMobile && showMobileNav && !hidden;

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <Box sx={{ pb: visible ? '80px' : 0 }}>
        {children}
      </Box>
      {visible && <MobileBottomNav />}
    </Box>
  );
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <RubyBalanceProvider>
      <MobileNavProvider>
        <AppLayoutInner {...props} />
      </MobileNavProvider>
    </RubyBalanceProvider>
  );
}
