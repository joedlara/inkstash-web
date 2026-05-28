import { Home, Package, Store, Repeat, Ticket, Archive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AppSidebarItem {
  label: string;
  route: string;
  icon: LucideIcon;
  count?: number;
}

export const appSidebarPrimary: AppSidebarItem[] = [
  { label: 'Home',        route: '/',            icon: Home,    count: 81 },
  { label: 'Packs',       route: '/packs',       icon: Package, count: 8 },
  { label: 'Marketplace', route: '/marketplace', icon: Store },
  { label: 'Live Breaks', route: '/live',        icon: Repeat },
  { label: 'Raffles',     route: '/raffles',     icon: Ticket },
  { label: 'My Stash',    route: '/my-stash',    icon: Archive },
];

export interface AppSidebarEvent {
  label: string;
  route: string;
  gradient: [string, string];
  count: number;
}

export const appSidebarEvents: AppSidebarEvent[] = [
  { label: 'Monday Pack Drop',  route: '/drops',   gradient: ['#C2362F', '#5C1116'], count: 84 },
  { label: 'Friday Mystery',    route: '/drops',   gradient: ['#1F3A6E', '#0E1D3E'], count: 67 },
  { label: 'Grail Hunter',      route: '/raffles', gradient: ['#1A1A1A', '#000000'], count: 41 },
  { label: 'Silver Age Raffle', route: '/raffles', gradient: ['#3F6F4A', '#1B3024'], count: 28 },
];
