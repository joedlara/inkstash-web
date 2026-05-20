// src/data/handoffSeed.ts
// Static seed data ported from the Inkstash design handoff (data.js).
// Fictional packs and publishers — replace with Supabase queries when ready.

export interface Publisher {
  id: string;
  name: string;
  tag: string;
  count: number;
  gradient: [string, string];
}

export interface Pack {
  id: string;
  title: string;
  publisher: string;
  category: 'variant' | 'firstissues' | 'graded' | 'indie';
  price: number;
  cards: number;
  gradient: [string, string];
  seal: string;
  footLabel: string;
  cardCount: number;
  hot?: boolean;
  premium?: boolean;
}

export interface LiveBreak {
  id: string;
  host: string;
  title: string;
  viewers: number;
  gradient: [string, string];
  live: boolean;
  packLabel: string;
}

export interface TrendingItem {
  rank: number;
  title: string;
  bids: number;
  seller: string;
  price: number;
}

export interface DiscoverCard {
  id: 'app' | 'vault' | 'idea';
  title: string;
  sub: string;
  art: 'phone' | 'vault' | 'idea';
}

export const PUBLISHERS: Publisher[] = [
  { id: 'thunder',   name: 'Thunder Comics',  tag: 'Major', count: 84, gradient: ['#C2362F', '#5C1116'] },
  { id: 'meridian',  name: 'Meridian Press',  tag: 'Major', count: 67, gradient: ['#1F3A6E', '#0E1D3E'] },
  { id: 'pulpworks', name: 'Pulpworks',       tag: 'Indie', count: 41, gradient: ['#1A1A1A', '#000000'] },
  { id: 'longshot',  name: 'Longshot Studio', tag: 'Indie', count: 28, gradient: ['#3F6F4A', '#1B3024'] },
];

export const PACKS: Pack[] = [
  { id: 'p1', title: 'Variant Vault: Vol. 7',  publisher: 'thunder',   category: 'variant',     price: 29,  cards: 4, gradient: ['#C2362F', '#5C1116'], seal: 'TC', footLabel: 'Series VII · Sealed',     cardCount: 1240, hot: true },
  { id: 'p2', title: 'Crimson Wave #1s',       publisher: 'thunder',   category: 'firstissues', price: 89,  cards: 3, gradient: ['#7A1A21', '#2E0A0D'], seal: '#1', footLabel: 'Debut Issues · Vol. III', cardCount: 412 },
  { id: 'p3', title: 'Indigo Files',           publisher: 'meridian',  category: 'variant',     price: 45,  cards: 4, gradient: ['#1F3A6E', '#0E1D3E'], seal: 'M',  footLabel: 'Meridian Variants',       cardCount: 880 },
  { id: 'p4', title: 'Slab Heat: Modern',      publisher: 'thunder',   category: 'graded',      price: 249, cards: 2, gradient: ['#1A1A1A', '#000000'], seal: '10', footLabel: 'Graded · PSA / CGC',       cardCount: 96,  premium: true },
  { id: 'p5', title: 'Pulpworks Drop 03',      publisher: 'pulpworks', category: 'indie',       price: 18,  cards: 5, gradient: ['#1A1A1A', '#000000'], seal: 'P',  footLabel: 'Small Press · 2024',       cardCount: 540 },
  { id: 'p6', title: 'Longshot Sketch',        publisher: 'longshot',  category: 'indie',       price: 12,  cards: 6, gradient: ['#3F6F4A', '#1B3024'], seal: 'L',  footLabel: 'Sketch Edition',           cardCount: 320 },
  { id: 'p7', title: 'Holographic Heroes',     publisher: 'meridian',  category: 'variant',     price: 65,  cards: 4, gradient: ['#5B3DB8', '#2A1A5C'], seal: 'H',  footLabel: 'Foil Variant Box',         cardCount: 624 },
  { id: 'p8', title: 'Grail Hunter Pro',       publisher: 'thunder',   category: 'graded',      price: 499, cards: 1, gradient: ['#B8893A', '#5C3F0F'], seal: 'AU', footLabel: 'Premium Slab · 1 Card',    cardCount: 24,  premium: true },
];

export const LIVE_BREAKS: LiveBreak[] = [
  { id: 'lb1', host: 'collector.miko', title: 'Grail Hunter Pro — $499 pack attempt',  viewers: 521, gradient: ['#1F3A6E', '#0E1D3E'], live: true, packLabel: 'Grail Hunter Pro' },
  { id: 'lb2', host: 'panelfan',       title: 'Sunday Silver Age Showcase',            viewers: 312, gradient: ['#C2362F', '#5C1116'], live: true, packLabel: 'Crimson Wave #1s' },
  { id: 'lb3', host: 'slabhound',      title: 'Modern Slab Marathon — 30 pack rip',    viewers: 201, gradient: ['#1A1A1A', '#3A3A3A'], live: true, packLabel: 'Slab Heat: Modern' },
  { id: 'lb4', host: 'inkstain.tv',    title: 'Indie Press Hour ft. Longshot Studio',  viewers: 88,  gradient: ['#B8893A', '#5C3F0F'], live: true, packLabel: 'Pulpworks Drop 03' },
];

export const TRENDING_WEEK: TrendingItem[] = [
  { rank: 1, title: 'Static Knight #1 — First Print Edition (CGC 9.8)',   bids: 12, seller: '@collector.miko', price: 4800 },
  { rank: 2, title: 'Wraithline #11 — Inkwell Variant (CGC 9.6)',          bids: 11, seller: '@slabhound',       price: 4200 },
  { rank: 3, title: 'Calliope #1 — Original Cover signed (CBCS 9.4)',      bids: 11, seller: '@foiledagain',     price: 2400 },
  { rank: 4, title: 'Hollow Crown #4 — Foil Pulpworks Variant (CGC 9.8)',  bids: 9,  seller: '@panelfan',        price: 1240 },
  { rank: 5, title: 'Brass Lantern #2 — Sketch Edition (CGC 9.6)',         bids: 9,  seller: '@inkstain',        price: 620  },
  { rank: 6, title: 'Iron Tabula Vol. 3 #2 — Signed Print Run (CBCS 9.4)', bids: 7,  seller: '@thunderboy.04',   price: 330  },
];

export const DISCOVER: DiscoverCard[] = [
  { id: 'app',   title: 'Get the app',     sub: 'Rip packs and watch breaks from anywhere. iOS & Android.',                         art: 'phone' },
  { id: 'vault', title: "Vault, don't ship", sub: 'Store slabs directly from CGC, CBCS, and eBay. Trade without touching them.',     art: 'vault' },
  { id: 'idea',  title: 'Got an idea?',    sub: 'We build what collectors actually want. Tell us what to ship next.',               art: 'idea'  },
];
