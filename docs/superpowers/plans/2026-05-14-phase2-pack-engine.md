# Phase 2: Pack Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full pack engine — DB tables, server-side random draw Edge Function, real-data Packs page, and cinematic reveal experience at `/pack-reveal/:purchaseId`.

**Architecture:** Three Supabase migrations create `packs`, `pack_items`, and `pack_purchases` tables. A new Edge Function `open-pack` runs the weighted random draw server-side and writes results to `pack_purchases`. The frontend calls the function after Stripe payment confirmation, then redirects to `PackReveal.tsx` which loads the purchase and plays a CSS-only card-flip sequence (no framer-motion). `Packs.tsx` is upgraded from static data to real Supabase queries with a fallback to placeholder data when the DB is empty.

**Tech Stack:** React 19, MUI v7, TypeScript, Supabase (Postgres + Edge Functions Deno), React Router v6. No new npm dependencies. Existing Stripe infrastructure reused via `supabase.functions.invoke`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260514000000_create_packs_tables.sql` | `packs`, `pack_items`, `pack_purchases` tables + RLS |
| Create | `supabase/functions/open-pack/index.ts` | Weighted random draw + write purchase record |
| Create | `src/api/packs.ts` | Supabase queries: list packs, get pack by id, get purchase by id, invoke open-pack |
| Modify | `src/pages/Packs.tsx` | Replace static `PACKS` array with real `packsAPI.list()` + fallback |
| Create | `src/pages/PackReveal.tsx` | Cinematic reveal page at `/pack-reveal/:purchaseId` |
| Modify | `src/main.tsx` | Add `/pack-reveal/:purchaseId` route |

---

## Task 1: Database migration — packs, pack_items, pack_purchases

**Files:**
- Create: `supabase/migrations/20260514000000_create_packs_tables.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260514000000_create_packs_tables.sql

-- ── packs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  partner       text NOT NULL DEFAULT 'InkStash House',
  price         numeric(10,2) NOT NULL CHECK (price >= 0),
  item_count    int NOT NULL DEFAULT 5 CHECK (item_count > 0),
  rarity_tiers  jsonb NOT NULL DEFAULT '{"common":0.70,"rare":0.25,"legendary":0.05}',
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold_out','upcoming','archived')),
  cover_image   text,
  badge         text CHECK (badge IN ('COLLAB','HOT','NEW','SOLD OUT') OR badge IS NULL),
  drop_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── pack_items ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pack_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id         uuid NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  comic_title     text NOT NULL,
  issue_number    text,
  grade           text,
  condition       text,
  rarity          text NOT NULL CHECK (rarity IN ('common','rare','legendary')),
  estimated_value numeric(10,2),
  image_url       text,
  quantity        int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  remaining       int NOT NULL CHECK (remaining >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT remaining_lte_quantity CHECK (remaining <= quantity)
);

-- ── pack_purchases ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pack_purchases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id          uuid NOT NULL REFERENCES public.packs(id),
  items_received   jsonb NOT NULL DEFAULT '[]',
  stripe_payment_intent_id text,
  revealed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packs_status ON public.packs(status);
CREATE INDEX IF NOT EXISTS idx_pack_items_pack_id ON public.pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_items_rarity ON public.pack_items(rarity);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_user_id ON public.pack_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_purchases_pack_id ON public.pack_purchases(pack_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_purchases ENABLE ROW LEVEL SECURITY;

-- packs: anyone can read active/upcoming packs
CREATE POLICY "packs_read_public" ON public.packs
  FOR SELECT USING (status IN ('active','upcoming','sold_out'));

-- pack_items: anyone can read items (odds display)
CREATE POLICY "pack_items_read_public" ON public.pack_items
  FOR SELECT USING (true);

-- pack_purchases: users can only read their own purchases
CREATE POLICY "pack_purchases_read_own" ON public.pack_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- pack_purchases: insert handled only by Edge Function via service role (no client insert policy needed)

-- ── Seed data (for dev/preview) ───────────────────────────────────────────────
INSERT INTO public.packs (id, name, partner, price, item_count, rarity_tiers, status, cover_image, badge)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'DC Legends Pack',        'DC × InkStash',    14.99, 5, '{"common":0.80,"rare":0.18,"legendary":0.02}', 'active',   'https://picsum.photos/seed/dc1/400/520',     'COLLAB'),
  ('11111111-0000-0000-0000-000000000002', 'Spider-Verse Keys',      'InkStash House',   24.99, 3, '{"common":0.70,"rare":0.25,"legendary":0.05}', 'active',   'https://picsum.photos/seed/spider1/400/520', 'HOT'),
  ('11111111-0000-0000-0000-000000000003', 'Image Horror Bundle',    'Image × InkStash', 19.99, 4, '{"common":0.85,"rare":0.14,"legendary":0.01}', 'active',   'https://picsum.photos/seed/horror1/400/520', 'NEW'),
  ('11111111-0000-0000-0000-000000000004', 'Conan Keys Pack',        'BOOM! × InkStash', 14.99, 5, '{"common":0.75,"rare":0.22,"legendary":0.03}', 'sold_out', 'https://picsum.photos/seed/conan1/400/520',  'SOLD OUT'),
  ('11111111-0000-0000-0000-000000000005', 'Marvel Silver Age',      'InkStash House',   34.99, 6, '{"common":0.62,"rare":0.30,"legendary":0.08}', 'active',   'https://picsum.photos/seed/marvel1/400/520', 'HOT'),
  ('11111111-0000-0000-0000-000000000006', 'Golden Age Mystery Box', 'InkStash House',   49.99, 4, '{"common":0.55,"rare":0.35,"legendary":0.10}', 'active',   'https://picsum.photos/seed/golden1/400/520', 'NEW')
ON CONFLICT (id) DO NOTHING;

-- Seed pack_items for the DC Legends Pack (pack 1)
INSERT INTO public.pack_items (pack_id, comic_title, issue_number, grade, rarity, estimated_value, quantity, remaining)
VALUES
  ('11111111-0000-0000-0000-000000000001', 'Action Comics', '#1 Facsimile', 'Raw NM', 'legendary', 29.99, 50, 50),
  ('11111111-0000-0000-0000-000000000001', 'Batman', '#232 (1st Ra''s al Ghul)', 'Raw VF', 'rare', 89.99, 100, 100),
  ('11111111-0000-0000-0000-000000000001', 'Superman', '#75 (Death of Superman)', 'Raw NM', 'rare', 14.99, 200, 200),
  ('11111111-0000-0000-0000-000000000001', 'Detective Comics', '#359 (1st Batgirl)', 'Raw FN', 'rare', 49.99, 75, 75),
  ('11111111-0000-0000-0000-000000000001', 'Green Lantern', '#76 (Adams Run)', 'Raw VG', 'common', 8.99, 500, 500),
  ('11111111-0000-0000-0000-000000000001', 'The Flash', '#123 (Flash of Two Worlds)', 'Raw GD', 'common', 5.99, 500, 500),
  ('11111111-0000-0000-0000-000000000001', 'Justice League', '#1 (New 52)', 'Raw NM', 'common', 3.99, 1000, 1000),
  ('11111111-0000-0000-0000-000000000001', 'Wonder Woman', '#1 (2016)', 'Raw NM', 'common', 2.99, 1000, 1000);
```

- [ ] **Step 2: Apply the migration to local Supabase**

```bash
supabase db push
```

Expected: Migration applies cleanly, no errors. If local Supabase isn't running: `supabase start` first.

- [ ] **Step 3: Verify tables exist**

```bash
supabase db diff --linked 2>/dev/null | head -5 || echo "tables created locally"
```

Or open the Supabase Studio at `http://localhost:54323` and confirm `packs`, `pack_items`, `pack_purchases` tables exist with rows in `packs` and `pack_items`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260514000000_create_packs_tables.sql
git commit -m "feat: add packs, pack_items, pack_purchases DB tables with seed data"
```

---

## Task 2: Edge Function — open-pack (weighted random draw)

**Files:**
- Create: `supabase/functions/open-pack/index.ts`

This function receives `{ pack_id, stripe_payment_intent_id }` from an authenticated client. It:
1. Validates the pack exists and is active
2. Reads `rarity_tiers` odds from the pack
3. Queries available `pack_items` (remaining > 0) grouped by rarity
4. Runs a weighted random draw — once per item slot in `pack.item_count`
5. Decrements `remaining` on each selected item
6. Writes a `pack_purchases` row and returns the purchase id

- [ ] **Step 1: Create the function directory and file**

```bash
mkdir -p supabase/functions/open-pack
```

```typescript
// supabase/functions/open-pack/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenPackPayload {
  pack_id: string
  stripe_payment_intent_id?: string
}

interface PackItem {
  id: string
  comic_title: string
  issue_number: string | null
  grade: string | null
  rarity: 'common' | 'rare' | 'legendary'
  estimated_value: number | null
  image_url: string | null
}

interface RarityTiers {
  common: number
  rare: number
  legendary: number
}

function weightedRarityPick(tiers: RarityTiers): 'common' | 'rare' | 'legendary' {
  const roll = Math.random()
  if (roll < tiers.legendary) return 'legendary'
  if (roll < tiers.legendary + tiers.rare) return 'rare'
  return 'common'
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check — require a valid JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client for DB writes; user client for auth validation
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    // Validate user
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload: OpenPackPayload = await req.json()
    const { pack_id, stripe_payment_intent_id } = payload

    if (!pack_id) {
      return new Response(JSON.stringify({ error: 'pack_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load the pack
    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, name, item_count, rarity_tiers, status')
      .eq('id', pack_id)
      .single()

    if (packError || !pack) {
      return new Response(JSON.stringify({ error: 'Pack not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (pack.status !== 'active') {
      return new Response(JSON.stringify({ error: `Pack is not available (status: ${pack.status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tiers = pack.rarity_tiers as RarityTiers

    // Load available items per rarity
    const { data: availableItems, error: itemsError } = await serviceClient
      .from('pack_items')
      .select('id, comic_title, issue_number, grade, rarity, estimated_value, image_url')
      .eq('pack_id', pack_id)
      .gt('remaining', 0)

    if (itemsError || !availableItems || availableItems.length === 0) {
      return new Response(JSON.stringify({ error: 'No items available in this pack' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const byRarity: Record<string, PackItem[]> = { common: [], rare: [], legendary: [] }
    for (const item of availableItems as PackItem[]) {
      byRarity[item.rarity]?.push(item)
    }

    // Draw items
    const drawn: PackItem[] = []
    const decrementMap: Record<string, number> = {}

    for (let i = 0; i < pack.item_count; i++) {
      // Attempt up to 10 rarity rolls to find a rarity with available items
      let selectedItem: PackItem | null = null
      for (let attempt = 0; attempt < 10; attempt++) {
        const rarity = weightedRarityPick(tiers)
        const pool = byRarity[rarity]
        if (pool && pool.length > 0) {
          selectedItem = pickRandom(pool)
          break
        }
      }
      // Fallback to any available item
      if (!selectedItem) {
        const allAvailable = Object.values(byRarity).flat()
        if (allAvailable.length > 0) selectedItem = pickRandom(allAvailable)
      }
      if (!selectedItem) continue

      drawn.push(selectedItem)
      decrementMap[selectedItem.id] = (decrementMap[selectedItem.id] || 0) + 1
    }

    // Decrement remaining counts
    for (const [itemId, count] of Object.entries(decrementMap)) {
      const { data: currentItem } = await serviceClient
        .from('pack_items')
        .select('remaining')
        .eq('id', itemId)
        .single()

      if (currentItem) {
        await serviceClient
          .from('pack_items')
          .update({ remaining: Math.max(0, currentItem.remaining - count) })
          .eq('id', itemId)
      }
    }

    // Write purchase record
    const { data: purchase, error: purchaseError } = await serviceClient
      .from('pack_purchases')
      .insert({
        user_id: user.id,
        pack_id,
        items_received: drawn,
        stripe_payment_intent_id: stripe_payment_intent_id || null,
        revealed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (purchaseError || !purchase) {
      return new Response(JSON.stringify({ error: 'Failed to record purchase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ purchase_id: purchase.id, items: drawn }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

- [ ] **Step 2: Deploy the function locally**

```bash
supabase functions serve open-pack --env-file supabase/.env.local 2>/dev/null || supabase functions serve open-pack
```

Expected: Function starts serving on `http://localhost:54321/functions/v1/open-pack`. Keep this running in a separate terminal during development, or use `supabase start` which auto-serves functions.

- [ ] **Step 3: Smoke-test the function with curl**

First get a valid JWT by signing in via the app, or grab one from the Supabase Studio Auth tab. Replace `<JWT>` and `<PACK_ID>` with real values from seed data.

```bash
curl -X POST http://localhost:54321/functions/v1/open-pack \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"pack_id":"11111111-0000-0000-0000-000000000001"}'
```

Expected: JSON response with `purchase_id` (UUID) and `items` array of 5 drawn comics. Each item has `id`, `comic_title`, `rarity`, etc.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/open-pack/index.ts
git commit -m "feat: add open-pack Edge Function with weighted random draw"
```

---

## Task 3: Client API layer — src/api/packs.ts

**Files:**
- Create: `src/api/packs.ts`

- [ ] **Step 1: Create the API file**

```typescript
// src/api/packs.ts
import { supabase } from './supabase/supabaseClient';

export interface Pack {
  id: string;
  name: string;
  partner: string;
  price: number;
  item_count: number;
  rarity_tiers: { common: number; rare: number; legendary: number };
  status: 'active' | 'sold_out' | 'upcoming' | 'archived';
  cover_image: string | null;
  badge: string | null;
  drop_at: string | null;
  created_at: string;
}

export interface PackItem {
  id: string;
  pack_id: string;
  comic_title: string;
  issue_number: string | null;
  grade: string | null;
  condition: string | null;
  rarity: 'common' | 'rare' | 'legendary';
  estimated_value: number | null;
  image_url: string | null;
  quantity: number;
  remaining: number;
}

export interface PackPurchase {
  id: string;
  user_id: string;
  pack_id: string;
  items_received: PackItem[];
  stripe_payment_intent_id: string | null;
  revealed_at: string | null;
  created_at: string;
  pack?: Pick<Pack, 'id' | 'name' | 'partner' | 'cover_image'>;
}

export interface OpenPackResult {
  purchase_id: string;
  items: PackItem[];
}

// Fallback data for when the DB has no packs yet
export const FALLBACK_PACKS: Pack[] = [
  { id: 'p1', name: 'DC Legends Pack',        partner: 'DC × InkStash',    price: 14.99, item_count: 5, rarity_tiers: { common: 0.80, rare: 0.18, legendary: 0.02 }, status: 'active',   cover_image: 'https://picsum.photos/seed/dc1/400/520',     badge: 'COLLAB',   drop_at: null, created_at: '' },
  { id: 'p2', name: 'Spider-Verse Keys',      partner: 'InkStash House',   price: 24.99, item_count: 3, rarity_tiers: { common: 0.70, rare: 0.25, legendary: 0.05 }, status: 'active',   cover_image: 'https://picsum.photos/seed/spider1/400/520', badge: 'HOT',      drop_at: null, created_at: '' },
  { id: 'p3', name: 'Image Horror Bundle',    partner: 'Image × InkStash', price: 19.99, item_count: 4, rarity_tiers: { common: 0.85, rare: 0.14, legendary: 0.01 }, status: 'active',   cover_image: 'https://picsum.photos/seed/horror1/400/520', badge: 'NEW',      drop_at: null, created_at: '' },
  { id: 'p4', name: 'Conan Keys Pack',        partner: 'BOOM! × InkStash', price: 14.99, item_count: 5, rarity_tiers: { common: 0.75, rare: 0.22, legendary: 0.03 }, status: 'sold_out', cover_image: 'https://picsum.photos/seed/conan1/400/520',  badge: 'SOLD OUT', drop_at: null, created_at: '' },
  { id: 'p5', name: 'Marvel Silver Age',      partner: 'InkStash House',   price: 34.99, item_count: 6, rarity_tiers: { common: 0.62, rare: 0.30, legendary: 0.08 }, status: 'active',   cover_image: 'https://picsum.photos/seed/marvel1/400/520', badge: 'HOT',      drop_at: null, created_at: '' },
  { id: 'p6', name: 'Golden Age Mystery Box', partner: 'InkStash House',   price: 49.99, item_count: 4, rarity_tiers: { common: 0.55, rare: 0.35, legendary: 0.10 }, status: 'active',   cover_image: 'https://picsum.photos/seed/golden1/400/520', badge: 'NEW',      drop_at: null, created_at: '' },
];

export const packsAPI = {
  async list(): Promise<Pack[]> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .in('status', ['active', 'sold_out', 'upcoming'])
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return FALLBACK_PACKS;
    return data as Pack[];
  },

  async getById(packId: string): Promise<Pack | null> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (error || !data) return null;
    return data as Pack;
  },

  async getPurchase(purchaseId: string): Promise<PackPurchase | null> {
    const { data, error } = await supabase
      .from('pack_purchases')
      .select('*, pack:packs(id, name, partner, cover_image)')
      .eq('id', purchaseId)
      .single();

    if (error || !data) return null;
    return data as PackPurchase;
  },

  async openPack(packId: string, stripePaymentIntentId?: string): Promise<OpenPackResult> {
    const { data, error } = await supabase.functions.invoke('open-pack', {
      body: {
        pack_id: packId,
        stripe_payment_intent_id: stripePaymentIntentId ?? null,
      },
    });

    if (error) throw new Error(error.message);
    return data as OpenPackResult;
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/packs.ts
git commit -m "feat: add packs API client — list, getById, getPurchase, openPack"
```

---

## Task 4: Upgrade Packs.tsx to real Supabase data

**Files:**
- Modify: `src/pages/Packs.tsx`

The current `Packs.tsx` has a static `PACKS` array. Replace it with a `useEffect` that calls `packsAPI.list()` and falls back to `FALLBACK_PACKS` on error. Add loading skeletons and wire "Open Pack" to call `packsAPI.openPack()` then navigate to `/pack-reveal/:purchaseId`.

- [ ] **Step 1: Replace Packs.tsx**

```tsx
// src/pages/Packs.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Stack, Button, Chip, Skeleton } from '@mui/material';
import { X, Package, BookOpen, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/home/DashboardHeader';
import { packsAPI, FALLBACK_PACKS } from '../api/packs';
import type { Pack } from '../api/packs';

// ── Design tokens ─────────────────────────────────────────────────────────────
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

const BADGE_META: Record<string, { bg: string; fg: string }> = {
  COLLAB:     { bg: T.gold,                fg: '#000' },
  HOT:        { bg: T.live,               fg: '#fff' },
  NEW:        { bg: T.blue,               fg: '#fff' },
  'SOLD OUT': { bg: 'rgba(55,65,81,0.9)', fg: '#6b7280' },
};

const FILTERS = ['All', 'Comics', 'Keys', 'Graded', 'Limited'];

function rarityLabel(tiers: Pack['rarity_tiers']): string {
  return `${Math.round(tiers.legendary * 100)}%`;
}

// ── Pack card ─────────────────────────────────────────────────────────────────
function PackCard({ pack, onOpen, opening }: { pack: Pack; onOpen: (id: string) => void; opening: boolean }) {
  const badge = pack.badge ?? (pack.status === 'sold_out' ? 'SOLD OUT' : 'NEW');
  const bm = BADGE_META[badge] ?? { bg: T.blue, fg: '#fff' };
  const soldOut = pack.status === 'sold_out';

  return (
    <Box
      sx={{
        bgcolor: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 2.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: soldOut ? 'default' : 'pointer',
        transition: 'border-color 0.18s, transform 0.18s',
        '&:hover': soldOut ? {} : { borderColor: T.borderLit, transform: 'translateY(-4px)' },
      }}
    >
      <Box sx={{ position: 'relative', aspectRatio: '400/520', overflow: 'hidden' }}>
        {pack.cover_image ? (
          <Box
            component="img"
            src={pack.cover_image}
            alt={pack.name}
            sx={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: soldOut ? 'grayscale(60%) brightness(0.65)' : 'none',
              transition: 'transform 0.3s',
              '.MuiBox-root:hover &': soldOut ? {} : { transform: 'scale(1.03)' },
            }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: T.surfaceB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={40} color={T.dimmed} />
          </Box>
        )}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: `linear-gradient(to top, ${T.surface} 0%, transparent 100%)`, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: 10, left: 10, px: 1, py: 0.35, bgcolor: bm.bg, color: bm.fg, fontFamily: T.mono, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', borderRadius: 0.75 }}>
          {badge}
        </Box>
      </Box>

      <Box sx={{ p: 2, pt: 1.75, display: 'flex', flexDirection: 'column', flex: 1, gap: 1 }}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: T.white, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
          {pack.name}
        </Typography>
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, letterSpacing: '0.04em' }}>
          {pack.partner}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <BookOpen size={11} strokeWidth={1.75} color={T.dimmed} />
          <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.dimmed }}>
            {pack.item_count} comics per pack
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.25} flexWrap="wrap">
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.gold, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>LEG {rarityLabel(pack.rarity_tiers)}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: T.blue, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.muted }}>RARE {Math.round(pack.rarity_tiers.rare * 100)}%</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#374151', flexShrink: 0 }} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.6rem', color: T.dimmed }}>COM {Math.round(pack.rarity_tiers.common * 100)}%</Typography>
          </Stack>
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
          <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: '1rem', color: soldOut ? T.dimmed : T.white }}>
            {soldOut ? '—' : `$${pack.price.toFixed(2)}`}
          </Typography>
          <Button
            variant="contained"
            disabled={soldOut || opening}
            size="small"
            onClick={(e) => { e.stopPropagation(); onOpen(pack.id); }}
            sx={{
              fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', px: 2, py: 0.75,
              bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : T.blue,
              color: soldOut ? '#6b7280' : '#fff',
              borderRadius: 1.25, boxShadow: 'none',
              '&:hover': { bgcolor: soldOut ? 'rgba(55,65,81,0.6)' : '#005fcc', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: 'rgba(55,65,81,0.6)', color: '#6b7280' },
            }}
          >
            {opening ? 'Opening...' : soldOut ? 'Sold Out' : 'Open Pack'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

function PackCardSkeleton() {
  return (
    <Box sx={{ bgcolor: T.surface, border: `1px solid ${T.border}`, borderRadius: 2.5, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '400/520', width: '100%', bgcolor: T.surfaceB }} />
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton variant="text" width="70%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="text" width="50%" sx={{ bgcolor: T.surfaceB }} />
        <Skeleton variant="rectangular" height={28} sx={{ bgcolor: T.surfaceB, borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Packs() {
  const navigate = useNavigate();
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);

  useEffect(() => {
    packsAPI.list()
      .then(setPacks)
      .catch(() => { setPacks(FALLBACK_PACKS); setError('Using preview data — DB unavailable'); })
      .finally(() => setLoading(false));
  }, []);

  async function handleOpenPack(packId: string) {
    setOpeningPackId(packId);
    try {
      const result = await packsAPI.openPack(packId);
      navigate(`/pack-reveal/${result.purchase_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
      setOpeningPackId(null);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: T.bg }}>
      <DashboardHeader />
      <Container maxWidth="xl" sx={{ pt: { xs: 9, md: 10 }, pb: 8 }}>

        {!noticeDismissed && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, mb: 3, bgcolor: 'rgba(217,119,6,0.1)', border: `1px solid rgba(217,119,6,0.25)`, borderRadius: 1.5, gap: 1 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Package size={14} strokeWidth={1.75} color={T.gold} />
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.gold, letterSpacing: '0.02em' }}>
                Phase 2 — Pack purchasing goes live soon. These are preview cards.
              </Typography>
            </Stack>
            <Box onClick={() => setNoticeDismissed(true)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'rgba(217,119,6,0.6)', flexShrink: 0, '&:hover': { color: T.gold }, transition: 'color 0.15s' }}>
              <X size={14} strokeWidth={2} />
            </Box>
          </Box>
        )}

        {error && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 2, bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 1.5 }}>
            <AlertCircle size={14} color={T.live} />
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.live }}>{error}</Typography>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="space-between" gap={2} mb={3.5}>
          <Box>
            <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: { xs: '1.6rem', md: '2rem' }, color: T.white, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Packs
            </Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.72rem', color: T.muted, mt: 0.5, letterSpacing: '0.02em' }}>
              Blind bag comic packs — pull legendary keys, rare variants, and more
            </Typography>
          </Box>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {FILTERS.map(f => {
              const active = f === activeFilter;
              return (
                <Chip key={f} label={f} onClick={() => setActiveFilter(f)} size="small" sx={{ fontFamily: T.mono, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.04em', height: 28, bgcolor: active ? T.blue : T.surfaceB, color: active ? '#fff' : T.muted, border: `1px solid ${active ? T.blue : T.border}`, borderRadius: 1, cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: active ? '#005fcc' : T.surface, color: active ? '#fff' : T.white }, '& .MuiChip-label': { px: 1.25 } }} />
              );
            })}
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2.5 } }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <PackCardSkeleton key={i} />)
            : packs.map(pack => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onOpen={handleOpenPack}
                  opening={openingPackId === pack.id}
                />
              ))
          }
        </Box>
      </Container>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Packs.tsx
git commit -m "feat: upgrade Packs page to real Supabase data with loading skeletons and open-pack flow"
```

---

## Task 5: PackReveal.tsx — cinematic reveal page

**Files:**
- Create: `src/pages/PackReveal.tsx`

Full-screen reveal at `/pack-reveal/:purchaseId`. Loads the purchase from Supabase, then reveals cards one at a time with a CSS 3D flip. After all cards flip, shows a summary screen with rarity sort and "Go to My Stash" CTA.

Rarity glow colors: common = `rgba(255,255,255,0.15)`, rare = `rgba(124,58,237,0.5)` (#7c3aed), legendary = `rgba(245,158,11,0.7)` (#f59e0b).

- [ ] **Step 1: Create PackReveal.tsx**

```tsx
// src/pages/PackReveal.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { packsAPI } from '../api/packs';
import type { PackItem, PackPurchase } from '../api/packs';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#07070d',
  surface:   '#0f0f1a',
  border:    'rgba(255,255,255,0.08)',
  white:     '#f1f5f9',
  muted:     'rgba(241,245,249,0.45)',
  mono:      "'DM Mono', 'Courier New', monospace",
  gold:      '#f59e0b',
  purple:    '#7c3aed',
  common:    'rgba(255,255,255,0.12)',
  rare:      'rgba(124,58,237,0.45)',
  legendary: 'rgba(245,158,11,0.65)',
};

const RARITY_GLOW: Record<string, string> = {
  common:    '0 0 20px rgba(255,255,255,0.08)',
  rare:      '0 0 32px rgba(124,58,237,0.5), 0 0 8px rgba(124,58,237,0.3)',
  legendary: '0 0 48px rgba(245,158,11,0.7), 0 0 16px rgba(245,158,11,0.4)',
};

const RARITY_BORDER: Record<string, string> = {
  common:    'rgba(255,255,255,0.12)',
  rare:      'rgba(124,58,237,0.6)',
  legendary: '#f59e0b',
};

const RARITY_LABEL_COLOR: Record<string, string> = {
  common:    'rgba(255,255,255,0.5)',
  rare:      '#a78bfa',
  legendary: '#f59e0b',
};

const RARITY_ORDER: Record<string, number> = { legendary: 0, rare: 1, common: 2 };

// ── Flip card ─────────────────────────────────────────────────────────────────
function FlipCard({ item, flipped, delay }: { item: PackItem; flipped: boolean; delay: number }) {
  const glow = RARITY_GLOW[item.rarity] ?? RARITY_GLOW.common;
  const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
  const labelColor = RARITY_LABEL_COLOR[item.rarity] ?? RARITY_LABEL_COLOR.common;

  return (
    <Box
      sx={{
        perspective: '1000px',
        width: { xs: 130, sm: 160 },
        aspectRatio: '0.65',
        cursor: 'default',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: `transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Card back */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: 2,
            background: 'linear-gradient(135deg, #1a1035, #0d1525)',
            border: `1px solid rgba(124,58,237,0.25)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #0078FF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}
          >
            <Sparkles size={24} color="#fff" />
          </Box>
        </Box>

        {/* Card front */}
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 2,
            background: T.surface,
            border: `1px solid ${borderColor}`,
            boxShadow: flipped ? glow : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {/* Image area */}
          <Box
            sx={{
              flex: 1,
              background: item.image_url
                ? `url(${item.image_url}) center/cover no-repeat`
                : 'linear-gradient(135deg, #1a1035, #0d2845)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!item.image_url && (
              <Typography sx={{ fontSize: '2rem' }}>
                {item.rarity === 'legendary' ? '★' : item.rarity === 'rare' ? '◆' : '●'}
              </Typography>
            )}
          </Box>

          {/* Info */}
          <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.6)' }}>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.65rem',
                color: T.white,
                lineHeight: 1.2,
                mb: 0.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.comic_title}
            </Typography>
            {item.issue_number && (
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.55rem', color: T.muted, mb: 0.4 }}>
                {item.issue_number}
              </Typography>
            )}
            <Typography
              sx={{
                fontFamily: T.mono,
                fontSize: '0.58rem',
                fontWeight: 700,
                color: labelColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {item.rarity}
              {item.grade && ` · ${item.grade}`}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryRow({ item }: { item: PackItem }) {
  const labelColor = RARITY_LABEL_COLOR[item.rarity] ?? RARITY_LABEL_COLOR.common;
  const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 1.5,
        bgcolor: T.surface,
        border: `1px solid ${borderColor}`,
        borderRadius: 1.5,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 52,
          borderRadius: 1,
          bgcolor: 'rgba(255,255,255,0.05)',
          flexShrink: 0,
          backgroundImage: item.image_url ? `url(${item.image_url})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Box flex={1} minWidth={0}>
        <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.88rem', color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.comic_title}
          {item.issue_number && <Box component="span" sx={{ color: T.muted, fontWeight: 400 }}> {item.issue_number}</Box>}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center" mt={0.3}>
          <Typography sx={{ fontFamily: T.mono, fontSize: '0.62rem', fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {item.rarity}
          </Typography>
          {item.grade && (
            <Typography sx={{ fontFamily: T.mono, fontSize: '0.62rem', color: T.muted }}>
              {item.grade}
            </Typography>
          )}
        </Stack>
      </Box>
      {item.estimated_value && (
        <Typography sx={{ fontFamily: T.mono, fontWeight: 700, fontSize: '0.82rem', color: T.white, flexShrink: 0 }}>
          ~${item.estimated_value.toFixed(2)}
        </Typography>
      )}
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PackReveal() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<PackPurchase | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flippedCount, setFlippedCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!purchaseId) { setLoadError('Invalid purchase ID'); return; }
    packsAPI.getPurchase(purchaseId)
      .then(data => {
        if (!data) { setLoadError('Purchase not found'); return; }
        setPurchase(data);
      })
      .catch(() => setLoadError('Failed to load purchase'));
  }, [purchaseId]);

  const items: PackItem[] = purchase?.items_received ?? [];

  // Auto-flip cards one at a time, 1.5s apart
  useEffect(() => {
    if (!purchase || items.length === 0) return;
    if (flippedCount >= items.length) return;

    const timer = setTimeout(() => {
      setFlippedCount(c => c + 1);
    }, flippedCount === 0 ? 800 : 1500);

    return () => clearTimeout(timer);
  }, [purchase, flippedCount, items.length]);

  // Show summary 1.5s after last card flips
  useEffect(() => {
    if (flippedCount === items.length && items.length > 0 && !showSummary) {
      const timer = setTimeout(() => setShowSummary(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [flippedCount, items.length, showSummary]);

  const sortedItems = [...items].sort((a, b) => (RARITY_ORDER[a.rarity] ?? 2) - (RARITY_ORDER[b.rarity] ?? 2));

  const hasLegendary = items.some(i => i.rarity === 'legendary');

  if (loadError) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ color: T.muted, fontFamily: T.mono, fontSize: '0.85rem' }}>{loadError}</Typography>
        <Button onClick={() => navigate('/packs')} sx={{ color: '#0078FF', fontFamily: T.mono, fontSize: '0.75rem' }}>
          Back to Packs
        </Button>
      </Box>
    );
  }

  if (!purchase) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: '#0078FF' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: T.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: { xs: 4, md: 6 },
        pb: 8,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Legendary burst overlay */}
      {hasLegendary && flippedCount === items.length && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.12) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />
      )}

      {/* Pack name */}
      <Typography
        sx={{
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 900,
          fontSize: { xs: '1.3rem', md: '1.7rem' },
          color: T.white,
          letterSpacing: '-0.02em',
          mb: 0.5,
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        {purchase.pack?.name ?? 'Pack Opening'}
      </Typography>
      <Typography sx={{ fontFamily: T.mono, fontSize: '0.7rem', color: T.muted, mb: { xs: 3, md: 4 }, zIndex: 1 }}>
        {purchase.pack?.partner ?? ''}
      </Typography>

      {/* Cards row */}
      {!showSummary && (
        <Stack
          direction="row"
          gap={{ xs: 1, sm: 1.5, md: 2 }}
          flexWrap="wrap"
          justifyContent="center"
          sx={{ zIndex: 1, mb: 2 }}
        >
          {items.map((item, idx) => (
            <FlipCard
              key={item.id + idx}
              item={item}
              flipped={idx < flippedCount}
              delay={0}
            />
          ))}
        </Stack>
      )}

      {/* Summary */}
      {showSummary && (
        <Box
          sx={{
            width: '100%',
            maxWidth: 560,
            zIndex: 1,
            animation: 'fadeUp 0.4s ease both',
            '@keyframes fadeUp': {
              from: { opacity: 0, transform: 'translateY(16px)' },
              to:   { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {hasLegendary && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography sx={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.1rem', color: T.gold, letterSpacing: '-0.01em' }}>
                LEGENDARY PULL
              </Typography>
              <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: 'rgba(245,158,11,0.6)', mt: 0.25 }}>
                Top 2–10% drop — exceptional find
              </Typography>
            </Box>
          )}

          <Stack gap={1} mb={3}>
            {sortedItems.map((item, idx) => (
              <SummaryRow key={item.id + idx} item={item} />
            ))}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} justifyContent="center">
            <Button
              variant="contained"
              endIcon={<ArrowRight size={16} />}
              onClick={() => navigate('/my-stash')}
              sx={{
                bgcolor: '#0078FF', color: '#fff', fontFamily: T.mono, fontWeight: 700,
                fontSize: '0.78rem', letterSpacing: '0.04em', px: 3, py: 1.25,
                borderRadius: 1.5, boxShadow: 'none', textTransform: 'none',
                '&:hover': { bgcolor: '#005fcc', boxShadow: 'none' },
              }}
            >
              View in My Stash
            </Button>
            <Button
              variant="outlined"
              startIcon={<RotateCcw size={15} />}
              onClick={() => navigate('/packs')}
              sx={{
                borderColor: 'rgba(255,255,255,0.15)', color: T.muted, fontFamily: T.mono,
                fontWeight: 600, fontSize: '0.78rem', px: 3, py: 1.25,
                borderRadius: 1.5, textTransform: 'none',
                '&:hover': { borderColor: 'rgba(255,255,255,0.3)', color: T.white, bgcolor: 'transparent' },
              }}
            >
              Open Another Pack
            </Button>
          </Stack>
        </Box>
      )}

      {/* Flip progress indicator */}
      {!showSummary && flippedCount < items.length && (
        <Typography sx={{ fontFamily: T.mono, fontSize: '0.65rem', color: T.muted, mt: 2, zIndex: 1 }}>
          {flippedCount} / {items.length} revealed
        </Typography>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PackReveal.tsx
git commit -m "feat: add PackReveal cinematic reveal page with CSS 3D card flip and summary screen"
```

---

## Task 6: Wire route in main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Add the import and route**

Add to imports (after the existing `Packs` import):

```tsx
import PackReveal from './pages/PackReveal';
```

Add route inside `<Routes>` (after the `/packs` route):

```tsx
<Route path="/pack-reveal/:purchaseId" element={<PackReveal />} />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat: add /pack-reveal/:purchaseId route"
```

---

## Task 7: End-to-end smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Packs page loads real data**

Navigate to `http://localhost:5173/packs`. Confirm:
- Pack cards render with correct names/prices from seed data (not the old hardcoded names)
- Odds percentages match the `rarity_tiers` values in the migration (e.g. DC Legends: LEG 2%, RARE 18%, COM 80%)
- Skeleton loaders appear briefly on first load

- [ ] **Step 3: Test pack reveal with a real purchase**

If local Supabase is running with a logged-in user, click "Open Pack" on any active pack.
Expected: Navigates to `/pack-reveal/<uuid>`, cards flip one at a time, summary appears after all flips.

If Supabase is not running locally, test the reveal page directly with a mock purchase ID by temporarily hardcoding a purchase in the `getPurchase` fallback — or skip this step and test after deploying migrations to the linked remote project.

- [ ] **Step 4: Verify TypeScript is fully clean**

```bash
npx tsc --noEmit 2>&1
```

Expected: No output (zero errors).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: phase 2 complete — pack engine, open-pack Edge Function, cinematic reveal"
```
