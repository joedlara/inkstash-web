import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Avatar, Badge, Stack } from '@mui/material';
import { Menu, Search, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../contexts/CartContext';
import ProfileDropdown from '../home/ProfileDropdown';
import { colors, easing, fonts, layout } from '../../theme/conceptCTokens';

interface TopNavBarProps {
  onToggleSidebar: () => void;
}

export default function TopNavBar({ onToggleSidebar }: TopNavBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const [showProfile, setShowProfile] = useState(false);
  const [query, setQuery] = useState('');
  const cartCount = getItemCount();

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: layout.navHeight,
          bgcolor: colors.topbarBg,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${colors.line}`,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, md: 3 },
          fontFamily: fonts.display,
        }}
      >
        <IconButton
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          sx={{ color: colors.ink, '&:active': { transform: 'scale(0.94)' } }}
        >
          <Menu size={20} />
        </IconButton>

        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer', flexShrink: 0 }}
        >
          <Box sx={{
            width: 26, height: 26, borderRadius: '7px',
            bgcolor: colors.accent, color: '#fff',
            display: 'grid', placeItems: 'center',
            fontSize: '0.78rem',
            boxShadow: '0 4px 12px rgba(232,44,44,0.32)',
          }}>◆</Box>
          <Box component="span" sx={{
            fontWeight: 800, fontSize: '1.05rem',
            letterSpacing: '-0.01em', color: colors.ink,
            display: { xs: 'none', sm: 'block' },
          }}>InkStash</Box>
        </Box>

        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => e.preventDefault()}
          sx={{
            flex: 1, maxWidth: 460,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center', gap: 1.25,
            bgcolor: colors.bgSub,
            border: `1px solid ${colors.line}`,
            px: 1.5, py: 0.9,
            borderRadius: '9px',
            transition: `border-color 180ms ${easing.out}, background 180ms ${easing.out}`,
            '&:focus-within': { borderColor: colors.lineStrong, bgcolor: colors.bgElev },
          }}
        >
          <Search size={16} color={colors.inkMute} />
          <Box
            component="input"
            placeholder="Search keys, slabs, creators…"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            sx={{
              flex: 1, bgcolor: 'transparent', border: 'none', outline: 'none',
              color: colors.ink, fontFamily: fonts.display, fontSize: '0.86rem',
              '&::placeholder': { color: colors.inkMute },
            }}
          />
          <Box component="kbd" sx={{
            bgcolor: colors.bgElev, border: `1px solid ${colors.lineStrong}`,
            px: 0.9, py: 0.25, borderRadius: '5px',
            fontFamily: fonts.mono, fontSize: '0.66rem', color: colors.inkSoft,
          }}>⌘K</Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <IconButton aria-label="Messages" sx={{ color: colors.inkSoft }}>
            <Badge badgeContent={2} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.55rem', minWidth: 14, height: 14 } }}>
              <MessageSquare size={18} />
            </Badge>
          </IconButton>
          <IconButton aria-label="Notifications" sx={{ color: colors.inkSoft }}>
            <Bell size={18} />
          </IconButton>

          <Badge
            badgeContent={cartCount > 0 ? cartCount : null}
            color="primary"
            sx={{ ml: 0.5, '& .MuiBadge-badge': { top: 4, right: 4, fontSize: '0.6rem', minWidth: 16, height: 16 } }}
          >
            <IconButton
              onClick={() => setShowProfile(v => !v)}
              aria-label="Profile menu"
              sx={{ p: 0.25, border: `1px solid ${colors.line}`, borderRadius: '50%' }}
            >
              {user?.avatar_url ? (
                <Avatar src={user.avatar_url} alt={user.username} sx={{ width: 32, height: 32 }} />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: colors.accent, fontWeight: 700, fontSize: '0.8rem' }}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              )}
            </IconButton>
          </Badge>
        </Stack>
      </Box>

      <ProfileDropdown isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </>
  );
}
