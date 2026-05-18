import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import TopNavBar from './TopNavBar';
import SideNav from './SideNav';
import { colors, easing, layout, fonts } from '../../theme/conceptCTokens';

const LS_KEY = 'sidenav.collapsed';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed(c => !c), []);

  const sideWidth = collapsed ? layout.sideWidthCollapsed : layout.sideWidthOpen;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: colors.bg, color: colors.ink, fontFamily: fonts.display }}>
      <TopNavBar onToggleSidebar={toggle} />
      <SideNav collapsed={collapsed} />
      <Box
        component="main"
        sx={{
          pt: `${layout.navHeight}px`,
          pl: { xs: 0, md: `${sideWidth}px` },
          transition: `padding-left 220ms ${easing.out}`,
          minHeight: '100dvh',
        }}
      >
        <Box sx={{ maxWidth: layout.contentMaxWidth, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 2.5, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
