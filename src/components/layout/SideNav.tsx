import { NavLink, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { sideNavPrimary, sideNavEvents, type SideNavItem } from './sideNavConfig';
import { colors, easing, fonts, layout } from '../../theme/conceptCTokens';

interface SideNavProps {
  collapsed: boolean;
}

export default function SideNav({ collapsed }: SideNavProps) {
  const navigate = useNavigate();
  const width = collapsed ? layout.sideWidthCollapsed : layout.sideWidthOpen;

  const renderItem = (item: SideNavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.route}
        to={item.route}
        end={item.route === '/'}
        aria-label={item.label}
        style={({ isActive }) => ({
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '9px 10px',
          borderRadius: 8,
          color: isActive ? colors.sideActiveInk : colors.sideInkSoft,
          background: isActive ? colors.sideActiveBg : 'transparent',
          fontSize: '0.86rem',
          fontWeight: isActive ? 600 : 500,
          fontFamily: fonts.display,
          transition: `background 180ms ${easing.out}, color 180ms ${easing.out}, transform 160ms ${easing.out}`,
          justifyContent: collapsed ? 'center' : 'flex-start',
        })}
      >
        <Icon size={18} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: layout.navHeight,
        left: 0, bottom: 0,
        width,
        bgcolor: colors.sideBg,
        color: colors.sideInk,
        borderRight: `1px solid ${colors.sideLine}`,
        padding: '20px 14px 16px',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        transition: `width 220ms ${easing.out}`,
        zIndex: 1050,
        fontFamily: fonts.display,
        overflow: 'hidden',
        '& a:hover': { background: colors.sideHover, color: colors.sideInk },
        '& a:active': { transform: 'scale(0.985)' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        {sideNavPrimary.map(renderItem)}

        {!collapsed && (
          <Box sx={{
            mt: 2.25, mb: 0.75, mx: 1,
            color: colors.sideInkSoft,
            fontSize: '0.66rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            Events
          </Box>
        )}
        {sideNavEvents.map(renderItem)}
      </Box>

      {!collapsed && (
        <Box sx={{ mt: 'auto', pt: 1.75 }}>
          <Box
            component="button"
            onClick={() => navigate('/sell/list-item')}
            sx={{
              width: '100%',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              padding: '11px 14px',
              borderRadius: '9px',
              fontFamily: fonts.display,
              fontWeight: 700, fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(232,44,44,0.28)',
              transition: `background 180ms ${easing.out}, transform 160ms ${easing.out}, box-shadow 180ms ${easing.out}`,
              '&:hover': { background: colors.accentDeep, boxShadow: '0 8px 22px rgba(232,44,44,0.36)' },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            Submit my comics
          </Box>
        </Box>
      )}
    </Box>
  );
}
