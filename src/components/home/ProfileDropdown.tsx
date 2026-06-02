import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, Badge } from '@mui/material';
import {
  ChevronRight,
  Gift,
  LayoutGrid,
  CreditCard,
  Bookmark,
  Receipt,
  ShoppingCart,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import { getUserProfileStats } from '../../api/users/profile';
import { inkstashColors, inkstashFonts, inkstashRadii, inkstashShadows } from '../../theme/inkstashTokens';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDropdown({ isOpen, onClose }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const cartItemCount = itemCount;

  useEffect(() => {
    if (isOpen && user?.id) {
      getUserProfileStats(user.id)
        .then(stats => {
          setFollowingCount(stats.following_count);
          setFollowersCount(stats.followers_count);
        })
        .catch(error => {
          console.error('Error fetching profile stats:', error);
        });
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const username = user?.username || 'user';
  const initial = username[0]?.toUpperCase() || 'U';

  const tiles: { icon: typeof Gift; label: string; route: string; badge?: number; isCart?: boolean }[] = [
    { icon: Gift,         label: 'Refer Friends',       route: '/refer' },
    user?.seller_verified
      ? { icon: LayoutGrid, label: 'Creator Dashboard',   route: '/seller-dashboard' }
      : { icon: UserPlus,   label: 'Become a Seller',     route: '/sell' },
    { icon: CreditCard,   label: 'Payments & Shipping', route: '/settings?tab=payments' },
    { icon: Bookmark,     label: 'Saved',               route: '/my-stash?tab=saved' },
    { icon: Receipt,      label: 'Purchases',           route: '/purchases' },
    { icon: ShoppingCart, label: 'Shopping Cart',       route: '/cart', badge: cartItemCount, isCart: true },
  ];

  const menuItems: { icon: typeof Users; label: string; route: string }[] = [
    { icon: Users,      label: 'Friends',          route: '/friends' },
    { icon: Settings,   label: 'Account Settings', route: '/settings' },
    { icon: HelpCircle, label: 'Help & Legal',     route: '/help' },
  ];

  return createPortal(
    <>
      {/* Scrim */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0,
          bgcolor: 'rgba(22,17,14,0.4)',
          zIndex: 2000,
          animation: 'inkstashProfileFadeIn 140ms ease',
        }}
      />

      {/* Panel */}
      <Box
        role="dialog"
        aria-modal="true"
        sx={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: 'calc(100vw - 24px)', sm: 440 },
          maxHeight: 'calc(100dvh - 48px)',
          overflowY: 'auto',
          bgcolor: inkstashColors.bgElev,
          borderRadius: inkstashRadii.lg,
          boxShadow: inkstashShadows.lg,
          zIndex: 2001,
          fontFamily: inkstashFonts.ui,
          animation: 'inkstashProfileSlideIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            background: inkstashColors.border, borderRadius: 999,
          },
        }}
      >
        {/* Header: avatar + username + stats + back chevron */}
        <Box
          onClick={() => handleNavigation(user?.username ? `/@${user.username}` : '/profile')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.75,
            padding: '20px 22px',
            borderBottom: `1px solid ${inkstashColors.border}`,
            cursor: 'pointer',
            transition: 'background 140ms ease',
            '&:hover': { background: inkstashColors.bgSunken },
          }}
        >
          {user?.avatar_url ? (
            <Box
              component="img"
              src={user.avatar_url}
              alt={username}
              sx={{
                width: 56, height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: `1px solid ${inkstashColors.border}`,
              }}
            />
          ) : (
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%',
              background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 22,
              flexShrink: 0,
            }}>
              {initial}
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 800,
              fontSize: 20, letterSpacing: '-0.005em',
              color: inkstashColors.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              mb: 0.3,
            }}>
              {username}
            </Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Box sx={{ fontSize: 13, color: inkstashColors.ink2 }}>
                <Box component="strong" sx={{ color: inkstashColors.ink, fontWeight: 700 }}>{followingCount}</Box>
                <Box component="span" sx={{ ml: 0.5, color: inkstashColors.muted }}>Following</Box>
              </Box>
              <Box sx={{ width: 1, height: 12, bgcolor: inkstashColors.border }} />
              <Box sx={{ fontSize: 13, color: inkstashColors.ink2 }}>
                <Box component="strong" sx={{ color: inkstashColors.ink, fontWeight: 700 }}>{followersCount}</Box>
                <Box component="span" sx={{ ml: 0.5, color: inkstashColors.muted }}>Followers</Box>
              </Box>
            </Stack>
          </Box>
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            bgcolor: inkstashColors.bgSunken,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: inkstashColors.ink2,
            flexShrink: 0,
          }}>
            <ChevronRight size={16} />
          </Box>
        </Box>

        {/* 7-tile grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.25,
          padding: '18px 18px 10px',
        }}>
          {tiles.map(tile => {
            const Icon = tile.icon;
            return (
              <Box
                key={tile.label}
                component="button"
                type="button"
                onClick={() => handleNavigation(tile.route)}
                sx={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 0.85,
                  padding: '18px 8px',
                  minHeight: 96,
                  bgcolor: inkstashColors.bgElev,
                  border: `1px solid ${inkstashColors.border}`,
                  borderRadius: inkstashRadii.md,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 140ms ease, background 140ms ease, transform 100ms ease',
                  '&:hover': {
                    borderColor: inkstashColors.ink,
                    background: inkstashColors.bgSunken,
                  },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                {tile.isCart && tile.badge && tile.badge > 0 ? (
                  <Badge
                    badgeContent={tile.badge}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        bgcolor: inkstashColors.brand,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        height: 18,
                        minWidth: 18,
                        top: 2,
                        right: 2,
                      },
                    }}
                  >
                    <Icon size={26} color={inkstashColors.ink} strokeWidth={1.75} />
                  </Badge>
                ) : (
                  <Icon size={26} color={inkstashColors.ink} strokeWidth={1.75} />
                )}
                <Box sx={{
                  fontSize: 11.5, fontWeight: 700, lineHeight: 1.2,
                  color: inkstashColors.ink,
                  letterSpacing: '-0.005em',
                }}>
                  {tile.label}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Menu items */}
        <Box sx={{
          padding: '10px 18px',
          borderTop: `1px solid ${inkstashColors.border}`,
          mt: 1,
        }}>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Box
                key={item.label}
                component="button"
                type="button"
                onClick={() => handleNavigation(item.route)}
                sx={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  padding: '14px 6px',
                  bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: idx < menuItems.length - 1 ? `1px solid ${inkstashColors.border}` : 'none',
                  transition: 'background 140ms ease',
                  '&:hover': { background: inkstashColors.bgSunken },
                }}
              >
                <Icon size={20} color={inkstashColors.ink2} strokeWidth={1.75} />
                <Box sx={{
                  flex: 1,
                  fontSize: 15, fontWeight: 700, color: inkstashColors.ink,
                  letterSpacing: '-0.005em',
                }}>
                  {item.label}
                </Box>
                <ChevronRight size={18} color={inkstashColors.muted} />
              </Box>
            );
          })}
        </Box>

        {/* Sign Out */}
        <Box sx={{ padding: '14px 18px 18px' }}>
          <Box
            component="button"
            type="button"
            onClick={handleSignOut}
            sx={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 1,
              padding: '14px 18px',
              bgcolor: 'transparent',
              border: `1px solid ${inkstashColors.ink}`,
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: inkstashFonts.ui,
              fontSize: 15, fontWeight: 700,
              color: inkstashColors.ink,
              transition: 'background 140ms ease, color 140ms ease, transform 100ms ease',
              '&:hover': {
                bgcolor: inkstashColors.ink,
                color: '#fff',
              },
              '&:active': { transform: 'scale(0.98)' },
            }}
          >
            <LogOut size={18} />
            Sign Out
          </Box>
        </Box>

        <style>{`
          @keyframes inkstashProfileFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes inkstashProfileSlideIn {
            from { opacity: 0; transform: translate(-50%, -45%); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
          }
        `}</style>
      </Box>
    </>,
    document.body,
  );
}
