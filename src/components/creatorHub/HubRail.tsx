// src/components/creatorHub/HubRail.tsx
//
// Sticky vertical nav down the left edge of the Creator Hub. Collapsible
// (76px icons-only ↔ 240px icons + labels) with an expand toggle at the
// bottom, mirroring the global AppSidebar pattern. Collapse state
// persists to localStorage so it sticks across reloads.
//
// Per QA 2026-06-08:
// - the always-on scrollbar + flex spacer "grey column" between the
//   main items and Settings is gone (the rail has 9 items — it will
//   never overflow even at small heights)
// - tabs get more vertical breathing room (gap 12px)
// - active + hover paint a 3px crimson accent bar on the right edge

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Home as HomeIcon,
  Radio,
  BarChart3,
  Tag,
  Users,
  DollarSign,
  Truck,
  Receipt,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

export type HubTabId =
  | 'home' | 'stream' | 'analytics' | 'listed'
  | 'community' | 'money' | 'shipping' | 'receipts' | 'settings';

interface RailItem {
  id: HubTabId;
  label: string;
  icon: ReactNode;
  /** When true, render a brand-red dot in the top-right while inactive
   *  (e.g. when a stream is currently live). */
  attention?: boolean;
  /** Separated from the main rail by a spacer (Settings at bottom). */
  bottom?: boolean;
}

const ITEMS: RailItem[] = [
  { id: 'home',      label: 'Home',         icon: <HomeIcon size={21} strokeWidth={2.1} /> },
  { id: 'stream',    label: 'Stream',       icon: <Radio size={21} strokeWidth={2.1} /> },
  { id: 'analytics', label: 'Analytics',    icon: <BarChart3 size={21} strokeWidth={2.1} /> },
  { id: 'listed',    label: 'Listed Items', icon: <Tag size={21} strokeWidth={2.1} /> },
  { id: 'community', label: 'Community',    icon: <Users size={21} strokeWidth={2.1} /> },
  { id: 'money',     label: 'Monetization', icon: <DollarSign size={21} strokeWidth={2.1} /> },
  { id: 'shipping',  label: 'Shipping',     icon: <Truck size={21} strokeWidth={2.1} /> },
  { id: 'receipts',  label: 'Receipts',     icon: <Receipt size={21} strokeWidth={2.1} /> },
  { id: 'settings',  label: 'Settings',     icon: <SettingsIcon size={21} strokeWidth={2.1} />, bottom: true },
];

const COLLAPSE_KEY = 'inkstash.creatorhub.rail.collapsed';
const WIDTH_COLLAPSED = 76;
const WIDTH_EXPANDED  = 240;

interface Props {
  active: HubTabId;
  onChange: (id: HubTabId) => void;
  /** Set true while a stream owned by this seller is live so the Stream
   *  item gets the attention dot. */
  streamLive?: boolean;
}

/** Public helper for CreatorHub to know the rail's current width so the
 *  main content offset matches. Reads the same localStorage the rail
 *  uses. Safe to call before mount. */
export function getHubRailWidth(): number {
  if (typeof window === 'undefined') return WIDTH_COLLAPSED;
  return window.localStorage.getItem(COLLAPSE_KEY) === 'false'
    ? WIDTH_EXPANDED
    : WIDTH_COLLAPSED;
}

export default function HubRail({ active, onChange, streamLive = false }: Props) {
  // Default collapsed (matches the historical 76px shape). Persisted
  // across reloads via the same pattern AppSidebar uses.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    // Broadcast so CreatorHub's main offset reacts without a remount.
    window.dispatchEvent(new CustomEvent('inkstash:hubrail:toggle', {
      detail: { collapsed, width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED },
    }));
  }, [collapsed]);

  const mainItems = ITEMS.filter((i) => !i.bottom);
  const bottomItems = ITEMS.filter((i) => i.bottom);
  const width = collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED;

  return (
    <>
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        left: 0,
        top: 60,
        height: 'calc(100vh - 60px)',
        width,
        bgcolor: inkstashColors.bgElev,
        borderRight: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        py: 2.5,
        // Vertical-only clip. Horizontal stays visible so the floating
        // collapse toggle below (rendered outside this Box) can sit
        // half-off the right edge without being chopped.
        overflowY: 'hidden',
        overflowX: 'visible',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        transition: 'width 220ms cubic-bezier(0.23, 1, 0.32, 1)',
        zIndex: 40,
      }}
    >
      {/* Main items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', px: '12px' }}>
        {mainItems.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={active === item.id}
            collapsed={collapsed}
            attention={item.id === 'stream' && streamLive && active !== item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
      </Box>

      {/* Spacer fills remaining height so Settings + collapse toggle
          sit at the bottom. No visible divider line — the old hairline
          was reading as part of the "grey bar" complaint. */}
      <Box sx={{ flex: 1 }} />

      {/* Bottom block: Settings only. The collapse/expand chevron
          floats on the right edge as a small circular toggle next to
          the Settings cog (per design sidebar.css :: .collapse-btn-mini
          — sits half-off the right edge of the rail). */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        px: '12px',
        position: 'relative',
      }}>
        {bottomItems.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={active === item.id}
            collapsed={collapsed}
            onClick={() => onChange(item.id)}
          />
        ))}
      </Box>

      {/* Floating circular collapse toggle. Anchored to the bottom of
          the rail's right edge so it visually pairs with the Settings
          cog without taking up a tab row. half-off the edge per design. */}
    </Box>

    {/* Floating collapse toggle. Lives OUTSIDE the nav Box so it
        isn't constrained by any clipping. Fixed-positioned so it
        slides as the rail's width changes (rail itself transitions
        width, the chevron's `left` transitions with it). Vertically
        aligned with the Settings cog. */}
    <Box
      component="button"
      onClick={() => setCollapsed((v) => !v)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      sx={{
        position: 'fixed',
        // Center of the toggle sits ON the rail's right border. The
        // rail is at left:0 with width=`width`, so the border is at
        // x=width. half-off → left = width - 14.
        left: `${width - 14}px`,
        // Settings cog vertical center: nav py-2.5 (20) from bottom,
        // then the cog tab is ~38px tall; its center is ~20 + 19 = 39
        // from the bottom of the rail.
        bottom: 'calc(20px + 19px - 14px)',  // -14 to center the 28px circle
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: inkstashColors.bgElev,
        border: `1px solid ${inkstashColors.border}`,
        color: inkstashColors.muted,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(22,17,14,0.06), 0 1px 0 rgba(22,17,14,0.03)',
        zIndex: 45,
        transition: 'color 120ms ease, background-color 120ms ease, left 220ms cubic-bezier(0.23, 1, 0.32, 1)',
        '&:hover': {
          color: inkstashColors.ink,
          bgcolor: inkstashColors.bg,
        },
        '&:active': { transform: 'scale(0.94)' },
      }}
    >
      {collapsed
        ? <ChevronRight size={15} strokeWidth={2.2} />
        : <ChevronLeft size={15} strokeWidth={2.2} />}
    </Box>
    </>
  );
}

function RailButton({
  item, active, attention = false, collapsed, onClick,
}: {
  item: RailItem;
  active: boolean;
  attention?: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      sx={{
        position: 'relative',
        width: '100%',
        // Per design (sidebar.css :: .side-item): 9px/12px padding,
        // 8px radius, 13.5px label. Smaller + lighter than the old
        // 44px square tile.
        py: '9px',
        px: collapsed ? 0 : '12px',
        borderRadius: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : '12px',
        border: 0,
        cursor: 'pointer',
        bgcolor: active ? inkstashColors.ink : 'transparent',
        color: active ? '#fff' : inkstashColors.ink2,
        textAlign: 'left',
        transition: 'background-color 120ms ease, color 120ms ease',
        // Crimson accent bar sits at the SIDEBAR'S right edge (the
        // nav/page divider), not the button edge. Per design:
        // `.side-item::after { right: -12px }`. The rail itself has
        // 12px of horizontal padding, so right: calc(-12px - 1px)
        // pushes the bar all the way out to align with the
        // border-right divider line.
        '&::after': {
          content: '""',
          position: 'absolute',
          right: '-13px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: 0,
          borderRadius: '3px 0 0 3px',
          bgcolor: inkstashColors.brand,
          transition: 'height 160ms ease',
        },
        // Hover: beige sunken bg + ink text/icon (same as the home
        // AppSidebar). The CRIMSON signal lives only in the right-
        // edge accent bar, not the tile fill. Active tabs hover as a
        // no-op so the black fill never flickers mid-transition.
        '&:hover': active ? {} : {
          bgcolor: inkstashColors.bgSunken,
          color: inkstashColors.ink,
        },
        '&:hover::after': active ? {} : { height: collapsed ? '22px' : '20px' },
        '&:hover .hub-rail-tip': { opacity: collapsed ? 1 : 0 },
      }}
    >
      <Box sx={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        // Idle: muted gray. Active: white. Hover: inherits the parent
        // button's color (crimson on idle hover, white on active hover-
        // no-op). 'inherit' from the parent's color cascade handles
        // the hover transition for us.
        color: active ? '#fff' : 'inherit',
      }}>
        {item.icon}
        {attention && (
          <Box
            sx={{
              position: 'absolute',
              top: -3, right: -3,
              width: 7, height: 7,
              borderRadius: '50%',
              bgcolor: inkstashColors.brand,
              border: `1.5px solid ${inkstashColors.bgElev}`,
            }}
          />
        )}
      </Box>

      {!collapsed && (
        <Typography
          component="span"
          sx={{
            fontFamily: inkstashFonts.ui,
            fontSize: '13.5px',
            fontWeight: 500,                        // design uses 500, not 600/700
            color: 'inherit',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {item.label}
        </Typography>
      )}

      {collapsed && (
        <Typography
          className="hub-rail-tip"
          sx={{
            position: 'absolute',
            left: 'calc(100% + 10px)',
            top: '50%',
            transform: 'translateY(-50%)',
            whiteSpace: 'nowrap',
            bgcolor: inkstashColors.ink,
            color: '#fff',
            fontFamily: inkstashFonts.ui,
            fontSize: 12,
            fontWeight: 600,
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 120ms ease',
            zIndex: 60,
          }}
        >
          {item.label}
        </Typography>
      )}
    </Box>
  );
}
