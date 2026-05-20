// src/components/layout/appSidebarConfig.ts
import { Home, Package, Store, Repeat, Archive, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AppSidebarItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const appSidebarPrimary: AppSidebarItem[] = [
  { label: 'Home',         route: '/',            icon: Home },
  { label: 'Packs',        route: '/packs',       icon: Package },
  { label: 'Marketplace',  route: '/marketplace', icon: Store },
  { label: 'Live Breaks',  route: '/live',        icon: Repeat },
  { label: 'My Vault',     route: '/my-stash',    icon: Archive },
  { label: 'Leaderboard',  route: '/leaderboard', icon: Trophy },
];
