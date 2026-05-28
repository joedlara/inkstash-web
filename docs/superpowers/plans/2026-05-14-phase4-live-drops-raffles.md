# Phase 4 — Live Drops & Raffles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `/drops` and `/raffles` to real Supabase data, add DB tables for drops and raffles, and replace the hardcoded home page drop countdown with live data.

**Architecture:** Two new DB tables (`drops`, `raffles` + `raffle_tickets`) with RLS and seed data. A shared `src/api/dropsRaffles.ts` API module handles all queries with static fallbacks. `Drops.tsx` and `Raffles.tsx` are replaced with full implementations pulling from Supabase. `Home.tsx` drop countdown banner is wired to the next upcoming drop from the DB. `Live.tsx` is already complete — no changes needed.

**Tech Stack:** React 19, MUI v7, TypeScript, Supabase (Postgres + RLS), Lucide icons, Outfit + DM Mono fonts. No framer-motion. No new npm dependencies.

---

## Design Tokens (use in every file, do not redefine)

```ts
const T = {
  bg:        '#08080e',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.5)',
  dimmed:    'rgba(241,245,249,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260514000001_create_drops_raffles.sql` | **Create** | drops, raffles, raffle_tickets tables + RLS + seed data |
| `src/api/dropsRaffles.ts` | **Create** | All Supabase queries for drops and raffles with fallback data |
| `src/pages/Drops.tsx` | **Replace** | Full drops page wired to real data |
| `src/pages/Raffles.tsx` | **Replace** | Full raffles page wired to real data |
| `src/pages/Home.tsx` | **Modify** | Wire drop countdown banner to next upcoming drop from DB |

---

## Task 1: DB Migration — drops, raffles, raffle_tickets

**Files:**
- Create: `supabase/migrations/20260514000001_create_drops_raffles.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- ── drops ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  partner      text NOT NULL DEFAULT 'InkStash House',
  description  text,
  drop_at      timestamptz NOT NULL,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  quantity     int NOT NULL CHECK (quantity > 0),
  remaining    int NOT NULL CHECK (remaining >= 0),
  status       text NOT NULL DEFAULT 'upcoming'
                 CHECK (status IN ('upcoming','live','ended')),
  image_url    text,
  tags         text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT drops_remaining_lte_quantity CHECK (remaining <= quantity)
);

-- ── raffles ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raffles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_title      text NOT NULL,
  item_image_url  text,
  estimated_value numeric(10,2),
  ticket_price    numeric(10,2) NOT NULL CHECK (ticket_price > 0),
  max_spots       int NOT NULL CHECK (max_spots > 0),
  spots_filled    int NOT NULL DEFAULT 0 CHECK (spots_filled >= 0),
  status          text NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','live','ended')),
  ends_at         timestamptz NOT NULL,
  livestream_id   uuid REFERENCES public.livestreams(id) ON DELETE SET NULL,
  winner_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raffles_spots_filled_lte_max CHECK (spots_filled <= max_spots)
);

-- ── raffle_tickets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.raffle_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id   uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity    int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drops_status   ON public.drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_drop_at  ON public.drops(drop_at);
CREATE INDEX IF NOT EXISTS idx_raffles_status ON public.raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON public.raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_user_id   ON public.raffle_tickets(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.drops          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;

-- drops: anyone can read
CREATE POLICY "drops_read_public" ON public.drops
  FOR SELECT USING (true);

-- raffles: anyone can read
CREATE POLICY "raffles_read_public" ON public.raffles
  FOR SELECT USING (true);

-- raffle_tickets: users can read their own tickets
CREATE POLICY "raffle_tickets_read_own" ON public.raffle_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- raffle_tickets: users can insert their own tickets
CREATE POLICY "raffle_tickets_insert_own" ON public.raffle_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Seed data ─────────────────────────────────────────────────────────────────
INSERT INTO public.drops (id, name, partner, description, drop_at, price, quantity, remaining, status, image_url, tags)
VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    'Spawn Origins Pack',
    'Image Comics × InkStash',
    'First 300 issues distilled into a 6-card blind bag. Legendary pulls include graded #1 slabs.',
    now() + interval '2 hours 34 minutes',
    29.99, 500, 347, 'upcoming',
    'https://picsum.photos/seed/spawn1/800/420',
    ARRAY['Comics', 'Keys', 'Graded']
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'Marvel Keys Collab',
    'Marvel × InkStash',
    'Exclusive Marvel key issues — first appearances, death issues, and variant covers.',
    now() + interval '1 day 3 hours',
    39.99, 300, 300, 'upcoming',
    'https://picsum.photos/seed/marvel2/800/420',
    ARRAY['Comics', 'Keys', 'Marvel']
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'DC Rebirth Variants',
    'DC × InkStash',
    'Rare variant covers from the DC Rebirth era. Limited to 200 packs.',
    now() + interval '3 days',
    24.99, 200, 200, 'upcoming',
    'https://picsum.photos/seed/dc2/800/420',
    ARRAY['Comics', 'Variants', 'DC']
  )
ON CONFLICT (id) DO NOTHING;
```

Save to `supabase/migrations/20260514000001_create_drops_raffles.sql`.

- [ ] **Step 2: Push migration to remote**

```bash
supabase db push
```

Expected output:
```
Applying migration 20260514000001_create_drops_raffles.sql...
Finished supabase db push.
```

- [ ] **Step 3: Verify tables exist on remote**

```bash
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('drops','raffles','raffle_tickets') ORDER BY table_name"
```

Expected: 3 rows — `drops`, `raffle_tickets`, `raffles`.

```bash
supabase db query --linked "SELECT id, name, status, drop_at FROM public.drops ORDER BY drop_at"
```

Expected: 3 rows of seed data.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260514000001_create_drops_raffles.sql
git commit -m "feat: add drops, raffles, raffle_tickets DB tables with seed data"
```

---

## Task 2: API Layer — src/api/dropsRaffles.ts

**Files:**
- Create: `src/api/dropsRaffles.ts`

- [ ] **Step 1: Create the API module**

```ts
import { supabase } from './supabase/supabaseClient';

export interface Drop {
  id: string;
  name: string;
  partner: string;
  description: string | null;
  drop_at: string;
  price: number;
  quantity: number;
  remaining: number;
  status: 'upcoming' | 'live' | 'ended';
  image_url: string | null;
  tags: string[];
  created_at: string;
}

export interface Raffle {
  id: string;
  item_title: string;
  item_image_url: string | null;
  estimated_value: number | null;
  ticket_price: number;
  max_spots: number;
  spots_filled: number;
  status: 'upcoming' | 'live' | 'ended';
  ends_at: string;
  livestream_id: string | null;
  winner_user_id: string | null;
  seller_id: string;
  created_at: string;
  seller_username?: string | null;
  seller_avatar?: string | null;
}

// ── Fallback data ─────────────────────────────────────────────────────────────

export const FALLBACK_DROPS: Drop[] = [
  {
    id: 'd1', name: 'Spawn Origins Pack', partner: 'Image Comics × InkStash',
    description: 'First 300 issues distilled into a 6-card blind bag. Legendary pulls include graded #1 slabs.',
    drop_at: new Date(Date.now() + 2 * 3600000 + 34 * 60000).toISOString(),
    price: 29.99, quantity: 500, remaining: 347, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/spawn1/800/420',
    tags: ['Comics', 'Keys', 'Graded'], created_at: '',
  },
  {
    id: 'd2', name: 'Marvel Keys Collab', partner: 'Marvel × InkStash',
    description: 'Exclusive Marvel key issues — first appearances, death issues, and variant covers.',
    drop_at: new Date(Date.now() + 27 * 3600000).toISOString(),
    price: 39.99, quantity: 300, remaining: 300, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/marvel2/800/420',
    tags: ['Comics', 'Keys', 'Marvel'], created_at: '',
  },
  {
    id: 'd3', name: 'DC Rebirth Variants', partner: 'DC × InkStash',
    description: 'Rare variant covers from the DC Rebirth era. Limited to 200 packs.',
    drop_at: new Date(Date.now() + 72 * 3600000).toISOString(),
    price: 24.99, quantity: 200, remaining: 200, status: 'upcoming',
    image_url: 'https://picsum.photos/seed/dc2/800/420',
    tags: ['Comics', 'Variants', 'DC'], created_at: '',
  },
];

export const FALLBACK_RAFFLES: Raffle[] = [
  {
    id: 'r1', item_title: 'ASM #300 CGC 9.8 — 1st Venom',
    item_image_url: 'https://picsum.photos/seed/asm300/480/480',
    estimated_value: 1200, ticket_price: 15, max_spots: 100, spots_filled: 73,
    status: 'live', ends_at: new Date(Date.now() + 45 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'comicvaultpdx', seller_avatar: null, created_at: '',
  },
  {
    id: 'r2', item_title: 'Wolverine #1 CGC 9.4 — 1982 Limited Series',
    item_image_url: 'https://picsum.photos/seed/wolv1/480/480',
    estimated_value: 3800, ticket_price: 25, max_spots: 50, spots_filled: 50,
    status: 'ended', ends_at: new Date(Date.now() - 30 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'slabkingPDX', seller_avatar: null, created_at: '',
  },
  {
    id: 'r3', item_title: 'X-Men #1 FN/VF — 1963 Silver Age',
    item_image_url: 'https://picsum.photos/seed/xmen1/480/480',
    estimated_value: 1800, ticket_price: 50, max_spots: 40, spots_filled: 12,
    status: 'upcoming', ends_at: new Date(Date.now() + 3 * 3600000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'silveragedan', seller_avatar: null, created_at: '',
  },
  {
    id: 'r4', item_title: 'Spawn #1 Raw NM — Todd McFarlane Signed',
    item_image_url: 'https://picsum.photos/seed/spawn300/480/480',
    estimated_value: 450, ticket_price: 10, max_spots: 200, spots_filled: 118,
    status: 'live', ends_at: new Date(Date.now() + 22 * 60000).toISOString(),
    livestream_id: null, winner_user_id: null, seller_id: '',
    seller_username: 'imagecollect', seller_avatar: null, created_at: '',
  },
];

// ── Queries ───────────────────────────────────────────────────────────────────

export const dropsAPI = {
  async list(): Promise<Drop[]> {
    const { data, error } = await supabase
      .from('drops')
      .select('*')
      .in('status', ['upcoming', 'live'])
      .order('drop_at', { ascending: true });

    if (error || !data || data.length === 0) return FALLBACK_DROPS;
    return data as Drop[];
  },

  async getNextUpcoming(): Promise<Drop | null> {
    const { data, error } = await supabase
      .from('drops')
      .select('*')
      .in('status', ['upcoming', 'live'])
      .order('drop_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return FALLBACK_DROPS[0];
    return data as Drop;
  },
};

export const rafflesAPI = {
  async list(): Promise<Raffle[]> {
    const { data, error } = await supabase
      .from('raffles')
      .select('*')
      .in('status', ['upcoming', 'live', 'ended'])
      .order('ends_at', { ascending: true })
      .limit(20);

    if (error || !data || data.length === 0) return FALLBACK_RAFFLES;

    const sellerIds = [...new Set(data.map((r: any) => r.seller_id).filter(Boolean))] as string[];
    const usersMap = new Map<string, { username: string; avatar_url: string | null }>();

    if (sellerIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .in('id', sellerIds);
      (users || []).forEach((u: any) => usersMap.set(u.id, { username: u.username, avatar_url: u.avatar_url }));
    }

    return data.map((row: any) => {
      const u = usersMap.get(row.seller_id);
      return {
        ...row,
        seller_username: u?.username ?? null,
        seller_avatar: u?.avatar_url ?? null,
      } as Raffle;
    });
  },
};
```

Save to `src/api/dropsRaffles.ts`.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/api/dropsRaffles.ts
git commit -m "feat: add dropsRaffles API module with Supabase queries and fallback data"
```

---

## Task 3: Drops.tsx — Full implementation wired to real data

**Files:**
- Modify: `src/pages/Drops.tsx` (full replacement)

- [ ] **Step 1: Replace Drops.tsx**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack, Button, Chip, Skeleton, LinearProgress } from '@mui/material';
import { Zap, Clock, Package, Bell, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { dropsAPI, FALLBACK_DROPS } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';

const T = {
  bg:        '#08080e',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.5)',
  dimmed:    'rgba(241,245,249,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

function useCountdownTo(isoTarget: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(isoTarget).getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, new Date(isoTarget).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [isoTarget]);
  const h = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return { h, m, s, done: remaining === 0 };
}

function DropCountdown({ drop_at }: { drop_at: string }) {
  const { h, m, s, done } = useCountdownTo(drop_at);
  if (done) return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
      <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.78rem', color: T.live }}>LIVE NOW</Typography>
    </Box>
  );
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {[h, m, s].map((unit, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ bgcolor: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 0.75, px: 1, py: 0.4, fontWeight: 800, fontSize: '0.8rem', color: '#fbbf24', fontFamily: T.mono, minWidth: 30, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {unit}
          </Box>
          {i < 2 && <Typography sx={{ color: 'rgba(217,119,6,0.4)', fontSize: '0.75rem' }}>:</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

function DropCard({ drop }: { drop: Drop }) {
  const navigate = useNavigate();
  const soldPct = Math.round(((drop.quantity - drop.remaining) / drop.quantity) * 100);
  const isLive = drop.status === 'live';

  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${isLive ? 'rgba(239,68,68,0.25)' : T.border}`, borderRadius: 2.5, overflow: 'hidden', transition: 'border-color 0.18s, transform 0.18s', '&:hover': { borderColor: isLive ? 'rgba(239,68,68,0.45)' : T.borderLit, transform: 'translateY(-3px)' } }}>
      {/* Image */}
      <Box sx={{ position: 'relative', height: { xs: 160, md: 200 }, overflow: 'hidden', bgcolor: T.surfaceB }}>
        {drop.image_url && (
          <Box component="img" src={drop.image_url} alt={drop.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,14,0.9) 0%, transparent 55%)' }} />
        {/* Status badge */}
        <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: isLive ? T.live : 'rgba(217,119,6,0.15)', border: `1px solid ${isLive ? T.live : 'rgba(217,119,6,0.35)'}`, color: isLive ? '#fff' : T.gold, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.08em', px: 0.9, py: 0.4, borderRadius: 0.75 }}>
          <Zap size={8} strokeWidth={2.5} />
          {isLive ? 'LIVE' : 'UPCOMING'}
        </Box>
        {/* Tag chips */}
        <Stack direction="row" gap={0.5} sx={{ position: 'absolute', bottom: 10, left: 10 }}>
          {drop.tags.slice(0, 3).map(tag => (
            <Box key={tag} sx={{ px: 0.7, py: 0.2, borderRadius: 0.5, bgcolor: 'rgba(8,8,14,0.75)', color: T.muted, fontSize: '0.52rem', fontWeight: 600, fontFamily: T.mono }}>{tag}</Box>
          ))}
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 1.75, md: 2 } }}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: T.white, lineHeight: 1.2, mb: 0.35 }}>{drop.name}</Typography>
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, mb: 1.25 }}>{drop.partner}</Typography>
        {drop.description && (
          <Typography sx={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.6, mb: 1.5 }} noWrap>{drop.description}</Typography>
        )}

        {/* Progress bar */}
        <Box sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.dimmed }}>{drop.quantity - drop.remaining} / {drop.quantity} claimed</Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: soldPct > 80 ? T.live : T.dimmed }}>{soldPct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={soldPct} sx={{ height: 4, borderRadius: 2, bgcolor: T.surfaceB, '& .MuiLinearProgress-bar': { bgcolor: soldPct > 80 ? T.live : T.blue, borderRadius: 2 } }} />
        </Box>

        {/* Footer */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.58rem', color: T.dimmed, letterSpacing: '0.05em', mb: 0.15 }}>
              {isLive ? 'LIVE NOW' : 'DROPS IN'}
            </Typography>
            {isLive
              ? <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.88rem', color: T.live }}>Open now</Typography>
              : <DropCountdown drop_at={drop.drop_at} />
            }
          </Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '1rem', color: T.white }}>${drop.price.toFixed(2)}</Typography>
            <Button variant="contained" size="small" onClick={() => navigate('/packs')} disabled={!isLive} sx={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', px: 2, py: 0.75, bgcolor: isLive ? T.blue : 'rgba(55,65,81,0.6)', color: isLive ? '#fff' : '#6b7280', borderRadius: 1.25, boxShadow: 'none', '&:hover': { bgcolor: isLive ? '#005fcc' : 'rgba(55,65,81,0.6)', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' } }}>
              {isLive ? 'Buy Now' : 'Notify Me'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function DropSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={200} sx={{ bgcolor: T.surfaceB }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="65%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="45%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: T.surfaceB, borderRadius: 2, mt: 0.5 }} />
        <Skeleton variant="rectangular" height={32} sx={{ bgcolor: T.surfaceB, borderRadius: 1.25, mt: 0.5 }} />
      </Box>
    </Box>
  );
}

export default function Drops() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dropsAPI.list();
      setDrops(data);
    } catch {
      setDrops(FALLBACK_DROPS);
      setError('Using preview data — DB unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const liveDrops      = drops.filter(d => d.status === 'live');
  const upcomingDrops  = drops.filter(d => d.status === 'upcoming');

  return (
    <>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg }}>
        <DashboardHeader />
        <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

          {/* Header */}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={4}>
            <Box>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Drops</Typography>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mt: 0.5 }}>Publisher collabs and InkStash house drops — first come, first served</Typography>
            </Box>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <Bell size={13} strokeWidth={2} color={T.dimmed} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.68rem', color: T.dimmed }}>{drops.length} drop{drops.length !== 1 ? 's' : ''} scheduled</Typography>
            </Stack>
          </Stack>

          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
              <AlertCircle size={13} color={T.live} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.68rem', color: T.live }}>{error}</Typography>
            </Box>
          )}

          {/* Live drops */}
          {(loading || liveDrops.length > 0) && (
            <Box sx={{ mb: { xs: 5, md: 6 } }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
                <Box sx={{ width: 7, height: 7, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
                <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: T.white }}>Live Now</Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {loading ? [1,2].map(i => <DropSkeleton key={i} />) : liveDrops.map(d => <DropCard key={d.id} drop={d} />)}
              </Box>
            </Box>
          )}

          {/* Upcoming drops */}
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={2.5}>
              <Clock size={15} strokeWidth={2} color={T.gold} />
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: T.white }}>Upcoming</Typography>
            </Stack>
            {loading ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {[1,2,3].map(i => <DropSkeleton key={i} />)}
              </Box>
            ) : upcomingDrops.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1.5 }}>
                <Package size={28} strokeWidth={1.25} color={T.dimmed} />
                <Typography sx={{ fontFamily: T.mono, fontSize: '0.8rem', color: T.dimmed }}>No upcoming drops scheduled</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                {upcomingDrops.map(d => <DropCard key={d.id} drop={d} />)}
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Drops.tsx
git commit -m "feat: wire Drops page to real Supabase data with countdown timers and progress bars"
```

---

## Task 4: Raffles.tsx — Full implementation wired to real data

**Files:**
- Modify: `src/pages/Raffles.tsx` (full replacement)

- [ ] **Step 1: Replace Raffles.tsx**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Container, Typography, Stack, Button, Avatar, LinearProgress, Chip, Skeleton } from '@mui/material';
import { Ticket, Clock, AlertCircle, Radio } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { rafflesAPI, FALLBACK_RAFFLES } from '../api/dropsRaffles';
import type { Raffle } from '../api/dropsRaffles';

const T = {
  bg:        '#08080e',
  surface:   '#0f0f18',
  surfaceB:  '#141420',
  border:    'rgba(255,255,255,0.07)',
  borderLit: 'rgba(255,255,255,0.13)',
  blue:      '#0078FF',
  live:      '#ef4444',
  gold:      '#d97706',
  green:     '#10b981',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.5)',
  dimmed:    'rgba(241,245,249,0.22)',
  mono:      "'DM Mono', 'Courier New', monospace",
};

const STATUS_META: Record<Raffle['status'], { label: string; bg: string; fg: string }> = {
  live:     { label: 'LIVE',     bg: T.live,                     fg: '#fff' },
  upcoming: { label: 'UPCOMING', bg: 'rgba(217,119,6,0.15)',     fg: T.gold },
  ended:    { label: 'ENDED',    bg: 'rgba(55,65,81,0.7)',        fg: '#6b7280' },
};

function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function RaffleCard({ raffle }: { raffle: Raffle }) {
  const pct = Math.round((raffle.spots_filled / raffle.max_spots) * 100);
  const sm = STATUS_META[raffle.status];
  const isLive = raffle.status === 'live';
  const isEnded = raffle.status === 'ended';
  const spotsLeft = raffle.max_spots - raffle.spots_filled;

  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${isLive ? 'rgba(239,68,68,0.2)' : T.border}`, borderRadius: 2.5, overflow: 'hidden', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, transition: 'border-color 0.18s', '&:hover': { borderColor: isLive ? 'rgba(239,68,68,0.38)' : T.borderLit } }}>
      {/* Image */}
      <Box sx={{ position: 'relative', width: { xs: '100%', sm: 160 }, height: { xs: 160, sm: 'auto' }, flexShrink: 0, bgcolor: T.surfaceB, overflow: 'hidden' }}>
        {raffle.item_image_url && (
          <Box component="img" src={raffle.item_image_url} alt={raffle.item_title} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isEnded ? 'grayscale(60%) brightness(0.6)' : 'none' }} />
        )}
        <Box sx={{ position: 'absolute', top: 8, left: 8, px: 0.75, py: 0.3, borderRadius: 0.6, bgcolor: sm.bg, border: `1px solid ${isLive ? T.live : 'transparent'}`, color: sm.fg, fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.07em' }}>
          {sm.label}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 2, md: 2.25 }, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        <Box>
          <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: isEnded ? T.dimmed : T.white, lineHeight: 1.25, mb: 0.3 }} noWrap>
            {raffle.item_title}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <Avatar src={raffle.seller_avatar || undefined} sx={{ width: 18, height: 18, fontSize: '0.55rem', bgcolor: T.blue }}>
              {(raffle.seller_username?.[0] ?? 'I').toUpperCase()}
            </Avatar>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.63rem', color: T.dimmed }}>@{raffle.seller_username ?? 'inkstash'}</Typography>
            {raffle.estimated_value && (
              <Chip label={`Est. $${raffle.estimated_value.toLocaleString()}`} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.1)', color: T.green, '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Stack>
        </Box>

        {/* Progress */}
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={0.6}>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.dimmed }}>{raffle.spots_filled} / {raffle.max_spots} spots filled</Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: pct >= 80 ? T.live : T.dimmed }}>{pct}% full</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, bgcolor: T.surfaceB, '& .MuiLinearProgress-bar': { bgcolor: pct >= 80 ? T.live : T.blue, borderRadius: 2 } }} />
        </Box>

        {/* Footer */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" gap={0.6}>
            <Clock size={12} strokeWidth={2} color={T.dimmed} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: isEnded ? T.dimmed : T.muted }}>
              {isEnded ? 'Ended' : timeLeft(raffle.ends_at)}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.dimmed, letterSpacing: '0.05em' }}>TICKET</Typography>
              <Typography sx={{ fontFamily: T.mono, fontWeight: 800, fontSize: '0.9rem', color: isEnded ? T.dimmed : T.white }}>${raffle.ticket_price.toFixed(2)}</Typography>
            </Box>
            <Button variant="contained" size="small" disabled={isEnded || raffle.spots_filled >= raffle.max_spots} sx={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', px: 2, py: 0.75, bgcolor: isEnded ? 'rgba(55,65,81,0.6)' : T.blue, color: isEnded ? '#6b7280' : '#fff', borderRadius: 1.25, boxShadow: 'none', '&:hover': { bgcolor: '#005fcc', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' } }}>
              {isEnded ? 'Ended' : raffle.spots_filled >= raffle.max_spots ? 'Full' : `Enter · ${spotsLeft} left`}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function RaffleSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden', display: 'flex', height: 160 }}>
      <Skeleton variant="rectangular" width={160} sx={{ bgcolor: T.surfaceB, flexShrink: 0 }} />
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="40%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={4} sx={{ bgcolor: T.surfaceB, borderRadius: 2, mt: 'auto' }} />
      </Box>
    </Box>
  );
}

export default function Raffles() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rafflesAPI.list();
      setRaffles(data);
    } catch {
      setRaffles(FALLBACK_RAFFLES);
      setError('Using preview data — DB unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? raffles : raffles.filter(r => r.status === filter);
  const liveCount = raffles.filter(r => r.status === 'live').length;

  const FILTERS = [
    { key: 'all' as const,     label: 'All' },
    { key: 'live' as const,    label: 'Live' },
    { key: 'upcoming' as const,label: 'Upcoming' },
    { key: 'ended' as const,   label: 'Ended' },
  ];

  return (
    <>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.6)} }`}</style>
      <Box sx={{ minHeight: '100dvh', bgcolor: T.bg }}>
        <DashboardHeader />
        <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

          {/* Header */}
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={3.5}>
            <Box>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.4rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Raffles</Typography>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mt: 0.5 }}>Win rare comics from live stream hosts — one ticket gets you in</Typography>
            </Box>
            {liveCount > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: T.live, fontSize: '0.75rem', fontWeight: 700, px: 1.5, py: 0.7, borderRadius: 999 }}>
                <Box sx={{ width: 6, height: 6, bgcolor: T.live, borderRadius: '50%', animation: 'livePulse 1.6s ease-in-out infinite' }} />
                {liveCount} raffle{liveCount !== 1 ? 's' : ''} live
              </Box>
            )}
          </Stack>

          {/* Filter chips */}
          <Stack direction="row" gap={0.75} mb={3.5} flexWrap="wrap">
            {FILTERS.map(f => (
              <Box key={f.key} onClick={() => setFilter(f.key)} sx={{ px: 1.5, py: 0.6, borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s', color: filter === f.key ? T.white : T.muted, bgcolor: filter === f.key ? 'rgba(255,255,255,0.09)' : 'transparent', border: `1px solid ${filter === f.key ? T.borderLit : 'transparent'}`, '&:hover': { color: T.white, bgcolor: 'rgba(255,255,255,0.05)' } }}>
                {f.label}
              </Box>
            ))}
          </Stack>

          {error && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
              <AlertCircle size={13} color={T.live} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.68rem', color: T.live }}>{error}</Typography>
            </Box>
          )}

          {/* List */}
          <Stack gap={2}>
            {loading
              ? [1,2,3,4].map(i => <RaffleSkeleton key={i} />)
              : filtered.length === 0
              ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 1.5 }}>
                  <Ticket size={28} strokeWidth={1.25} color={T.dimmed} />
                  <Typography sx={{ fontFamily: T.mono, fontSize: '0.8rem', color: T.dimmed }}>No {filter === 'all' ? '' : filter} raffles right now</Typography>
                </Box>
              )
              : filtered.map(r => <RaffleCard key={r.id} raffle={r} />)
            }
          </Stack>
        </Container>
      </Box>
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Raffles.tsx
git commit -m "feat: wire Raffles page to real Supabase data with ticket entry UI and filter tabs"
```

---

## Task 5: Home.tsx — Wire drop countdown banner to live DB data

**Files:**
- Modify: `src/pages/Home.tsx`

The home page currently has two hardcoded countdown banners — one in `SplashPage` and one in the authenticated `Home` component. Both use `useCountdown(2 * 3600 + 34 * 60 + 11)` with a hardcoded drop name. Replace both with a `useNextDrop` hook that fetches the next upcoming drop from the DB.

- [ ] **Step 1: Add import for dropsAPI in Home.tsx**

Find the import block at the top of `src/pages/Home.tsx` and add:

```ts
import { dropsAPI } from '../api/dropsRaffles';
import type { Drop } from '../api/dropsRaffles';
```

- [ ] **Step 2: Add useNextDrop hook after the existing useCountdown hook (around line 92)**

```ts
function useNextDrop() {
  const [drop, setDrop] = useState<Drop | null>(null);
  useEffect(() => {
    dropsAPI.getNextUpcoming().then(setDrop).catch(() => setDrop(null));
  }, []);
  return drop;
}
```

- [ ] **Step 3: Wire useNextDrop into SplashPage**

In `SplashPage`, find the drop countdown section (currently uses `const [h, m, s] = useCountdown(...)`) and replace:

```tsx
// OLD — remove these two lines inside SplashPage:
const [h, m, s] = useCountdown(2 * 3600 + 34 * 60 + 11);
// ... and the static drop name text

// NEW — add at the top of SplashPage function body:
const nextDrop = useNextDrop();
const dropTarget = nextDrop?.drop_at ?? new Date(Date.now() + 9999 * 3600000).toISOString();
const dropRemaining = Math.max(0, new Date(dropTarget).getTime() - Date.now());
const [dropSecs, setDropSecs] = useState(Math.floor(dropRemaining / 1000));
useEffect(() => {
  const id = setInterval(() => setDropSecs(s => Math.max(0, s - 1)), 1000);
  return () => clearInterval(id);
}, [dropTarget]);
const dh = String(Math.floor(dropSecs / 3600)).padStart(2, '0');
const dm = String(Math.floor((dropSecs % 3600) / 60)).padStart(2, '0');
const ds = String(dropSecs % 60).padStart(2, '0');
```

Then update the drop name label in the SplashPage banner from the static string to:
```tsx
<Typography sx={{ color: T.gold, fontWeight: 700, fontSize: '0.72rem' }}>Next Drop</Typography>
// replace static name with:
{nextDrop && (
  <Typography sx={{ color: T.muted, fontSize: '0.68rem', fontFamily: T.mono, ml: 0.5 }} noWrap>
    {nextDrop.name}
  </Typography>
)}
```

And replace `{[h, m, s].map(...)}` in SplashPage with `{[dh, dm, ds].map(...)}`.

- [ ] **Step 4: Wire useNextDrop into the authenticated Home component**

In the `Home()` function body, find `const [h, m, s] = useCountdown(2 * 3600 + 34 * 60 + 11);` and replace with:

```tsx
const nextDrop = useNextDrop();
const dropTarget = nextDrop?.drop_at ?? new Date(Date.now() + 9999 * 3600000).toISOString();
const dropRemaining = Math.max(0, new Date(dropTarget).getTime() - Date.now());
const [dropSecs, setDropSecs] = useState(Math.floor(dropRemaining / 1000));
useEffect(() => {
  const id = setInterval(() => setDropSecs(s => Math.max(0, s - 1)), 1000);
  return () => clearInterval(id);
}, [dropTarget]);
const h = String(Math.floor(dropSecs / 3600)).padStart(2, '0');
const m = String(Math.floor((dropSecs % 3600) / 60)).padStart(2, '0');
const s = String(dropSecs % 60).padStart(2, '0');
```

Then update the static drop name in the authenticated Home countdown banner (around line 773):

```tsx
// OLD:
Next Drop: Image Comics × InkStash "Spawn Origins Pack"

// NEW:
{nextDrop
  ? `Next Drop: ${nextDrop.partner} — "${nextDrop.name}"`
  : 'Next Drop: Loading...'
}
```

- [ ] **Step 5: Remove the now-unused useCountdown function**

Delete the entire `useCountdown` function (lines 84–92 in the original file) since `dropSecs` state + interval replaces it inline. Verify nothing else calls `useCountdown`.

```bash
grep -n "useCountdown" src/pages/Home.tsx
```

Expected: no results.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: wire home page drop countdown to live DB data via dropsAPI.getNextUpcoming"
```

---

## Task 6: Final TypeScript check + smoke test

**Files:** none (verification only)

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 2: Verify all pages import correctly**

```bash
grep -rn "from '../api/dropsRaffles'" src/pages/
```

Expected: two lines — `Drops.tsx` and `Raffles.tsx`.

```bash
grep -n "dropsAPI\|useNextDrop" src/pages/Home.tsx
```

Expected: both referenced.

- [ ] **Step 3: Verify migration is clean**

```bash
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('drops','raffles','raffle_tickets') ORDER BY table_name"
```

Expected: 3 rows.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: phase 4 complete — drops, raffles, live drop countdown wired to Supabase"
```
