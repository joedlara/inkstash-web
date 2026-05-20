import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Badge, Avatar, IconButton, Stack } from '@mui/material';
import { Search, Bookmark, Message, Notifications, CardGiftcard } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import ProfileDropdown from './ProfileDropdown';

const T = {
  bg:        '#09090f',
  surface:   '#0f0f18',
  border:    'rgba(255,255,255,0.06)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  white:     '#f0f0f5',
  muted:     'rgba(240,240,245,0.38)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

const NAV_TABS = [
  { label: 'Packs',       path: '/packs' },
  { label: 'Live',        path: '/live' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'Drops',       path: '/drops' },
  { label: 'Raffles',     path: '/raffles' },
];

export default function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cartItemCount = getItemCount();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: 'rgba(9,9,15,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Top bar — logo, search, actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1.5, md: 2 },
            px: { xs: 2, md: 4 },
            py: 1.25,
            maxWidth: 1600,
            mx: 'auto',
          }}
        >
          {/* Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flexShrink: 0, '&:hover': { opacity: 0.8 }, transition: 'opacity 0.18s' }}
          >
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" fill="#0f0f18" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="#0078FF"/>
              <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="#0078FF" opacity="0.65"/>
            </svg>
            <Box
              component="span"
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.25rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: T.white,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Ink<Box component="span" sx={{ color: T.blue }}>Stash</Box>
            </Box>
          </Box>

          {/* Search */}
          <Box
            component="form"
            onSubmit={(e: React.FormEvent) => e.preventDefault()}
            sx={{
              flex: 1,
              maxWidth: 440,
              position: 'relative',
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            <Search sx={{ position: 'absolute', left: 12, color: 'rgba(240,240,245,0.3)', pointerEvents: 'none', fontSize: 18 }} />
            <Box
              component="input"
              placeholder="Search comics, packs, sellers..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              sx={{
                width: '100%',
                pl: 5, pr: 2, py: 0.9,
                bgcolor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                color: T.white,
                fontFamily: T.mono,
                fontSize: '0.78rem',
                outline: 'none',
                transition: 'border-color 0.15s, background 0.15s',
                '&::placeholder': { color: 'rgba(240,240,245,0.3)' },
                '&:focus': { borderColor: T.borderLit, bgcolor: 'rgba(255,255,255,0.07)' },
              }}
            />
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Right actions */}
          <Stack direction="row" spacing={0.25} alignItems="center" sx={{ flexShrink: 0 }}>
            {!user?.seller_verified && (
              <Box
                onClick={() => navigate('/seller-onboarding')}
                sx={{
                  px: 2, py: 0.75,
                  borderRadius: 999,
                  fontFamily: T.mono,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: T.muted,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  display: { xs: 'none', lg: 'block' },
                  border: `1px solid ${T.border}`,
                  transition: 'all 0.15s',
                  '&:hover': { color: T.white, borderColor: T.borderLit },
                }}
              >
                Become a Seller
              </Box>
            )}

            {[
              { icon: <Bookmark sx={{ fontSize: 19 }} />, label: 'Saved', action: () => navigate('/my-stash?tab=saved'), hide: true },
              { icon: <Badge badgeContent={2} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14, top: 2, right: 2 } }}><Message sx={{ fontSize: 19 }} /></Badge>, label: 'Messages', action: () => {} },
              { icon: <Notifications sx={{ fontSize: 19 }} />, label: 'Notifications', action: () => {} },
            ].map(({ icon, label, action, hide }) => (
              <IconButton
                key={label}
                aria-label={label}
                onClick={action}
                sx={{
                  color: 'rgba(240,240,245,0.55)',
                  display: hide ? { xs: 'none', sm: 'inline-flex' } : 'inline-flex',
                  '&:hover': { color: T.white, bgcolor: 'rgba(255,255,255,0.06)' },
                  transition: 'all 0.15s',
                }}
              >
                {icon}
              </IconButton>
            ))}

            <IconButton
              aria-label="Refer"
              onClick={() => navigate('/refer')}
              sx={{
                color: T.blue,
                position: 'relative',
                '&:hover': { bgcolor: 'rgba(0,120,255,0.1)' },
                transition: 'all 0.15s',
              }}
            >
              <CardGiftcard sx={{ fontSize: 19 }} />
            </IconButton>

            {/* Avatar */}
            <Badge
              badgeContent={cartItemCount > 0 ? cartItemCount : null}
              color="primary"
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, '& .MuiBadge-badge': { top: 4, right: 4, fontSize: '0.6rem', minWidth: 16, height: 16 } }}
            >
              <IconButton
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                aria-label="Profile menu"
                sx={{ p: 0.25, border: `1px solid ${T.border}`, borderRadius: '50%', transition: 'border-color 0.18s', '&:hover': { borderColor: T.borderLit } }}
              >
                {user?.avatar_url ? (
                  <Avatar src={user.avatar_url} alt={user.username} sx={{ width: 34, height: 34 }} />
                ) : (
                  <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #0078FF, #0050cc)', fontWeight: 700, fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif" }}>
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                )}
              </IconButton>
            </Badge>
          </Stack>
        </Box>

        {/* Nav tabs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: { xs: 2, md: 4 },
            borderTop: `1px solid ${T.border}`,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {NAV_TABS.map(({ label, path }) => {
            const active = isActive(path);
            return (
              <Box
                key={path}
                onClick={() => navigate(path)}
                sx={{
                  px: 2.25,
                  py: 1.25,
                  fontFamily: T.mono,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  color: active ? T.white : T.muted,
                  borderBottom: active ? `2px solid ${T.blue}` : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  '&:hover': { color: active ? T.white : 'rgba(240,240,245,0.65)' },
                }}
              >
                {label}
              </Box>
            );
          })}
        </Box>
      </Box>

      <ProfileDropdown isOpen={showProfileDropdown} onClose={() => setShowProfileDropdown(false)} />
    </>
  );
}
