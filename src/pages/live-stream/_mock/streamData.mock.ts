// Live Stream — mocked data layer for Phase 2 prototype port.
// Ported 1:1 from docs/design-system/live_stream/stream-data.js.
// This file is replaced in Phase 3 by real Supabase queries.

export type Gradient = readonly [string, string];

export type MockHost = {
  name: string;
  rating: number;
  viewers: number;
  followers: string;
  verified: boolean;
  gradient: Gradient;
};

export type MockCurrent = {
  winner: string;
  item: string;
  bids: number;
  shipping: string;
  price: number;
  status: string;
};

export type MockGiveaway = {
  entries: number;
  item: string;
  qty: number;
};

export type MockProduct = {
  id: string;
  name: string;
  price: number;
  bids: number;
  qty: number;
  gradient: Gradient;
};

export type MockUpcoming = {
  id: string;
  name: string;
  qty: number;
  gradient: Gradient;
};

export type MockChatMessage = {
  user: string;
  text: string;
  q?: boolean;
  mention?: string;
};

export const mockHost: MockHost = {
  name: 'thundervault',
  rating: 4.9,
  viewers: 62,
  followers: '12.4k',
  verified: true,
  gradient: ['#C2362F', '#5C1116'],
};

export const mockCurrent: MockCurrent = {
  winner: 'collector.miko',
  item: 'VAULT BOX / MED #68',
  bids: 14,
  shipping: '$6.09 + Taxes',
  price: 21,
  status: 'Sold',
};

export const mockGiveaway: MockGiveaway = {
  entries: 42,
  item: 'CRIMSON WAVE BOOSTER #8',
  qty: 43,
};

export const mockProducts: MockProduct[] = [
  { id: 'pr1', name: 'MYSTERY SLAB / MED', price: 1, bids: 0, qty: 201, gradient: ['#1F3A6E', '#0E1D3E'] },
  { id: 'pr2', name: 'VAULT BOX / LARGE', price: 1, bids: 0, qty: 875, gradient: ['#C2362F', '#5C1116'] },
  { id: 'pr3', name: 'VARIETY RIPS', price: 1, bids: 0, qty: 126, gradient: ['#3F6F4A', '#1B3024'] },
];

export const mockUpcoming: MockUpcoming[] = [
  { id: 'up1', name: 'CRIMSON WAVE BOOSTER', qty: 43, gradient: ['#7A1A21', '#2E0A0D'] },
];

export const mockChat: MockChatMessage[] = [
  { user: 'inkkid', text: 'What are those slabs on the left?', q: true },
  { user: 'inkkid', text: 'Is that the Calliope variant?', q: true },
  { user: 'panelfan', text: '@inkkid 2 perfect order, 2 chaos packs', mention: '@inkkid' },
  { user: 'slabhound', text: '@inkkid those are the new graded grails, comes with a promo', mention: '@inkkid' },
  { user: 'inkkid', text: 'How much?!?', q: true },
  { user: 'thunderboy.04', text: 'Send it 🔥' },
  { user: 'foiledagain', text: 'Would you run the Wraithline ETB at set price end of show?', q: true },
  { user: 'skrim_jew', text: 'What if I want to open it??', q: true },
  { user: 'richiepun', text: "I'll stay the whole show in case I need it for the zekrom run" },
  { user: 'pulpmaster', text: 'Hellooooo my friends!!! Love you both!!!' },
  { user: 'nixatnight', text: 'How many cards in the new Static Knight box?', q: true },
  { user: 'mrsharkey65', text: 'So what was that slab on the left I lagged out' },
  { user: 'gradedgoddess', text: 'Whats up everyone??? Beautiful people today??' },
  { user: 'samscards3', text: "That's only 30 wdym" },
  { user: 'rogerthat113', text: 'ETB 🙏' },
  { user: 'carzdamadre3', text: 'Eve' },
  { user: 'inevitable916', text: "Let's go chat" },
  { user: 'shibby015', text: 'AH ETB 🙏' },
];
