import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { ChevronRight, PanelLeftClose } from 'lucide-react';
import { appSidebarPrimary, appSidebarEvents } from './appSidebarConfig';
import { useAuth } from '../../hooks/useAuth';
import ProfileDropdown from '../home/ProfileDropdown';
import { inkstashColors, inkstashFonts, inkstashLayout, inkstashShadows } from '../../theme/inkstashTokens';

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
}

export default function AppSidebar({ collapsed, mobileOpen, onCollapseToggle, onMobileClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const width = collapsed ? inkstashLayout.sidebarWidthCollapsed : inkstashLayout.sidebarWidth;

  const username = user?.username || 'guest';
  const initial = username[0]?.toUpperCase() || 'G';
  const tier = user?.seller_verified ? 'Seller' : 'Free tier';

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width,
        bgcolor: inkstashColors.bgElev,
        borderRight: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1100,
        fontFamily: inkstashFonts.ui,
        transition: 'width 200ms ease, transform 200ms ease',
        transform: {
          xs: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          md: 'translateX(0)',
        },
        boxShadow: { xs: mobileOpen ? inkstashShadows.lg : 'none', md: 'none' },
      }}
    >
      <Box sx={{
        height: inkstashLayout.topnavHeight,
        display: 'flex', alignItems: 'center', gap: 1.2,
        padding: collapsed ? '0' : '0 18px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: `1px solid ${inkstashColors.border}`,
        cursor: 'pointer',
      }} onClick={() => navigate('/')}>
        <svg width={30} height={30} viewBox="0 0 40 40" fill="none">
          <circle cx={20} cy={20} r={18} fill={inkstashColors.ink} />
          <path d="M20 10L25 15L20 20L15 15L20 10Z" fill={inkstashColors.brand} />
          <path d="M20 20L25 25L20 30L15 25L20 20Z" fill={inkstashColors.brand} opacity={0.65} />
        </svg>
        {!collapsed && (
          <Box component="span" sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 900, fontSize: '20px',
            color: inkstashColors.ink,
            textTransform: 'lowercase',
            letterSpacing: '-0.01em',
          }}>
            inkstash<Box component="span" sx={{ color: inkstashColors.brand }}>.</Box>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '14px 12px' }}>
        {appSidebarPrimary.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.route}
              to={item.route}
              end={item.route === '/'}
              onClick={onMobileClose}
              style={({ isActive }) => ({
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                color: isActive ? '#fff' : inkstashColors.ink2,
                background: isActive ? inkstashColors.brand : 'transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                marginBottom: 2,
                transition: 'background 140ms ease, color 140ms ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  {!collapsed && (
                    <>
                      <Box component="span" sx={{ flex: 1 }}>{item.label}</Box>
                      {item.count != null && (
                        <Box component="span" sx={{
                          fontFamily: inkstashFonts.mono, fontSize: 11,
                          color: isActive ? 'rgba(255,255,255,0.7)' : inkstashColors.muted2,
                          letterSpacing: '0.04em',
                        }}>
                          {item.count}
                        </Box>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {!collapsed && (
          <Box sx={{
            mt: 2.5, mb: 1, mx: 1.5,
            fontFamily: inkstashFonts.mono,
            fontSize: '10.5px',
            color: inkstashColors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}>
            Events
          </Box>
        )}
        {appSidebarEvents.map(ev => (
          <Box
            key={ev.label}
            onClick={() => navigate(ev.route)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              padding: collapsed ? '8px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: inkstashColors.ink2,
              transition: 'background 140ms ease',
              '&:hover': { background: inkstashColors.bgSunken },
            }}
          >
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              background: `linear-gradient(135deg, ${ev.gradient[0]}, ${ev.gradient[1]})`,
              flexShrink: 0,
            }} />
            {!collapsed && (
              <>
                <Box component="span" sx={{
                  flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{ev.label}</Box>
                <Box component="span" sx={{
                  fontFamily: inkstashFonts.mono, fontSize: 11, color: inkstashColors.muted2,
                }}>{ev.count}</Box>
              </>
            )}
          </Box>
        ))}

        {!collapsed && (
          <Box sx={{
            mt: 3, padding: 2,
            background: `linear-gradient(135deg, ${inkstashColors.brandSoft}, ${inkstashColors.bgSunken})`,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: 2,
          }}>
            <Box sx={{
              fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 18,
              textTransform: 'uppercase', lineHeight: 1, mb: 0.75, color: inkstashColors.ink,
            }}>
              List your<br />collection
            </Box>
            <Box sx={{ fontSize: 12, color: inkstashColors.muted, mb: 1.5 }}>
              Vault &amp; sell graded slabs.
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => navigate('/list-item')}
              sx={{
                width: '100%',
                bgcolor: inkstashColors.ink, color: '#fff', border: 'none',
                padding: '8px 12px', borderRadius: 1.5,
                fontFamily: inkstashFonts.ui, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
                '&:hover': { bgcolor: inkstashColors.ink2 },
                '&:active': { transform: 'scale(0.97)' },
              }}
            >
              Get started
            </Box>
          </Box>
        )}
      </Box>

      <Box
        component={isAuthenticated ? 'button' : 'div'}
        type={isAuthenticated ? 'button' : undefined}
        onClick={isAuthenticated ? () => setProfileOpen(true) : undefined}
        sx={{
          borderTop: `1px solid ${inkstashColors.border}`,
          padding: collapsed ? '12px 8px' : '12px 14px',
          display: 'flex', alignItems: 'center', gap: 1.25,
          position: 'relative',
          width: '100%',
          bgcolor: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: isAuthenticated ? 'pointer' : 'default',
          transition: 'background 140ms ease',
          '&:hover': isAuthenticated ? { background: inkstashColors.bgSunken } : {},
        }}
      >
        {user?.avatar_url ? (
          <Box
            component="img"
            src={user.avatar_url}
            alt={username}
            sx={{
              width: 32, height: 32, borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
              border: `1px solid ${inkstashColors.border}`,
            }}
          />
        ) : (
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${inkstashColors.brand}, ${inkstashColors.brandDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: inkstashFonts.display, fontWeight: 900, fontSize: 13,
            flexShrink: 0,
          }}>{initial}</Box>
        )}
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontWeight: 600, fontSize: 13, color: inkstashColors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{username}</Box>
              <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 10.5, color: inkstashColors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{tier}</Box>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCollapseToggle(); }}
              aria-label="Collapse sidebar"
              sx={{
                bgcolor: 'transparent', border: 'none', cursor: 'pointer',
                color: inkstashColors.muted,
                padding: 0.5,
                display: 'grid', placeItems: 'center',
                '&:hover': { color: inkstashColors.ink },
              }}
            >
              <PanelLeftClose size={16} />
            </Box>
          </>
        )}
        {collapsed && (
          <Box
            component="button"
            type="button"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCollapseToggle(); }}
            aria-label="Expand sidebar"
            sx={{
              position: 'absolute', bottom: 14, right: 8,
              bgcolor: 'transparent', border: 'none', cursor: 'pointer',
              color: inkstashColors.muted,
              padding: 0.5,
              display: 'grid', placeItems: 'center',
              '&:hover': { color: inkstashColors.ink },
            }}
          >
            <ChevronRight size={16} />
          </Box>
        )}
      </Box>

      <ProfileDropdown isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
}
