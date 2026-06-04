// src/components/creatorHub/HubTopBar.tsx
//
// Sticky brand bar across the top of the Creator Hub. Cream elevated
// surface with a 1px bottom border. Reusable in any hub-scoped context.

import { Box, ButtonBase, Typography } from '@mui/material';
import { Bell, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HostAvatar from '../livestreams/HostAvatar';
import { useAuth } from '../../hooks/useAuth';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  /** Opens the global Go Live composer modal. */
  onCreateShow?: () => void;
  /** Opens the Settings panel when the avatar is tapped. */
  onOpenSettings?: () => void;
  /** Pending notification count (renders the small brand-red badge). */
  notificationCount?: number;
}

export default function HubTopBar({
  onCreateShow, onOpenSettings, notificationCount = 0,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        px: 2.75,
        bgcolor: inkstashColors.bgElev,
        borderBottom: `1px solid ${inkstashColors.border}`,
      }}
    >
      {/* Brand. Click returns to / (the buyer-side home). */}
      <ButtonBase
        onClick={() => navigate('/')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          color: inkstashColors.ink,
        }}
      >
        {/* Brand mark — same inline SVG used by AppSidebar so the hub
            matches the buyer-side identity exactly. */}
        <Box component="svg" width={30} height={30} viewBox="0 0 40 40" fill="none" sx={{ flexShrink: 0 }}>
          <circle cx={20} cy={20} r={18} fill={inkstashColors.ink} />
          <path d="M20 10L25 15L20 20L15 15L20 10Z" fill={inkstashColors.brand} />
          <path d="M20 20L25 25L20 30L15 25L20 20Z" fill={inkstashColors.brand} opacity={0.65} />
        </Box>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '0.01em',
            color: inkstashColors.ink,
            textTransform: 'lowercase',
          }}
        >
          inkstash
          <Box component="span" sx={{ color: inkstashColors.brand }}>.</Box>
        </Typography>
      </ButtonBase>

      {/* Creator Hub badge — small mono chip lifts the brand off "regular" surfaces */}
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: inkstashColors.ink,
          bgcolor: inkstashColors.bgSunken,
          border: `1px solid ${inkstashColors.border}`,
          borderRadius: 1,
          px: 1.25,
          py: 0.6,
          whiteSpace: 'nowrap',
          display: { xs: 'none', sm: 'inline-block' },
        }}
      >
        Creator Hub
      </Box>

      <Box sx={{ flex: 1 }} />

      <IconChip aria-label="Create a show" onClick={onCreateShow}>
        <Plus size={18} strokeWidth={2.2} />
      </IconChip>

      <IconChip aria-label="Notifications" badge={notificationCount}>
        <Bell size={18} strokeWidth={2.2} />
      </IconChip>

      <ButtonBase
        onClick={onOpenSettings}
        aria-label="Open settings"
        sx={{
          width: 40,
          height: 40,
          borderRadius: 999,
          flexShrink: 0,
          // 2px halo separates the avatar from the cream bar
          boxShadow: `0 0 0 1px ${inkstashColors.border}, 0 0 0 3px ${inkstashColors.bgElev}`,
          overflow: 'hidden',
        }}
      >
        <HostAvatar
          username={user?.username ?? null}
          avatarUrl={user?.avatar_url ?? null}
          size={40}
        />
      </ButtonBase>
    </Box>
  );
}

function IconChip({
  children, badge = 0, onClick, 'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  badge?: number;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: inkstashColors.bg,
        border: `1px solid ${inkstashColors.border}`,
        color: inkstashColors.ink2,
        cursor: 'pointer',
        transition: 'background-color 120ms ease, border-color 120ms ease',
        '&:hover': {
          bgcolor: inkstashColors.bgSunken,
          borderColor: inkstashColors.borderStrong,
        },
      }}
    >
      {children}
      {badge > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            px: '4px',
            borderRadius: 999,
            bgcolor: inkstashColors.brand,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </Box>
      )}
    </Box>
  );
}
