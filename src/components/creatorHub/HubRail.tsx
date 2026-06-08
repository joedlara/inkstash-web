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
        // No overflow:auto — rail has 9 fixed items; the scrollbar that
        // appeared on macOS was the cause of the "grey vertical bar"
        // in QA screenshots. Belt-and-suspenders: hide any incidental
        // scrollbar too.
        overflow: 'hidden',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        // Width animates so the rail visibly slides open/closed.
        transition: 'width 220ms cubic-bezier(0.23, 1, 0.32, 1)',
        zIndex: 40,
      }}
    >
      {/* Main items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, px: 1.25 }}>
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

      {/* Bottom block: Settings + collapse toggle */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, px: 1.25 }}>
        {bottomItems.map((item) => (
          <RailButton
            key={item.id}
            item={item}
            active={active === item.id}
            collapsed={collapsed}
            onClick={() => onChange(item.id)}
          />
        ))}
        <RailButton
          item={{
            id: 'settings' as HubTabId, // never active, label is the only thing read
            label: collapsed ? 'Expand' : 'Collapse',
            icon: collapsed
              ? <ChevronRight size={20} strokeWidth={2.2} />
              : <ChevronLeft size={20} strokeWidth={2.2} />,
          }}
          active={false}
          collapsed={collapsed}
          onClick={() => setCollapsed((v) => !v)}
        />
      </Box>
    </Box>
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
        height: 44,
        borderRadius: '11px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 1.25,
        px: collapsed ? 0 : 1.5,
        border: 0,
        cursor: 'pointer',
        bgcolor: active ? inkstashColors.ink : 'transparent',
        color: active ? '#fff' : inkstashColors.muted,
        transition: 'background-color 120ms ease, color 120ms ease',
        // Crimson accent bar on the right edge on hover only. Active
        // state uses the black fill alone — per the design's
        // `.side-item.active { background: var(--ink) }` +
        // `.side-item.active::after { height: 0 }`. Crimson + black
        // would compete; ink-only reads as "this is where you are."
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -1.5,           // sits flush with the rail's borderRight
          top: 8, bottom: 8,
          width: 3,
          borderRadius: '3px 0 0 3px',
          bgcolor: 'transparent',
          transition: 'background-color 140ms ease',
        },
        '&:hover': active ? {} : {
          bgcolor: inkstashColors.bgSunken,
          color: inkstashColors.ink,
        },
        '&:hover::after': active ? {} : { bgcolor: inkstashColors.brand },
        // Tooltip only renders when collapsed (full labels show inline
        // when expanded).
        '&:hover .hub-rail-tip': { opacity: collapsed ? 1 : 0 },
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
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
            fontSize: 13.5,
            fontWeight: active ? 700 : 600,
            color: 'inherit',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
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
