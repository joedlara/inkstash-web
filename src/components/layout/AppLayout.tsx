import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MobileNavProvider } from './MobileNavContext';
import { RubyBalanceProvider } from '../../contexts/RubyBalanceContext';

// The mobile bottom nav was retired (the AppSidebar handles primary
// navigation on every breakpoint now). MobileNavContext is kept so any
// `useSuppressMobileNav()` callers continue to compile as no-ops without
// requiring a one-by-one cleanup.
interface AppLayoutProps {
  children: ReactNode;
  /** Deprecated: kept so old call sites compile. No longer wired to anything. */
  showMobileNav?: boolean;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {children}
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
