// src/components/layout/AppShell.tsx
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import AppSidebar from './AppSidebar';
import AppTopnav from './AppTopnav';
import { inkstashColors, inkstashFonts, inkstashLayout } from '../../theme/inkstashTokens';

const LS_KEY = 'inkstash.sidebar.collapsed';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(collapsed));
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed(c => !c), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sideWidth = collapsed ? inkstashLayout.sidebarWidthCollapsed : inkstashLayout.sidebarWidth;

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: inkstashColors.bg, color: inkstashColors.ink, fontFamily: inkstashFonts.ui }}>
      <AppSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapseToggle={toggleCollapse}
        onMobileClose={closeMobile}
      />
      {mobileOpen && (
        <Box
          onClick={closeMobile}
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed', inset: 0,
            bgcolor: 'rgba(22,17,14,0.4)',
            zIndex: 1099,
          }}
        />
      )}
      <Box
        sx={{
          pl: { xs: 0, md: `${sideWidth}px` },
          transition: 'padding-left 200ms ease',
          minHeight: '100dvh',
        }}
      >
        <AppTopnav onOpenMobileNav={openMobile} />
        <Box
          component="main"
          sx={{
            padding: {
              xs: `${inkstashLayout.mainPaddingTop}px ${inkstashLayout.mainPaddingXMobile}px ${inkstashLayout.mainPaddingBottom}px`,
              md: `${inkstashLayout.mainPaddingTop}px ${inkstashLayout.mainPaddingX}px ${inkstashLayout.mainPaddingBottom}px`,
            },
            maxWidth: inkstashLayout.contentMaxWidth,
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
