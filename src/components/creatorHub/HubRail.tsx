// src/components/creatorHub/HubRail.tsx
//
// Sticky vertical icon rail down the left edge of the Creator Hub.
// 76px wide. Each button is 48x48 with a 13px radius; the active item
// flips ink-on-white. A tooltip slides out to the right on hover and a
// small brand-red dot can flag attention-needed items (Live by default).

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
  /** Separated from the main rail by a hairline + spacer (Settings at bottom). */
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

interface Props {
  active: HubTabId;
  onChange: (id: HubTabId) => void;
  /** Set true while a stream owned by this seller is live so the Stream
   *  item gets the attention dot. */
  streamLive?: boolean;
}

export default function HubRail({ active, onChange, streamLive = false }: Props) {
  const mainItems = ITEMS.filter((i) => !i.bottom);
  const bottomItems = ITEMS.filter((i) => i.bottom);

  return (
    <Box
      component="nav"
      sx={{
        // Pinned to the left side. The page scrolls behind it; only the
        // rail's own content scrolls when there are too many items to fit.
        position: 'fixed',
        left: 0,
        top: 60, // sits under the sticky top bar
        height: 'calc(100vh - 60px)',
        width: 76,
        bgcolor: inkstashColors.bgElev,
        borderRight: `1px solid ${inkstashColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1.75,
        gap: 0.5,
        overflowY: 'auto',
        zIndex: 40,
      }}
    >
      {mainItems.map((item) => (
        <RailButton
          key={item.id}
          item={item}
          active={active === item.id}
          attention={item.id === 'stream' && streamLive && active !== item.id}
          onClick={() => onChange(item.id)}
        />
      ))}

      <Box sx={{ flex: 1 }} />
      <Box sx={{ width: 26, height: 1, bgcolor: inkstashColors.border, my: 1 }} />

      {bottomItems.map((item) => (
        <RailButton
          key={item.id}
          item={item}
          active={active === item.id}
          onClick={() => onChange(item.id)}
        />
      ))}
    </Box>
  );
}

function RailButton({
  item, active, attention = false, onClick,
}: {
  item: RailItem;
  active: boolean;
  attention?: boolean;
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
        width: 48,
        height: 48,
        borderRadius: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 0,
        cursor: 'pointer',
        bgcolor: active ? inkstashColors.ink : 'transparent',
        color: active ? '#fff' : inkstashColors.muted,
        transition: 'background-color 120ms ease, color 120ms ease',
        '&:hover': active ? {} : {
          bgcolor: inkstashColors.bgSunken,
          color: inkstashColors.ink,
        },
        '&:hover .hub-rail-tip': { opacity: 1 },
      }}
    >
      {item.icon}
      {attention && (
        <Box
          sx={{
            position: 'absolute',
            top: 9,
            right: 9,
            width: 7,
            height: 7,
            borderRadius: '50%',
            bgcolor: inkstashColors.brand,
            border: `1.5px solid ${inkstashColors.bgElev}`,
          }}
        />
      )}
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
    </Box>
  );
}
