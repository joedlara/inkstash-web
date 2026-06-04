// src/components/layout/AppShell.tsx
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import AppSidebar from './AppSidebar';
import AppTopnav from './AppTopnav';
import CartDrawer from '../cart/CartDrawer';
import HomeFooter from '../home/HomeFooter';
import { useSuppressMobileNav } from './MobileNavContext';
import { inkstashColors, inkstashFonts, inkstashLayout } from '../../theme/inkstashTokens';

const LS_KEY = 'inkstash.sidebar.collapsed';

interface AppShellProps {
  children: ReactNode;
  /** Set to true on immersive surfaces (e.g. /live/:id desktop stage)
   *  where a footer would compete with the main content. Defaults to
   *  false so every page using AppShell gets the brand footer by default. */
  hideFooter?: boolean;
}

export default function AppShell({ children, hideFooter = false }: AppShellProps) {
  useSuppressMobileNav();
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
        collapsed={mobileOpen ? false : collapsed}
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
        {!hideFooter && <HomeFooter />}
      </Box>
      <CartDrawer />
    </Box>
  );
}
