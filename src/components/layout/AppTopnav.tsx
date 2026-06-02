// src/components/layout/AppTopnav.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Badge } from '@mui/material';
import { Menu, Search, Bell, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import { useRubyBalance } from '../../hooks/useRubyBalance';
import RubyBalancePill from '../ui/RubyBalancePill';
import RubyBundleModal from '../packs/RubyBundleModal';
import { inkstashColors, inkstashFonts, inkstashLayout, inkstashShadows } from '../../theme/inkstashTokens';

interface AppTopnavProps {
  onOpenMobileNav: () => void;
}

export default function AppTopnav({ onOpenMobileNav }: AppTopnavProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { setDrawerOpen, itemCount } = useCart();
  const { balance, refresh: refreshRubies } = useRubyBalance();
  const [q, setQ] = useState('');
  const [bundleModalOpen, setBundleModalOpen] = useState(false);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        height: inkstashLayout.topnavHeight,
        bgcolor: inkstashColors.bg,
        borderBottom: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        padding: { xs: '0 14px', md: '0 28px' },
        zIndex: 50,
        boxShadow: inkstashShadows.xs,
        fontFamily: inkstashFonts.ui,
      }}
    >
      <Box
        component="button"
        type="button"
        aria-label="Open menu"
        onClick={onOpenMobileNav}
        sx={{
          display: { xs: 'grid', md: 'none' },
          placeItems: 'center',
          bgcolor: 'transparent', border: 'none', cursor: 'pointer',
          color: inkstashColors.ink, padding: 1,
        }}
      >
        <Menu size={20} />
      </Box>

      {/* Search bar is hidden below 540px until we design a better mobile
          placement (overlay sheet, dedicated search route, etc.). The
          `flex: 1` element ensures the right-side action cluster stays
          flush right at every breakpoint. */}
      <Box
        component="form"
        onSubmit={(e: React.FormEvent) => e.preventDefault()}
        sx={{
          flex: 1, minWidth: 0, maxWidth: 480,
          display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.25,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          padding: '8px 12px',
          borderRadius: '9px',
          transition: 'border-color 140ms ease, background 140ms ease',
          '&:focus-within': { borderColor: inkstashColors.borderStrong, bgcolor: inkstashColors.bgElev },
        }}
      >
        <Search size={16} color={inkstashColors.muted} />
        <Box
          component="input"
          placeholder="Search packs, publishers…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
          sx={{
            flex: 1, minWidth: 0, bgcolor: 'transparent', border: 'none', outline: 'none',
            color: inkstashColors.ink, fontFamily: inkstashFonts.ui, fontSize: 14,
            '&::placeholder': { color: inkstashColors.muted },
          }}
        />
        <Box component="kbd" sx={{
          display: { xs: 'none', sm: 'inline-block' },
          bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
          padding: '2px 6px', borderRadius: '5px',
          fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted,
        }}>⌘K</Box>
      </Box>

      <Box sx={{ flex: 1 }} />

      {isAuthenticated && (
        <RubyBalancePill onClickTopUp={() => setBundleModalOpen(true)} />
      )}

      {/* Notifications — badge anchored to top-right of the whole pill,
          not the bell icon. */}
      <Badge
        badgeContent={3}
        color="error"
        overlap="rectangular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: 10,
            height: 18,
            minWidth: 18,
            padding: '0 5px',
            fontFamily: inkstashFonts.mono,
            fontWeight: 800,
            border: `2px solid ${inkstashColors.bg}`,
            transform: 'translate(40%, -40%)',
          },
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label="Notifications"
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
            padding: '7px 10px', borderRadius: 999,
            cursor: 'pointer', color: inkstashColors.ink,
            fontFamily: inkstashFonts.ui, fontSize: 13,
            '&:hover': { borderColor: inkstashColors.borderStrong },
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          <Bell size={16} />
        </Box>
      </Badge>

      {/* Cart — same pattern, badge anchored to the pill. */}
      <Badge
        badgeContent={itemCount}
        color="error"
        overlap="rectangular"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: 10,
            height: 18,
            minWidth: 18,
            padding: '0 5px',
            fontFamily: inkstashFonts.mono,
            fontWeight: 800,
            border: `2px solid ${inkstashColors.bg}`,
            transform: 'translate(40%, -40%)',
          },
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => setDrawerOpen(true)}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.75,
            bgcolor: inkstashColors.bgElev, border: `1px solid ${inkstashColors.border}`,
            padding: '7px 12px', borderRadius: 999,
            cursor: 'pointer', color: inkstashColors.ink,
            fontFamily: inkstashFonts.ui, fontSize: 13,
            '&:hover': { borderColor: inkstashColors.borderStrong },
            '&:active': { transform: 'scale(0.97)' },
          }}
        >
          <ShoppingCart size={16} />
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Cart</Box>
        </Box>
      </Badge>

      {!isAuthenticated && (
        <>
          <Box
            component="button"
            type="button"
            onClick={() => navigate('/')}
            sx={{
              display: { xs: 'none', md: 'inline-block' },
              bgcolor: 'transparent', border: 'none', cursor: 'pointer',
              color: inkstashColors.ink2, padding: '8px 14px',
              fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 500,
              '&:hover': { color: inkstashColors.ink },
            }}
          >
            Log in
          </Box>

          <Box
            component="button"
            type="button"
            onClick={() => navigate('/')}
            sx={{
              bgcolor: inkstashColors.brand, color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 1,
              fontFamily: inkstashFonts.ui, fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              '&:hover': { bgcolor: inkstashColors.brandDeep },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            Sign up
          </Box>
        </>
      )}

      <RubyBundleModal
        open={bundleModalOpen}
        onClose={() => setBundleModalOpen(false)}
        currentBalance={balance}
      />
    </Box>
  );
}
