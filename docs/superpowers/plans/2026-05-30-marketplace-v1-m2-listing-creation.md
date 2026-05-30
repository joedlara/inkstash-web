# Marketplace v1 — M2: Listing Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two listing-creation paths (vault items from MyStash + outside items via the refactored 4-step wizard) and the ComicVine catalog search that powers the wizard. Plus a sidebar verification badge that surfaces the user's seller status.

**Architecture:** A new `search-comic-catalog` edge function wraps ComicVine with a Postgres cache (using the `comic_catalog_cache` table from M1). A `<SellerConnectGate>` component intercepts list-related CTAs and routes unverified users through the existing `initiateConnectOnboarding` flow (M1). Vault listings go through a new `list-vault-item` edge function backed by an atomic SECURITY DEFINER RPC that inserts a listing row + flips `user_inventory.status='listed'` in one transaction. `ListItem.tsx`'s step 1 is rewritten as comic search (autocomplete via ComicVine + free-text fallback); non-comic flows are deleted. `CardDispositionRow.tsx` gets a 4th button ("List for sale") gated by `pack.origin === 'house' && inventory.status === 'vaulted' && user.seller_status === 'active'`. Sidebar tier label uses the new `seller_status` enum with an icon.

**Tech Stack:** Supabase Postgres + RLS + Edge Functions (Deno), Stripe Connect Express (reused from M1), React 19 + TypeScript + MUI v7, lucide-react for icons, ComicVine REST API (key configured as `COMIC_VINE_KEY` in `.env`).

**Spec:** `docs/superpowers/specs/2026-05-29-marketplace-v1-design.md` (sections 2 + 3)

**Builds on:** M1 (commit `18300ea` on main) — assumes `seller_status` column exists on `users`, `listings` has `source_inventory_id` + `comic_*` columns + `application_fee_pct`, `comic_catalog_cache` table exists, `sellersAPI.initiateConnectOnboarding()` works.

**Out of scope for M2:** Marketplace browse page, listing checkout, refunds, emails. Those land in M3/M4.

---

## Testing convention for this plan

No automated test framework in the repo. Verification uses:

1. **Typecheck after every TS change:** `npx tsc --noEmit` — must produce no output.
2. **Edge function deploys** as the smoke test that the function syntax-checks under Deno.
3. **Inline node REST queries** for DB verification (same pattern as M1).
4. **End-to-end manual verification** of the full create-vault-listing and create-outside-listing flows in the dev environment (Tasks 8 + 9).

---

## File Map

### Migration (new)

| File | Purpose |
|---|---|
| `supabase/migrations/20260530000000_list_vault_item_rpc.sql` | SECURITY DEFINER function `list_vault_item(p_user_id uuid, p_inventory_id uuid, p_price_cents int)` that atomically inserts a listing + flips inventory status. Returns the new listing id. |

### Edge functions (new)

| File | Purpose |
|---|---|
| `supabase/functions/search-comic-catalog/index.ts` | Authenticated. Searches `comic_catalog_cache` via tsvector; falls through to ComicVine API on miss; populates cache; returns unified result list. |
| `supabase/functions/list-vault-item/index.ts` | Authenticated. Validates ownership, calls the `list_vault_item` RPC, returns the new listing id. |

### Frontend pages (modified)

| File | Action | Purpose |
|---|---|---|
| `src/pages/ListItem.tsx` | Modify (substantial) | Replace step 1 with ComicVine autocomplete + free-text fallback. Delete non-comic flows (cards/Funko/figures). Add seller verification gate. |
| `src/pages/MyStash.tsx` | Modify (light) | No structural changes — the new vault list button lives inside `CardDispositionRow`. |

### Frontend components (new + modified)

| File | Action | Purpose |
|---|---|---|
| `src/components/listings/SellerConnectGate.tsx` | Create | Wraps any "start selling" CTA. If `user.seller_status !== 'active'`, intercepts with the Connect onboarding modal. |
| `src/components/listings/ConnectOnboardingModal.tsx` | Create | Stripe Connect Express onboarding launcher. Calls `sellersAPI.initiateConnectOnboarding()`, opens Stripe URL in same tab. |
| `src/components/listings/SetPriceModal.tsx` | Create | Lightweight modal: enter price, see 90/10 fee breakdown, confirm. Calls `listingsAPI.listVaultItem()`. |
| `src/components/listings/ComicSearchInput.tsx` | Create | Autocomplete input wrapping `comicCatalogAPI.search()`. Renders dropdown with cover thumb + title + publisher chip. Has "Don't see your comic? Enter manually." fallback CTA. |
| `src/components/packs/CardDispositionRow.tsx` | Modify | Add "List for sale" button as 4th option after Keep / Sell-back / Ship. Gated by pack.origin === 'house' AND inventory.status === 'vaulted' AND seller_status === 'active' (otherwise renders disabled + opens ConnectOnboardingModal). |
| `src/components/layout/AppSidebar.tsx` | Modify (small) | Replace the `tier` string with a richer `<SellerStatusBadge>` (defined inline or in a new file). Shows icon + label per status. |

### API layer (new)

| File | Action | Purpose |
|---|---|---|
| `src/api/comicCatalog.ts` | Create | Wraps `search-comic-catalog` edge function. Returns typed `ComicCatalogResult[]`. |
| `src/api/listings.ts` | Create | `listVaultItem(inventoryId, priceCents)` — wraps the new edge function. `create(spec)` for outside items uses the existing direct insert pattern. `delist(listingId)` for cleanup. |

### Files explicitly NOT modified in M2

- `src/pages/Marketplace.tsx`, `src/pages/ItemDetail.tsx` — buy flow lives in M3.
- `supabase/functions/create-payment-intent/index.ts` — listing payment branch is M3.
- `supabase/functions/stripe-webhook/index.ts` — `open-listing-order` integration is M3.

---

## Task 1: Sidebar seller status badge

Smallest task; ship first as a warm-up. Replaces the static `'Seller' / 'Free tier'` string in AppSidebar with a 4-state badge driven by `user.seller_status`.

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: Read the current tier code**

Run: `grep -n "tier\|seller_verified\|seller_status" src/components/layout/AppSidebar.tsx`

Expected: line 25 has `const tier = user?.seller_verified ? 'Seller' : 'Free tier';` and line 262 renders `{tier}`.

- [ ] **Step 2: Add the new imports**

At the top of the file, find the existing lucide-react import line and add `Check`, `Clock`, and `Ban`:

```typescript
import { ChevronRight, PanelLeftClose, Check, Clock, Ban } from 'lucide-react';
```

(Adjust the existing import to include these three icons. If `ChevronRight` and `PanelLeftClose` are imported separately, just extend that import.)

- [ ] **Step 3: Replace the tier computation block**

Find line 25 (the `const tier = ...` line). Replace with:

```typescript
const sellerStatus = user?.seller_status ?? 'inactive';

const STATUS_BADGE: Record<
  'inactive' | 'pending' | 'active' | 'paused',
  { label: string; color: string; icon: React.ReactNode | null }
> = {
  inactive: { label: 'Free',                  color: inkstashColors.muted, icon: null },
  pending:  { label: 'Pending verification',  color: inkstashColors.gold,  icon: <Clock size={11} /> },
  active:   { label: 'Seller',                color: inkstashColors.brand, icon: <Check size={11} /> },
  paused:   { label: 'Paused',                color: '#ef4444',            icon: <Ban size={11} /> },
};

const badge = STATUS_BADGE[sellerStatus];
```

- [ ] **Step 4: Replace the rendered `{tier}` element**

Find line 262 (the `<Box>` rendering `{tier}`). Replace the entire `<Box>` element with:

```tsx
<Box sx={{
  fontFamily: inkstashFonts.mono,
  fontSize: 10.5,
  color: badge.color,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
}}>
  {badge.icon}
  <span>{badge.label}</span>
</Box>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output.

If you see `Property 'seller_status' does not exist on type 'User'`, M1's User type extension didn't fully land — verify `src/api/auth/authManager.ts` has `seller_status?: 'inactive' | 'pending' | 'active' | 'paused'` on the User type. (Should already be there from M1-Task5.)

- [ ] **Step 6: Visual smoke test**

Run the dev server. Confirm:
- Logged out: badge doesn't render (sidebar hides the user tray entirely).
- Logged in as a user with `seller_status='inactive'`: muted "Free" text, no icon.
- Logged in as `dsauve98` (status='active' from M1 smoke test): brand-color "Seller" with check icon.
- (Optionally) edit any user's seller_status in Supabase Studio to 'pending' or 'paused', refresh, confirm the badge updates.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "feat(sidebar): replace tier string with seller_status badge + icon"
```

---

## Task 2: list_vault_item RPC migration

Atomic SQL function that the `list-vault-item` edge function (Task 4) wraps. Inserts a listing row from a vault inventory item + flips inventory status to `'listed'`, in one transaction.

**Files:**
- Create: `supabase/migrations/20260530000000_list_vault_item_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Atomic vault listing creation.
--
-- Given a user's vault inventory row, atomically:
--   1. Validate the inventory belongs to the user and is currently 'vaulted'
--   2. Validate the underlying pack is house-origin (vendor packs cannot be listed)
--   3. INSERT a listings row with source_inventory_id link + comic metadata
--      pulled from the pack_item join
--   4. UPDATE user_inventory.status to 'listed'
--   5. Return the new listing id
--
-- All-or-nothing. SECURITY DEFINER so RLS doesn't fight the cross-table reads.

CREATE OR REPLACE FUNCTION public.list_vault_item(
  p_user_id uuid,
  p_inventory_id uuid,
  p_price_cents integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv             record;
  v_pack_item       record;
  v_pack            record;
  v_listing_id      uuid;
  v_image_url       text;
BEGIN
  -- Sanity check the price
  IF p_price_cents IS NULL OR p_price_cents < 100 THEN
    RAISE EXCEPTION 'price must be at least 100 cents';
  END IF;

  -- Load inventory row + verify ownership + status
  SELECT * INTO v_inv
  FROM public.user_inventory
  WHERE id = p_inventory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory not found';
  END IF;

  IF v_inv.user_id != p_user_id THEN
    RAISE EXCEPTION 'not owner';
  END IF;

  IF v_inv.status != 'vaulted' THEN
    RAISE EXCEPTION 'inventory not vaulted (current status: %)', v_inv.status;
  END IF;

  -- Load pack_item + pack to get metadata
  SELECT * INTO v_pack_item
  FROM public.pack_items
  WHERE id = v_inv.pack_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack_item not found';
  END IF;

  SELECT * INTO v_pack
  FROM public.packs
  WHERE id = v_pack_item.pack_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack not found';
  END IF;

  -- Only house pack items can be listed in v1 (vendor pack items are the
  -- vendor's product to control)
  IF v_pack.origin != 'house' THEN
    RAISE EXCEPTION 'cannot list vendor pack items (origin: %)', v_pack.origin;
  END IF;

  -- Build the photos JSONB array from pack_item.image_url
  v_image_url := coalesce(v_pack_item.image_url, '');

  -- Insert the listing
  INSERT INTO public.listings (
    user_id,
    source_inventory_id,
    title,
    description,
    condition,
    photos,
    is_buy_now,
    buy_now_price,
    quantity,
    status,
    comic_publisher,
    comic_issue_number,
    application_fee_pct
  ) VALUES (
    p_user_id,
    p_inventory_id,
    v_pack_item.comic_title,
    NULL,
    v_pack_item.grade, -- e.g. "CGC 9.8"; nullable
    CASE
      WHEN v_image_url != '' THEN
        jsonb_build_array(jsonb_build_object('url', v_image_url, 'type', 'general'))
      ELSE
        '[]'::jsonb
    END,
    true,                                 -- is_buy_now
    (p_price_cents::numeric) / 100.0,     -- buy_now_price stored as USD numeric
    1,                                    -- quantity
    'active',
    v_pack.partner,                       -- pack.partner often equals publisher for house packs
    v_pack_item.issue_number,
    0.100                                 -- 10% application fee, snapshotted
  )
  RETURNING id INTO v_listing_id;

  -- Flip the inventory status
  UPDATE public.user_inventory
  SET status = 'listed'
  WHERE id = p_inventory_id;

  RETURN v_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_vault_item(uuid, uuid, integer) TO service_role;
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push`

Expected: `Applying migration 20260530000000_list_vault_item_rpc.sql... Finished supabase db push.`

- [ ] **Step 3: Verify the function exists**

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

// Call with garbage UUIDs to confirm the function executes (and fails the way we expect)
const res = await fetch(url + '/rest/v1/rpc/list_vault_item', {
  method: 'POST',
  headers: h,
  body: JSON.stringify({
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_inventory_id: '00000000-0000-0000-0000-000000000000',
    p_price_cents: 1000,
  }),
});
console.log('status:', res.status);
console.log('body:', await res.text());
" 2>&1
```

Expected: status 400 or 500 (depending on Supabase response shape) with a body containing `inventory not found` somewhere in the error message. That confirms the function exists, compiled, and raised the expected exception.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260530000000_list_vault_item_rpc.sql
git commit -m "feat(db): list_vault_item RPC for atomic vault listing creation"
```

---

## Task 3: list-vault-item edge function

Authenticated edge function that wraps the RPC. Verifies the caller's identity, calls the RPC with their user_id, returns the new listing id.

**Files:**
- Create: `supabase/functions/list-vault-item/index.ts`

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/list-vault-item/index.ts
//
// Authenticated. Creates a vault listing atomically via the list_vault_item RPC.
// The RPC validates inventory ownership + status + house-origin + price floor.
//
// Request body:
//   { inventory_id: string, price_cents: number }
//
// Response:
//   { listing_id: string }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  inventory_id?: string
  price_cents?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    if (!body.inventory_id) return json({ error: 'inventory_id is required' }, 400)
    if (!body.price_cents || body.price_cents < 100) {
      return json({ error: 'price_cents must be at least 100' }, 400)
    }

    // Verify the user is allowed to sell (seller_status === 'active'). The RPC
    // itself doesn't enforce this — keeping it here in the edge function so
    // the error message is clear to the client.
    const { data: userRow } = await serviceClient
      .from('users')
      .select('seller_status')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow || userRow.seller_status !== 'active') {
      return json({
        error: 'seller_not_verified',
        message: 'Complete seller verification before listing items.',
      }, 403)
    }

    const { data: listingId, error: rpcError } = await serviceClient.rpc(
      'list_vault_item',
      {
        p_user_id: user.id,
        p_inventory_id: body.inventory_id,
        p_price_cents: body.price_cents,
      },
    )

    if (rpcError) {
      const msg = rpcError.message ?? ''
      console.error('[list-vault-item] RPC failed:', rpcError)
      if (msg.includes('not owner')) return json({ error: 'not_owner' }, 403)
      if (msg.includes('not vaulted')) return json({ error: 'not_vaulted', message: msg }, 409)
      if (msg.includes('cannot list vendor pack')) return json({ error: 'vendor_pack_item' }, 400)
      if (msg.includes('not found')) return json({ error: 'not_found', message: msg }, 404)
      return json({ error: 'list_failed', message: msg }, 500)
    }

    if (!listingId) {
      return json({ error: 'list_failed', message: 'RPC returned null' }, 500)
    }

    return json({ listing_id: listingId }, 200)
  } catch (err) {
    console.error('[list-vault-item] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Deploy the function**

Run: `npx supabase functions deploy list-vault-item`

Expected: deploys successfully. (Uses JWT auth — NO `--no-verify-jwt` flag.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/list-vault-item/index.ts
git commit -m "feat(functions): list-vault-item edge function wraps list_vault_item RPC"
```

---

## Task 4: search-comic-catalog edge function

Authenticated edge function that powers the ComicVine autocomplete in the listing wizard. Hits the `comic_catalog_cache` first; falls through to ComicVine API on miss; populates cache.

**Files:**
- Create: `supabase/functions/search-comic-catalog/index.ts`

- [ ] **Step 1: Write the function**

```typescript
// supabase/functions/search-comic-catalog/index.ts
//
// Authenticated. Comic search backed by Postgres tsvector cache + ComicVine API.
//
// Flow:
//   1. Validate auth + query
//   2. Search comic_catalog_cache via plainto_tsquery
//   3. If fewer than 3 hits, call ComicVine /issues/?filter=name:<query>
//   4. Upsert ComicVine results into the cache
//   5. Return unified result list (cache + new) deduped by id
//
// Request body:
//   { query: string }
//
// Response:
//   { results: Array<{ id, name, issue_number, cover_url, publisher, writer, artist }> }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  query?: string
}

interface ComicVineIssue {
  id: number
  name: string | null
  issue_number: string | null
  image?: { thumb_url?: string; small_url?: string; medium_url?: string }
  cover_date?: string | null
  volume?: { name?: string; publisher?: { name?: string } }
  person_credits?: Array<{ name: string; role: string }>
}

interface CatalogResult {
  id: number
  name: string
  issue_number: string | null
  cover_url: string | null
  publisher: string | null
  writer: string | null
  artist: string | null
}

const COMIC_VINE_BASE = 'https://comicvine.gamespot.com/api'
const MIN_RESULTS_BEFORE_API = 3

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // @ts-expect-error Deno env
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    // @ts-expect-error Deno env
    const comicVineKey = Deno.env.get('COMIC_VINE_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body: RequestBody = await req.json()
    const query = (body.query ?? '').trim()
    if (query.length < 2) return json({ results: [] }, 200)

    // Step 1: query the cache via tsvector
    const { data: cacheHits, error: cacheError } = await serviceClient
      .from('comic_catalog_cache')
      .select('id, name, issue_number, cover_url, publisher, writer, artist')
      .textSearch(
        'comic_catalog_search_idx',
        query.split(/\s+/).join(' & '),
        { type: 'plain' },
      )
      .limit(20)

    if (cacheError) {
      // textSearch index name may not be addressable from PostgREST in all setups.
      // Fall back to a plain ILIKE search if the gin index lookup errors.
      console.warn('[search-comic-catalog] cache tsvector failed, falling back to ILIKE:', cacheError)
    }

    let results: CatalogResult[] = []
    if (cacheHits) {
      results = cacheHits as CatalogResult[]
    } else {
      // ILIKE fallback
      const { data: ilikeHits } = await serviceClient
        .from('comic_catalog_cache')
        .select('id, name, issue_number, cover_url, publisher, writer, artist')
        .or(`name.ilike.%${query}%,issue_number.ilike.%${query}%`)
        .limit(20)
      results = (ilikeHits ?? []) as CatalogResult[]
    }

    // Step 2: if not enough cache hits, hit ComicVine
    if (results.length < MIN_RESULTS_BEFORE_API && comicVineKey) {
      try {
        const cvResults = await fetchComicVine(query, comicVineKey)

        // Upsert into cache
        if (cvResults.length > 0) {
          const cacheRows = cvResults.map((r) => ({
            id: r.id,
            name: r.name,
            issue_number: r.issue_number,
            cover_url: r.cover_url,
            publisher: r.publisher,
            writer: r.writer,
            artist: r.artist,
            cover_date: null,
            raw_response: null,
            cached_at: new Date().toISOString(),
          }))

          const { error: upsertError } = await serviceClient
            .from('comic_catalog_cache')
            .upsert(cacheRows, { onConflict: 'id' })

          if (upsertError) {
            console.error('[search-comic-catalog] cache upsert failed:', upsertError)
          }
        }

        // Merge cache hits with API results, dedupe by id
        const seen = new Set(results.map((r) => r.id))
        for (const r of cvResults) {
          if (!seen.has(r.id)) {
            results.push(r)
            seen.add(r.id)
          }
        }
      } catch (err) {
        console.error('[search-comic-catalog] ComicVine call failed (returning cache only):', err)
      }
    }

    return json({ results: results.slice(0, 20) }, 200)
  } catch (err) {
    console.error('[search-comic-catalog] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

async function fetchComicVine(query: string, apiKey: string): Promise<CatalogResult[]> {
  // ComicVine requires User-Agent + api_key. Format response as JSON.
  // Fields requested narrow the payload size considerably.
  const params = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
    filter: `name:${query}`,
    field_list: 'id,name,issue_number,image,cover_date,volume,person_credits',
    limit: '15',
  })
  const url = `${COMIC_VINE_BASE}/issues/?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'InkStash/1.0 (marketplace catalog)',
    },
  })

  if (!res.ok) {
    throw new Error(`ComicVine ${res.status}: ${await res.text()}`)
  }

  const body = await res.json() as { results?: ComicVineIssue[] }
  const issues = body.results ?? []

  return issues.map((issue): CatalogResult => {
    const writer = (issue.person_credits ?? [])
      .find((p) => /writer/i.test(p.role))?.name ?? null
    const artist = (issue.person_credits ?? [])
      .find((p) => /(artist|penciller|inker)/i.test(p.role))?.name ?? null

    return {
      id: issue.id,
      name: issue.name ?? issue.volume?.name ?? 'Untitled',
      issue_number: issue.issue_number,
      cover_url: issue.image?.medium_url ?? issue.image?.thumb_url ?? null,
      publisher: issue.volume?.publisher?.name ?? null,
      writer,
      artist,
    }
  })
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Deploy the function**

Run: `npx supabase functions deploy search-comic-catalog`

Expected: deploys successfully.

- [ ] **Step 3: Smoke test the function (requires JWT)**

This is the same JWT-required test pattern from M1-Task7. If you don't have a JWT handy, defer to Task 9's manual test. Otherwise:

```bash
JWT="<paste user jwt>"
curl -sS -X POST "https://uhstjindafnvlrjkpggx.supabase.co/functions/v1/search-comic-catalog" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"query":"batman"}' 2>&1
```

Expected: JSON response with `results: [...]` containing several Batman issues with cover urls. First call is slow (hits ComicVine); second call with the same query is fast (cache hit).

If ComicVine returns 401 / 403: check `COMIC_VINE_KEY` is set on the Supabase project (it's in `.env` locally — needs to be also set as a Supabase function secret).

Set the secret if not already:
```bash
npx supabase secrets set COMIC_VINE_KEY="<your-key>" 2>&1
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/search-comic-catalog/index.ts
git commit -m "feat(functions): search-comic-catalog edge function (cache + ComicVine fallback)"
```

---

## Task 5: API clients (comicCatalog + listings)

Two small frontend wrappers around the edge functions from Tasks 3 + 4.

**Files:**
- Create: `src/api/comicCatalog.ts`
- Create: `src/api/listings.ts`

- [ ] **Step 1: Write comicCatalog.ts**

```typescript
// src/api/comicCatalog.ts
import { supabase } from './supabase/supabaseClient';

export interface ComicCatalogResult {
  id: number;
  name: string;
  issue_number: string | null;
  cover_url: string | null;
  publisher: string | null;
  writer: string | null;
  artist: string | null;
}

export const comicCatalogAPI = {
  async search(query: string): Promise<ComicCatalogResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('search-comic-catalog', {
      body: { query: trimmed },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return (data?.results ?? []) as ComicCatalogResult[];
  },
};
```

- [ ] **Step 2: Write listings.ts**

```typescript
// src/api/listings.ts
import { supabase } from './supabase/supabaseClient';

export interface ListVaultItemResult {
  listing_id: string;
}

export const listingsAPI = {
  /**
   * Lists a vault inventory item for sale on the marketplace.
   * Returns the new listing id. The book stays in the InkStash vault;
   * ownership transfers when the listing sells (handled by M3's
   * open-listing-order edge function).
   */
  async listVaultItem(inventoryId: string, priceCents: number): Promise<ListVaultItemResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('list-vault-item', {
      body: {
        inventory_id: inventoryId,
        price_cents: priceCents,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) {
      // Surface common error codes as readable messages
      if (data.error === 'seller_not_verified') {
        throw new Error('Complete seller verification before listing items.');
      }
      if (data.error === 'not_owner') {
        throw new Error('You do not own this inventory item.');
      }
      if (data.error === 'not_vaulted') {
        throw new Error('This item is not currently in your vault.');
      }
      if (data.error === 'vendor_pack_item') {
        throw new Error('Vendor pack items cannot be listed on the marketplace.');
      }
      throw new Error(data.message ?? data.error);
    }
    if (!data?.listing_id) throw new Error('No listing id returned');
    return data as ListVaultItemResult;
  },

  /**
   * Delists an active listing (the seller's own only). Sets status to 'delisted'
   * and if it was a vault listing, reverts inventory.status back to 'vaulted'.
   *
   * For M2 this is a simple status update (RLS-enforced ownership). When a
   * full delist flow is needed (e.g., to revert inventory atomically), revisit.
   */
  async delist(listingId: string): Promise<void> {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'delisted' })
      .eq('id', listingId);
    if (error) throw new Error(error.message);

    // Best-effort: if there's a source_inventory_id, revert it.
    const { data: listing } = await supabase
      .from('listings')
      .select('source_inventory_id')
      .eq('id', listingId)
      .maybeSingle();

    if (listing?.source_inventory_id) {
      await supabase
        .from('user_inventory')
        .update({ status: 'vaulted' })
        .eq('id', listing.source_inventory_id);
    }
  },
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output.

- [ ] **Step 4: Commit**

```bash
git add src/api/comicCatalog.ts src/api/listings.ts
git commit -m "feat(api): comicCatalogAPI + listingsAPI clients"
```

---

## Task 6: SellerConnectGate + ConnectOnboardingModal components

The gate component is reused across MyStash's "List for sale" button and ListItem's wizard entry. The modal launches `initiateConnectOnboarding` from M1.

**Files:**
- Create: `src/components/listings/SellerConnectGate.tsx`
- Create: `src/components/listings/ConnectOnboardingModal.tsx`

- [ ] **Step 1: Write ConnectOnboardingModal.tsx**

```tsx
// src/components/listings/ConnectOnboardingModal.tsx
//
// Stripe Connect Express onboarding launcher. Opens when a user wants to
// list something but seller_status !== 'active'.
//
// Calls sellersAPI.initiateConnectOnboarding() to get the Stripe onboarding URL
// (the edge function creates the Connect account if needed) and opens it in
// the same tab. After Stripe-side completion, the webhook flips seller_status
// to 'active' (assuming the Connect-mode webhook config is in place — see
// M1 PR description for the known operational gotcha).

import { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close, OpenInNew } from '@mui/icons-material';
import { sellersAPI } from '../../api/sellers';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ConnectOnboardingModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const result = await sellersAPI.initiateConnectOnboarding();
      // Redirect in the same tab — Stripe's hosted onboarding works best when
      // the parent context is the seller's session.
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start verification');
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
    >
      {!loading && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: inkstashColors.muted,
            '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 22,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 1,
          }}
        >
          Verify to start selling
        </Typography>

        <Typography sx={{ color: inkstashColors.ink, fontSize: 14, mb: 2.5 }}>
          To list items on InkStash, you need to verify with Stripe (~5 minutes).
          This is the same verification banks use — it confirms your identity
          and connects your payout bank account.
        </Typography>

        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 2,
            mb: 3,
          }}
        >
          <Typography sx={{ fontSize: 12, color: inkstashColors.muted, mb: 1, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What you'll need
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, m: 0, color: inkstashColors.ink, fontSize: 13, lineHeight: 1.8 }}>
            <li>Government-issued ID (driver's license or passport)</li>
            <li>Social Security Number (last 4 digits accepted)</li>
            <li>Bank account for payouts (routing + account number)</li>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleStart}
          disabled={loading}
          endIcon={loading ? <CircularProgress size={16} color="inherit" /> : <OpenInNew fontSize="small" />}
          sx={{ py: 1.4, fontWeight: 700 }}
        >
          {loading ? 'Opening Stripe...' : 'Start verification'}
        </Button>

        <Typography sx={{ mt: 2, fontSize: 11, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          You'll be redirected to Stripe's secure verification flow.
        </Typography>
      </Box>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write SellerConnectGate.tsx**

```tsx
// src/components/listings/SellerConnectGate.tsx
//
// Wraps any "start selling" affordance (the List for sale button on MyStash,
// the /list-item wizard, etc.) and intercepts unverified users with the
// ConnectOnboardingModal.
//
// If user.seller_status === 'active': renders children normally.
// Otherwise: renders children but their onClick is intercepted to open the
// modal instead. The children are wrapped so they can't accidentally fire.
//
// Usage:
//   <SellerConnectGate>
//     <Button onClick={handleList}>List for sale</Button>
//   </SellerConnectGate>

import { Children, cloneElement, isValidElement, useState, type ReactElement, type MouseEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import ConnectOnboardingModal from './ConnectOnboardingModal';

interface Props {
  children: ReactElement;
  /** Optional: render something else (e.g. a tooltip) instead of the child when not active. */
  fallback?: ReactElement;
}

export default function SellerConnectGate({ children, fallback }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const isActive = user?.seller_status === 'active';

  if (isActive) {
    return Children.only(children);
  }

  if (fallback) {
    // Wrap the fallback in a click handler that opens the modal
    const wrapped = isValidElement(fallback)
      ? cloneElement(fallback as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
          onClick: (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setModalOpen(true);
          },
        })
      : fallback;

    return (
      <>
        {wrapped}
        <ConnectOnboardingModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  // Default: wrap the child element so clicks open the modal
  const wrappedChild = cloneElement(children as ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setModalOpen(true);
    },
  });

  return (
    <>
      {wrappedChild}
      <ConnectOnboardingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output.

- [ ] **Step 4: Commit**

```bash
git add src/components/listings/SellerConnectGate.tsx src/components/listings/ConnectOnboardingModal.tsx
git commit -m "feat(listings): SellerConnectGate + ConnectOnboardingModal for seller verification gating"
```

---

## Task 7: SetPriceModal + CardDispositionRow vault list integration

Adds the actual vault listing UI: "List for sale" button on a card row + the price-entry modal that calls `listingsAPI.listVaultItem`.

**Files:**
- Create: `src/components/listings/SetPriceModal.tsx`
- Modify: `src/components/packs/CardDispositionRow.tsx`

- [ ] **Step 1: Write SetPriceModal.tsx**

```tsx
// src/components/listings/SetPriceModal.tsx
//
// Lightweight modal: enter asking price, see the 90/10 fee breakdown,
// confirm to list. Calls listingsAPI.listVaultItem and closes on success.

import { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { listingsAPI } from '../../api/listings';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

interface Props {
  open: boolean;
  onClose: () => void;
  inventoryId: string;
  itemTitle: string;
  itemImageUrl?: string | null;
  /** Fires after successful listing creation with the new listing id. */
  onListed?: (listingId: string) => void;
}

const FEE_PCT = 0.10;

export default function SetPriceModal({
  open, onClose, inventoryId, itemTitle, itemImageUrl, onListed,
}: Props) {
  const [priceUsd, setPriceUsd] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPriceUsd('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const priceCents = (() => {
    const parsed = parseFloat(priceUsd);
    if (!isFinite(parsed) || parsed <= 0) return 0;
    return Math.round(parsed * 100);
  })();

  const feeCents = Math.round(priceCents * FEE_PCT);
  const receiveCents = priceCents - feeCents;

  const canSubmit = priceCents >= 100 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await listingsAPI.listVaultItem(inventoryId, priceCents);
      onListed?.(result.listing_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not list item');
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: inkstashRadii.lg,
          bgcolor: inkstashColors.bgElev,
          fontFamily: inkstashFonts.ui,
        },
      }}
    >
      {!submitting && (
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: inkstashColors.muted,
            '&:hover': { bgcolor: inkstashColors.bgSunken, color: inkstashColors.ink },
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      )}

      <Box sx={{ p: { xs: 3, sm: 3.5 } }}>
        <Typography
          sx={{
            fontFamily: inkstashFonts.display,
            fontWeight: 800,
            fontSize: 20,
            color: inkstashColors.ink,
            textTransform: 'uppercase',
            letterSpacing: '0.005em',
            mb: 2,
          }}
        >
          Set your asking price
        </Typography>

        {/* Item summary */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: 2.5,
            p: 1.25,
            bgcolor: inkstashColors.bgSunken,
            borderRadius: inkstashRadii.md,
          }}
        >
          {itemImageUrl && (
            <Box
              component="img"
              src={itemImageUrl}
              alt={itemTitle}
              sx={{
                width: 40, height: 60,
                objectFit: 'cover',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
          )}
          <Typography sx={{
            fontSize: 13, color: inkstashColors.ink, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {itemTitle}
          </Typography>
        </Box>

        <TextField
          autoFocus
          fullWidth
          label="Asking price (USD)"
          type="number"
          value={priceUsd}
          onChange={(e) => setPriceUsd(e.target.value)}
          slotProps={{
            htmlInput: { min: 1, step: 0.01, inputMode: 'decimal' },
            input: { startAdornment: <Box sx={{ mr: 1, color: inkstashColors.muted }}>$</Box> },
          }}
          disabled={submitting}
          sx={{ mb: 2 }}
        />

        {/* Fee breakdown */}
        <Box
          sx={{
            bgcolor: inkstashColors.bgSunken,
            border: `1px solid ${inkstashColors.border}`,
            borderRadius: inkstashRadii.md,
            p: 1.5,
            mb: 2.5,
            fontFamily: inkstashFonts.mono,
            fontSize: 13,
            color: inkstashColors.ink,
          }}
        >
          <Row label="Buyers will pay" value={`$${(priceCents / 100).toFixed(2)}`} />
          <Row label="InkStash fee (10%)" value={`-$${(feeCents / 100).toFixed(2)}`} color={inkstashColors.muted} />
          <Box sx={{ borderTop: `1px solid ${inkstashColors.border}`, mt: 1, pt: 1 }}>
            <Row label="You'll receive" value={`$${(receiveCents / 100).toFixed(2)}`} bold />
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button
          variant="contained"
          fullWidth
          disabled={!canSubmit}
          onClick={handleSubmit}
          sx={{ py: 1.4, fontWeight: 700 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : 'List for sale'}
        </Button>

        <Typography sx={{ mt: 1.5, fontSize: 10.5, color: inkstashColors.muted, textAlign: 'center', fontFamily: inkstashFonts.mono, letterSpacing: '0.04em' }}>
          Book stays in the InkStash vault. We ship to the buyer on sale.
        </Typography>
      </Box>
    </Dialog>
  );
}

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.25 }}>
      <span style={{ color: color ?? 'inherit' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: color ?? 'inherit' }}>{value}</span>
    </Box>
  );
}
```

- [ ] **Step 2: Read the current CardDispositionRow.tsx**

Run: `wc -l src/components/packs/CardDispositionRow.tsx`

Expected: ~443 lines. Identify (a) the existing disposition buttons (Keep / Sell-back / Ship), (b) the props interface that includes `packOrigin`.

- [ ] **Step 3: Add the new prop + state to CardDispositionRow**

Find the props interface. It already has `packOrigin?: 'house' | 'vendor' | 'publisher'`. Add a new optional callback so the parent can refresh after a successful listing:

```tsx
interface CardDispositionRowProps {
  // ...existing props...
  packOrigin?: 'house' | 'vendor' | 'publisher';
  /** Fires after the inventory row is successfully listed. Parent should
   *  refresh so the row reflects the new 'listed' status. */
  onListed?: (listingId: string) => void;
}
```

In the component body, near the existing state declarations:

```tsx
const [priceModalOpen, setPriceModalOpen] = useState(false);
```

And import the components + the auth hook at the top:

```tsx
import SellerConnectGate from '../listings/SellerConnectGate';
import SetPriceModal from '../listings/SetPriceModal';
```

- [ ] **Step 4: Add the List for sale button**

The disposition button row already exists. Find where the Ship button is rendered (typically the last in the row group). After it (before the row's closing tag), add a conditionally-rendered List button:

```tsx
{packOrigin === 'house' && (
  <SellerConnectGate
    fallback={
      <Box
        component="button"
        type="button"
        disabled
        sx={{
          // Match the existing disposition button style — copy from the Ship button block
          bgcolor: 'transparent',
          border: `1px solid ${inkstashColors.border}`,
          padding: '8px 14px',
          borderRadius: 999,
          fontFamily: inkstashFonts.ui,
          fontWeight: 600,
          fontSize: 12,
          color: inkstashColors.muted,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          '&:hover': { borderColor: inkstashColors.borderStrong, color: inkstashColors.ink },
        }}
      >
        List for sale
      </Box>
    }
  >
    <Box
      component="button"
      type="button"
      onClick={() => setPriceModalOpen(true)}
      sx={{
        // Same styling as the fallback but pointer cursor + hover effects
        bgcolor: 'transparent',
        border: `1px solid ${inkstashColors.border}`,
        padding: '8px 14px',
        borderRadius: 999,
        fontFamily: inkstashFonts.ui,
        fontWeight: 600,
        fontSize: 12,
        color: inkstashColors.ink,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        '&:hover': { borderColor: inkstashColors.borderStrong, bgcolor: inkstashColors.bgSunken },
        '&:active': { transform: 'scale(0.97)' },
        transition: 'border-color 140ms ease, background 140ms ease, transform 100ms ease',
      }}
    >
      List for sale
    </Box>
  </SellerConnectGate>
)}
```

The gating logic: `packOrigin === 'house'` is the outer check (no vendor pack items listable). `SellerConnectGate` handles the seller_status check. The `inventory.status === 'vaulted'` check is implicit because the dispositions are only shown for vaulted items in MyStash's existing render flow — if you find that's NOT enforced upstream, add `&& disposition === 'pending'` (or equivalent) to the outer guard.

- [ ] **Step 5: Mount the SetPriceModal in the component**

At the bottom of the component's return, after the disposition button row:

```tsx
{priceModalOpen && (
  <SetPriceModal
    open={priceModalOpen}
    onClose={() => setPriceModalOpen(false)}
    inventoryId={inventory.id}
    itemTitle={item.comic_title}
    itemImageUrl={item.image_url}
    onListed={(listingId) => {
      setPriceModalOpen(false);
      onListed?.(listingId);
    }}
  />
)}
```

Adjust `inventory.id`, `item.comic_title`, `item.image_url` to whatever the actual prop names are in CardDispositionRow's existing scope.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output. If there's a complaint about `inventory.id` or similar — adjust to the actual variable name in the file.

- [ ] **Step 7: Commit**

```bash
git add src/components/listings/SetPriceModal.tsx src/components/packs/CardDispositionRow.tsx
git commit -m "feat(listings): vault listing flow — SetPriceModal + List for sale button"
```

---

## Task 8: Refactor ListItem.tsx — ComicSearchInput + comics-only

The big refactor. Replace the multi-product step 1 search with a ComicVine autocomplete + free-text fallback. Strip non-comic flows. Add the seller verification gate to the outer wrapper.

**Files:**
- Create: `src/components/listings/ComicSearchInput.tsx`
- Modify: `src/pages/ListItem.tsx`

- [ ] **Step 1: Write ComicSearchInput.tsx**

```tsx
// src/components/listings/ComicSearchInput.tsx
//
// Autocomplete input wrapping comicCatalogAPI.search(). Renders a dropdown
// with cover thumbnail + title + publisher chip. Includes a "Don't see your
// comic? Enter manually." fallback that surfaces a small free-text form.

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Paper,
  CircularProgress,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { comicCatalogAPI, type ComicCatalogResult } from '../../api/comicCatalog';
import { inkstashColors, inkstashFonts, inkstashRadii } from '../../theme/inkstashTokens';

export interface ComicSelection {
  /** ComicVine id if selected from autocomplete; null for free-text entries. */
  comic_vine_id: number | null;
  title: string;
  issue_number: string | null;
  cover_url: string | null;
  publisher: string | null;
  writer: string | null;
  artist: string | null;
}

interface Props {
  onSelect: (selection: ComicSelection) => void;
}

export default function ComicSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComicCatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual entry fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualIssue, setManualIssue] = useState('');
  const [manualPublisher, setManualPublisher] = useState('');
  const [manualWriter, setManualWriter] = useState('');
  const [manualArtist, setManualArtist] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      comicCatalogAPI.search(query)
        .then((rs) => setResults(rs))
        .catch((err) => setError(err.message ?? 'Search failed'))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handlePick(r: ComicCatalogResult) {
    onSelect({
      comic_vine_id: r.id,
      title: r.name,
      issue_number: r.issue_number,
      cover_url: r.cover_url,
      publisher: r.publisher,
      writer: r.writer,
      artist: r.artist,
    });
  }

  function handleManualSubmit() {
    if (!manualTitle.trim()) return;
    onSelect({
      comic_vine_id: null,
      title: manualTitle.trim(),
      issue_number: manualIssue.trim() || null,
      cover_url: null,
      publisher: manualPublisher.trim() || null,
      writer: manualWriter.trim() || null,
      artist: manualArtist.trim() || null,
    });
  }

  if (showManual) {
    return (
      <Box>
        <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 1.5, fontFamily: inkstashFonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Manual entry
        </Typography>
        <TextField
          fullWidth
          autoFocus
          label="Title (required)"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Issue number"
          value={manualIssue}
          onChange={(e) => setManualIssue(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Publisher"
          value={manualPublisher}
          onChange={(e) => setManualPublisher(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Writer"
          value={manualWriter}
          onChange={(e) => setManualWriter(e.target.value)}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Artist"
          value={manualArtist}
          onChange={(e) => setManualArtist(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="text" onClick={() => setShowManual(false)} sx={{ color: inkstashColors.muted }}>
            Back to search
          </Button>
          <Button variant="contained" onClick={handleManualSubmit} disabled={!manualTitle.trim()} sx={{ flex: 1, fontWeight: 700 }}>
            Continue
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        autoFocus
        label="Search by title, issue, or publisher"
        placeholder="e.g. Absolute Batman 1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {(loading || results.length > 0 || (query.length >= 2 && !loading)) && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 0.5,
            borderRadius: inkstashRadii.md,
            maxHeight: 360,
            overflowY: 'auto',
            bgcolor: inkstashColors.bgElev,
            border: `1px solid ${inkstashColors.border}`,
            zIndex: 10,
          }}
        >
          {loading && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} />
            </Box>
          )}

          {!loading && error && (
            <Typography sx={{ p: 2, color: '#ef4444', fontSize: 13 }}>{error}</Typography>
          )}

          {!loading && !error && results.map((r) => (
            <Box
              key={r.id}
              component="button"
              type="button"
              onClick={() => handlePick(r)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                width: '100%',
                p: 1.25,
                border: 'none',
                bgcolor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderBottom: `1px solid ${inkstashColors.border}`,
                '&:hover': { bgcolor: inkstashColors.bgSunken },
                '&:last-child': { borderBottom: 'none' },
              }}
            >
              <Box
                sx={{
                  width: 32, height: 48,
                  bgcolor: inkstashColors.bgSunken,
                  borderRadius: 0.5,
                  flexShrink: 0,
                  backgroundImage: r.cover_url ? `url(${r.cover_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: inkstashColors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}{r.issue_number ? ` #${r.issue_number}` : ''}
                </Typography>
                {r.publisher && (
                  <Typography sx={{ fontSize: 10.5, color: inkstashColors.muted, fontFamily: inkstashFonts.mono, mt: 0.25 }}>
                    {r.publisher}
                  </Typography>
                )}
              </Box>
              {r.writer && (
                <Chip
                  label={`by ${r.writer}`}
                  size="small"
                  sx={{ fontSize: 10, bgcolor: inkstashColors.bgSunken, color: inkstashColors.muted }}
                />
              )}
            </Box>
          ))}

          {!loading && !error && results.length === 0 && query.length >= 2 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 13, color: inkstashColors.muted, mb: 1.5 }}>
                No matches found for "{query}".
              </Typography>
            </Box>
          )}

          <Box
            component="button"
            type="button"
            onClick={() => setShowManual(true)}
            sx={{
              display: 'block',
              width: '100%',
              p: 1.5,
              border: 'none',
              borderTop: `1px solid ${inkstashColors.border}`,
              bgcolor: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              color: inkstashColors.brand,
              textAlign: 'center',
              fontFamily: inkstashFonts.mono,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              '&:hover': { bgcolor: inkstashColors.bgSunken },
            }}
          >
            Don't see your comic? Enter manually
          </Box>
        </Paper>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Read the current ListItem.tsx step 1**

Run: `wc -l src/pages/ListItem.tsx && grep -n "step.*1\|Step 1\|catalog\|comics\|cards\|funko\|search" src/pages/ListItem.tsx | head -25`

Identify (a) the step 1 component(s) that render the multi-product catalog search, (b) where the user's selection populates state used by later steps.

- [ ] **Step 3: Replace step 1 content with ComicSearchInput**

The exact code depends on the file structure. The high-level change:

- Delete the imports and components related to the multi-product catalog search (cards, Funko, figures).
- Add `import ComicSearchInput from '../components/listings/ComicSearchInput';` and `import type { ComicSelection } from '../components/listings/ComicSearchInput';`.
- Render `<ComicSearchInput onSelect={(sel) => handleComicSelected(sel)} />` in place of the old multi-product search.
- `handleComicSelected` should set the listing-creation state's title, issue number, publisher, writer, artist, cover URL, and comic_vine_id from the selection, then advance to step 2.

If the file has a `category` step or radio group (Comics / Cards / Funko / etc.), delete that step entirely. Renumber subsequent steps (e.g., what was step 2 stays step 2 since step 1's structure is preserved, just the content swapped).

- [ ] **Step 4: Add seller verification gate to the wizard**

At the top of the `ListItem` component's return, wrap the whole wizard render in a `<SellerConnectGate>`. The simplest pattern is to render the entire wizard inside a guard that only shows it when `seller_status === 'active'`; otherwise render a card explaining "Verify to start selling" with a button that opens the modal.

For simplicity, copy this pattern:

```tsx
import SellerConnectGate from '../components/listings/SellerConnectGate';
import { Box, Button, Typography } from '@mui/material';
import { useState } from 'react';

// Inside the component, near the top:
const { user } = useAuth();
const isSeller = user?.seller_status === 'active';

// In the return:
if (!isSeller) {
  // ... render the existing AppShell wrapper but inside the Container,
  //     show a centered card with the message + a button that uses
  //     <SellerConnectGate> to trigger the modal.
  return (
    <AppShell>
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5 }}>
          Verify to start selling
        </Typography>
        <Typography sx={{ color: inkstashColors.muted, mb: 3 }}>
          List items on InkStash after a 5-minute verification with Stripe.
        </Typography>
        <SellerConnectGate>
          <Button variant="contained" size="large" sx={{ fontWeight: 700, py: 1.5, px: 4 }}>
            Start verification
          </Button>
        </SellerConnectGate>
      </Container>
    </AppShell>
  );
}

// ...rest of the wizard render
```

- [ ] **Step 5: Update the listing INSERT to include comic metadata**

Find the `handleSubmitListing` function (around lines 458-577 per the audit). The existing insert needs to also include the new comic_* fields from the selection state:

```typescript
// In the .insert(...) payload, alongside existing fields:
comic_vine_id: comicSelection.comic_vine_id,
comic_publisher: comicSelection.publisher,
comic_writer: comicSelection.writer,
comic_artist: comicSelection.artist,
comic_issue_number: comicSelection.issue_number,
title: comicSelection.title,
// (title already exists in the schema; just make sure it comes from the comic search)
```

(`comicSelection` is whatever state variable you wired in Step 3 to hold the search result.)

Also: explicitly set `application_fee_pct: 0.100` in the insert so the snapshot lands.

- [ ] **Step 6: Strip remaining non-comic flows**

Run: `grep -n "Funko\|funko\|trading card\|figure\|Card\b" src/pages/ListItem.tsx | head -20`

Anything that's clearly about non-comic products gets deleted. Condition strings should be reduced to comic-specific values: "Sealed", "Near Mint", "Very Fine", "Fine", "Good", "Poor". Replace the existing condition radio group with these. Grade field stays (for slabbed comics like "CGC 9.8").

The `category` column in the insert should be left NULL (already is per the audit — confirm).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output. Common errors after a big refactor:
- Unused imports — remove them.
- References to deleted state — clean up.

If you hit a real architectural blocker, report DONE_WITH_CONCERNS rather than fight it; the wizard refactor can ship as a follow-up if needed.

- [ ] **Step 8: Visual smoke test**

Start the dev server. Navigate to `/list-item`:

- Logged out: should redirect to login (existing behavior).
- Logged in but `seller_status !== 'active'`: should see the "Verify to start selling" card, not the wizard. Clicking the button opens the ConnectOnboardingModal.
- Logged in with `seller_status === 'active'`: wizard renders. Step 1 is the ComicSearchInput. Type "batman" — dropdown shows real ComicVine results with cover thumbs.
- Pick a result → step 2 shows pre-populated title + metadata.
- Walk through to step 4 → submit → listing row created in DB with comic_* fields populated.

- [ ] **Step 9: Commit**

```bash
git add src/components/listings/ComicSearchInput.tsx src/pages/ListItem.tsx
git commit -m "feat(listings): refactor ListItem step 1 to ComicVine search + verification gate"
```

---

## Task 9: End-to-end smoke test (manual)

Verification-only task. Same pattern as M1's Task 7.

You'll need: a user with `seller_status='active'` (M1 already left `dsauve98` in this state).

- [ ] **Step 1: Verify sidebar badge**

Log in as `dsauve98@gmail.com`. Confirm the sidebar shows the brand-color "Seller" label with a check icon.

Log in as a user with `seller_status='inactive'`. Confirm muted "Free" label, no icon.

- [ ] **Step 2: Verify vault listing flow**

As `dsauve98`, navigate to `/my-stash`. If this user has no house pack inventory: switch to your main account, buy a house pack, then come back to dsauve98 — OR temporarily transfer one inventory row to dsauve98 via SQL for testing.

Find a house pack inventory row. The CardDispositionRow should show four buttons: Keep / Sell-back / Ship / List for sale.

Click "List for sale" → SetPriceModal opens → enter $50 → confirm. Watch the network request.

Expected:
- Edge function call to `list-vault-item` returns 200 with `{ listing_id: "..." }`.
- `user_inventory.status` for that row flips to `'listed'` (verify in DB).
- New `listings` row exists with `source_inventory_id` set + comic metadata populated.

- [ ] **Step 3: Verify outside-item wizard flow**

Same user. Navigate to `/list-item`. Walk through:
- Step 1: search "absolute batman 1" → click first result → step 2 advances with pre-populated metadata.
- Step 2: pick a condition, optionally enter a grade, add 1-2 photos.
- Step 3: set buy_now_price = $50, pick shipping rate.
- Step 4: review + submit.

Expected: listing row created in DB with `comic_vine_id` set (number), `comic_publisher` etc. populated, `source_inventory_id` NULL, `application_fee_pct = 0.100`.

- [ ] **Step 4: Verify gate flow for unverified user**

Switch to a user with `seller_status='inactive'`. Navigate to `/list-item`. Should see the "Verify to start selling" card, not the wizard. Click the button → ConnectOnboardingModal opens.

In MyStash, find a house pack inventory row. The "List for sale" button should appear disabled-looking, and clicking it should open the ConnectOnboardingModal too.

- [ ] **Step 5: Empty commit marker**

If everything passes:

```bash
git commit --allow-empty -m "test(marketplace-m2): listing creation smoke test passed end-to-end"
```

---

# M2 Acceptance Verification

Phase M2 is complete when:

- [ ] Acceptance #1: Sidebar tier badge replaced with seller_status-driven badge (4 states, icon for pending/active/paused).
- [ ] Acceptance #2: `list_vault_item` RPC migration applied; calling it with invalid UUIDs returns the expected error.
- [ ] Acceptance #3: `list-vault-item` edge function deployed; rejects unauthenticated calls and seller_not_verified users.
- [ ] Acceptance #4: `search-comic-catalog` edge function deployed; ComicVine search returns real Batman results for the query "batman"; cached on second call.
- [ ] Acceptance #5: `comicCatalogAPI.search()` + `listingsAPI.listVaultItem()` typecheck and are exported.
- [ ] Acceptance #6: `<SellerConnectGate>` + `<ConnectOnboardingModal>` render correctly; clicking a gated button opens the modal; clicking "Start verification" redirects to a Stripe URL.
- [ ] Acceptance #7: `<SetPriceModal>` opens from CardDispositionRow's "List for sale" button; submitting creates a listing row + flips inventory to 'listed'.
- [ ] Acceptance #8: `ListItem.tsx` wizard step 1 is the ComicSearchInput; non-comic flows are gone; verification gate blocks unverified users.
- [ ] Acceptance #9: End-to-end smoke test passed in dev (both vault listing flow + outside-item wizard flow).

M2 is done when all nine check.
