import { Home, Package, Radio, Store, Trophy, Sparkles, Archive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SideNavItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const sideNavPrimary: SideNavItem[] = [
  { label: 'Home',         route: '/',            icon: Home },
  { label: 'Packs',        route: '/packs',       icon: Package },
  { label: 'Live Breaks',  route: '/live',        icon: Radio },
  { label: 'Marketplace',  route: '/marketplace', icon: Store },
  { label: 'Leaderboard',  route: '/leaderboard', icon: Trophy },
];

export const sideNavEvents: SideNavItem[] = [
  { label: 'Spider-Verse Raffle', route: '/raffles', icon: Sparkles },
  { label: 'Golden Age Vault',    route: '/drops',   icon: Archive },
];
