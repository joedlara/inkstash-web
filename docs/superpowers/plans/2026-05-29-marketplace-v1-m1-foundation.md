# Marketplace v1 — M1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the schema + Stripe Connect for sellers + payouts table rename — the foundation everything else in Marketplace v1 builds on. No buyer-facing UI yet.

**Architecture:** One migration adds `users.stripe_connect_account_id` + `users.seller_status`, extends `listings` with vault link + comic metadata, creates `comic_catalog_cache` + `refund_requests` + `disputes` tables, and renames `vendor_payouts` → `seller_payouts` with FK migration. `open-pack-usd` gets a one-line column-name update. `stripe-webhook`'s existing `account.updated` handler extends to flip `users.seller_status='active'`. A new `initiate-seller-connect` edge function provisions Connect accounts for non-vendor sellers. Small frontend additions: a `sellersAPI` client and a `seller_status` field on the existing User type.

**Tech Stack:** Supabase Postgres + RLS, Supabase Edge Functions (Deno), Stripe Node SDK (existing `stripe@^18.4.0`), Stripe Connect Express, React 19 + TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-29-marketplace-v1-design.md` (sections 1, 5, 6 partially)

**Out of scope for M1:** ComicVine search edge function, vault listing flow, outside-item wizard refactor, marketplace browse, checkout, refund processing, emails. Those land in M2/M3/M4.

---

## Testing convention for this plan

The codebase has no automated test framework today (no Vitest, no Jest, no Playwright). Adding one is out of scope. Verification uses:

1. **Typecheck after every TS change:** `npx tsc --noEmit` — must produce no output.
2. **SQL verification after migrations:** explicit queries against the remote Supabase Postgres via the existing `node --input-type=module` inline pattern (see Task 1 Step 4).
3. **End-to-end manual verification in Stripe test mode** for the seller Connect flow, documented at the end.

When a step says "Run it to make sure it fails," that means: execute the verification command, observe the failure mode that the next code step will fix. The failure IS the test.

---

## File Map

### Migration (new)

| File | Purpose |
|---|---|
| `supabase/migrations/20260529000000_marketplace_v1_foundation.sql` | All M1 schema: users columns, listings columns, comic_catalog_cache, refund_requests, disputes, vendor_payouts→seller_payouts rename with FK + index renames + backfill, RLS policies. |

### Edge functions

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/open-pack-usd/index.ts` | Modify | Update `vendor_payouts` table reference → `seller_payouts`, and `vendor_id` column → `payee_user_id`. The vendor_id (from request body) maps to the vendor's `user_id` for the insert. |
| `supabase/functions/stripe-webhook/index.ts` | Modify | (1) Update the idempotency check in `openVendorPack` to query `seller_payouts` instead of `vendor_payouts`. (2) Extend `handleAccountUpdated`: after the vendor lookup fails, fall through to a users-table lookup by `stripe_connect_account_id` and flip `seller_status='active'` when `charges_enabled && payouts_enabled`. |
| `supabase/functions/initiate-seller-connect/index.ts` | Create | Authenticated edge function. Creates a Stripe Connect Express account for the user (if not already created), inserts/updates `users.stripe_connect_account_id` + `seller_status='pending'`, generates an `accountLinks` onboarding URL, returns it. |

### API layer

| File | Action | Purpose |
|---|---|---|
| `src/api/sellers.ts` | Create | `getSellerStatus()` (reads from current user), `initiateConnectOnboarding()` (calls the edge function, returns the Stripe URL). |
| `src/api/auth/types.ts` (or wherever the User type lives) | Modify | Add `stripe_connect_account_id: string \| null` and `seller_status: 'inactive' \| 'pending' \| 'active' \| 'paused'` to the User type. |

### No frontend page/component changes in M1

M1 is server-side + API client only. The UI that calls `sellersAPI.initiateConnectOnboarding()` (the `<ConnectOnboardingModal>` and `<SellerConnectGate>` components) ships in M2.

### Files explicitly NOT modified in M1

- `src/components/packs/CardDispositionRow.tsx` — vault listing button is M2.
- `src/pages/ListItem.tsx`, `src/pages/Marketplace.tsx`, `src/pages/ItemDetail.tsx` — all M2/M3.
- `supabase/functions/create-payment-intent/index.ts` — listing payment branch is M3.

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/20260529000000_marketplace_v1_foundation.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260529000000_marketplace_v1_foundation.sql
--
-- Marketplace v1 — M1 Foundation:
--   1. users.stripe_connect_account_id + seller_status (for non-vendor sellers)
--   2. listings table extensions (vault link + comic metadata + fee snapshot)
--   3. comic_catalog_cache table (memoize ComicVine)
--   4. refund_requests table (buyer-initiated refund tracking)
--   5. disputes table (Stripe chargeback logging)
--   6. vendor_payouts → seller_payouts rename with FK migration

-- ── 1. users seller columns ─────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN stripe_connect_account_id text UNIQUE,
  ADD COLUMN seller_status text NOT NULL DEFAULT 'inactive'
    CHECK (seller_status IN ('inactive', 'pending', 'active', 'paused'));

CREATE INDEX users_seller_status_idx ON public.users(seller_status);

-- ── 2. listings extensions ──────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN source_inventory_id uuid REFERENCES public.user_inventory(id),
  ADD COLUMN comic_vine_id integer,
  ADD COLUMN comic_writer text,
  ADD COLUMN comic_artist text,
  ADD COLUMN comic_publisher text,
  ADD COLUMN comic_issue_number text,
  ADD COLUMN application_fee_pct numeric(4,3) NOT NULL DEFAULT 0.100
    CHECK (application_fee_pct BETWEEN 0 AND 1);

CREATE INDEX listings_source_inventory_idx ON public.listings(source_inventory_id)
  WHERE source_inventory_id IS NOT NULL;
CREATE INDEX listings_publisher_idx ON public.listings(comic_publisher)
  WHERE status = 'active';
CREATE INDEX listings_comic_vine_id_idx ON public.listings(comic_vine_id)
  WHERE comic_vine_id IS NOT NULL;

-- A vault listing's source must be unique (cannot list the same vault item twice).
CREATE UNIQUE INDEX listings_source_inventory_unique_idx ON public.listings(source_inventory_id)
  WHERE source_inventory_id IS NOT NULL AND status = 'active';

-- ── 3. comic_catalog_cache ──────────────────────────────────────────────────

CREATE TABLE public.comic_catalog_cache (
  id              integer PRIMARY KEY,  -- ComicVine's own issue id
  name            text NOT NULL,
  issue_number    text,
  cover_url       text,
  publisher       text,
  writer          text,
  artist          text,
  cover_date      date,
  raw_response    jsonb,
  cached_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comic_catalog_search_idx ON public.comic_catalog_cache
  USING gin (to_tsvector('english',
    name || ' ' ||
    coalesce(publisher, '') || ' ' ||
    coalesce(writer, '') || ' ' ||
    coalesce(issue_number, '')
  ));

-- Service-role only; clients never read directly.
ALTER TABLE public.comic_catalog_cache ENABLE ROW LEVEL SECURITY;

-- ── 4. refund_requests ──────────────────────────────────────────────────────

CREATE TABLE public.refund_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id),
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
  admin_notes     text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX refund_requests_order_id_idx ON public.refund_requests(order_id);
CREATE INDEX refund_requests_status_idx ON public.refund_requests(status);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY refund_requests_buyer_read ON public.refund_requests
  FOR SELECT USING (buyer_id = auth.uid());

-- ── 5. disputes ─────────────────────────────────────────────────────────────

CREATE TABLE public.disputes (
  id                          text PRIMARY KEY,  -- Stripe dispute id
  order_id                    uuid REFERENCES public.orders(id),
  stripe_payment_intent_id    text NOT NULL,
  amount_cents                integer NOT NULL CHECK (amount_cents > 0),
  reason                      text,
  status                      text,
  raw_event                   jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX disputes_order_id_idx ON public.disputes(order_id);
CREATE INDEX disputes_status_idx ON public.disputes(status);

-- Admin-only; service role inserts. No client-side reads.
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ── 6. vendor_payouts → seller_payouts rename ──────────────────────────────

ALTER TABLE public.vendor_payouts RENAME TO seller_payouts;
ALTER TABLE public.seller_payouts RENAME COLUMN vendor_id TO payee_user_id;

-- IMPORTANT: drop the old FK BEFORE the backfill UPDATE. The old constraint
-- (vendor_payouts_vendor_id_fkey) references vendors.id; rewriting the column
-- values to point at auth.users.id will violate it. Dropping first lets the
-- UPDATE proceed; we re-add a fresh FK to auth.users afterward.
ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS vendor_payouts_vendor_id_fkey;

-- Backfill: existing rows had payee_user_id = vendors.id. Map each to the
-- vendor's user_id so the column now points at auth.users.
UPDATE public.seller_payouts sp
SET payee_user_id = v.user_id
FROM public.vendors v
WHERE sp.payee_user_id = v.id;

-- Add new FK to auth.users.
ALTER TABLE public.seller_payouts
  ADD CONSTRAINT seller_payouts_payee_user_id_fkey
    FOREIGN KEY (payee_user_id) REFERENCES auth.users(id);

-- Rename indexes for consistency with new table name.
ALTER INDEX vendor_payouts_intent_id_uq RENAME TO seller_payouts_intent_id_uq;
ALTER INDEX vendor_payouts_vendor_id_idx RENAME TO seller_payouts_payee_user_id_idx;

-- Replace the RLS policy (vendor_payouts_owner_read pointed at vendors lookup).
DROP POLICY IF EXISTS vendor_payouts_owner_read ON public.seller_payouts;

CREATE POLICY seller_payouts_owner_read ON public.seller_payouts
  FOR SELECT USING (payee_user_id = auth.uid());
```

- [ ] **Step 2: Apply the migration to remote**

Run: `npx supabase db push`

Expected: `Applying migration 20260529000000_marketplace_v1_foundation.sql... Finished supabase db push.`

If the CLI prompts for confirmation, accept it. If you see "relation already exists" or "column already exists" — STOP and report BLOCKED with the exact error. Do NOT try to drop or modify schema manually.

- [ ] **Step 3: Verify schema landed**

Run this inline Node script (loads `.env`, queries Supabase REST):

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

// 1. users.stripe_connect_account_id + seller_status
const usersCols = await fetch(url + '/rest/v1/users?select=stripe_connect_account_id,seller_status&limit=1', { headers: h }).then(r => r.status);
console.log('users new columns query →', usersCols, '(expect 200)');

// 2. listings new columns
const listingsCols = await fetch(url + '/rest/v1/listings?select=source_inventory_id,comic_vine_id,comic_publisher,application_fee_pct&limit=1', { headers: h }).then(r => r.status);
console.log('listings new columns query →', listingsCols, '(expect 200)');

// 3. comic_catalog_cache exists
const cache = await fetch(url + '/rest/v1/comic_catalog_cache?select=id&limit=1', { headers: h }).then(r => r.status);
console.log('comic_catalog_cache query →', cache, '(expect 200)');

// 4. refund_requests exists
const refunds = await fetch(url + '/rest/v1/refund_requests?select=id&limit=1', { headers: h }).then(r => r.status);
console.log('refund_requests query →', refunds, '(expect 200)');

// 5. disputes exists
const disputes = await fetch(url + '/rest/v1/disputes?select=id&limit=1', { headers: h }).then(r => r.status);
console.log('disputes query →', disputes, '(expect 200)');

// 6. seller_payouts exists (renamed from vendor_payouts)
const sellerPayouts = await fetch(url + '/rest/v1/seller_payouts?select=id,payee_user_id&limit=1', { headers: h }).then(r => r.status);
console.log('seller_payouts query →', sellerPayouts, '(expect 200)');

// 7. vendor_payouts no longer exists (was renamed)
const vendorPayouts = await fetch(url + '/rest/v1/vendor_payouts?select=id&limit=1', { headers: h }).then(r => r.status);
console.log('vendor_payouts query →', vendorPayouts, '(expect 404 — table no longer exists)');
" 2>&1
```

Expected output:

```
users new columns query → 200 (expect 200)
listings new columns query → 200 (expect 200)
comic_catalog_cache query → 200 (expect 200)
refund_requests query → 200 (expect 200)
disputes query → 200 (expect 200)
seller_payouts query → 200 (expect 200)
vendor_payouts query → 404 (expect 404 — table no longer exists)
```

If anything is wrong, STOP and report BLOCKED with the actual output.

- [ ] **Step 4: Verify the backfill of seller_payouts.payee_user_id**

Any existing `vendor_payouts` rows should now have `payee_user_id` pointing at the vendor's `user_id` (not the vendor's `id`). Run:

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const rows = await fetch(url + '/rest/v1/seller_payouts?select=id,payee_user_id&limit=5', { headers: h }).then(r => r.json());
console.log('Sample seller_payouts rows after migration:');
for (const r of rows) {
  // For each row, check if the payee_user_id resolves to a real auth.users id.
  const userCheck = await fetch(url + '/rest/v1/users?id=eq.' + r.payee_user_id + '&select=id', { headers: h }).then(r => r.json());
  console.log('  ' + r.id + ' → payee=' + r.payee_user_id + ' (user row exists: ' + (userCheck.length > 0) + ')');
}
" 2>&1
```

Every payout row's `payee_user_id` should resolve to a `users` row. If any don't (orphan payouts), STOP and investigate before proceeding.

If there are zero existing seller_payouts rows (no vendor packs have been sold), the verification is trivially satisfied. Print `(no existing rows)` and proceed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260529000000_marketplace_v1_foundation.sql
git commit -m "feat(db): Marketplace v1 M1 — users seller columns, listings extensions, payouts rename"
```

---

## Task 2: Update open-pack-usd for renamed payouts table

The `open-pack-usd` edge function inserts into `vendor_payouts` after a successful vendor pack purchase. After Task 1's migration, the table is `seller_payouts` and the column is `payee_user_id`. The function's input body still has `vendor_id` (that's the vendor's row id, not the user's), so we look up the vendor's `user_id` and use that.

**Files:**
- Modify: `supabase/functions/open-pack-usd/index.ts`

- [ ] **Step 1: Read the current open-pack-usd function**

Run: `wc -l supabase/functions/open-pack-usd/index.ts`

Expected: ~260 lines. Read the file to identify (a) the idempotency-check block at line ~66 querying `vendor_payouts`, (b) the insert block at line ~175 inserting into `vendor_payouts`.

- [ ] **Step 2: Update the idempotency check**

Find this block (around lines 66–73):

```typescript
    // Idempotency: was this intent already processed?
    const { data: existing } = await serviceClient
      .from('vendor_payouts')
      .select('id, pack_purchase_id')
      .eq('stripe_payment_intent_id', body.payment_intent_id)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, idempotent: true, purchase_id: existing.pack_purchase_id }, 200)
    }
```

Change `vendor_payouts` to `seller_payouts`:

```typescript
    // Idempotency: was this intent already processed?
    const { data: existing } = await serviceClient
      .from('seller_payouts')
      .select('id, pack_purchase_id')
      .eq('stripe_payment_intent_id', body.payment_intent_id)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, idempotent: true, purchase_id: existing.pack_purchase_id }, 200)
    }
```

- [ ] **Step 3: Update the insert block — look up vendor's user_id**

Find this block (around lines 173–185):

```typescript
    // Insert vendor_payouts row
    const vendorAmountCents = body.gross_amount_cents - body.application_fee_amount_cents
    await serviceClient.from('vendor_payouts').insert({
      vendor_id: body.vendor_id,
      pack_purchase_id: purchase.id,
      pack_id: body.pack_id,
      gross_amount_cents: body.gross_amount_cents,
      vendor_amount_cents: vendorAmountCents,
      inkstash_amount_cents: body.application_fee_amount_cents,
      stripe_payment_intent_id: body.payment_intent_id,
    })
```

Replace with: look up the vendor's user_id, then insert into `seller_payouts` with `payee_user_id`:

```typescript
    // Look up the vendor's user_id — seller_payouts.payee_user_id points at auth.users.
    const { data: vendorRow } = await serviceClient
      .from('vendors')
      .select('user_id')
      .eq('id', body.vendor_id)
      .single()

    if (!vendorRow) {
      console.error('[open-pack-usd] vendor not found for payout insert:', body.vendor_id)
      return json({ error: 'Vendor not found' }, 500)
    }

    // Insert seller_payouts row (was vendor_payouts; renamed in M1 migration).
    const vendorAmountCents = body.gross_amount_cents - body.application_fee_amount_cents
    await serviceClient.from('seller_payouts').insert({
      payee_user_id: vendorRow.user_id,
      pack_purchase_id: purchase.id,
      pack_id: body.pack_id,
      gross_amount_cents: body.gross_amount_cents,
      vendor_amount_cents: vendorAmountCents,
      inkstash_amount_cents: body.application_fee_amount_cents,
      stripe_payment_intent_id: body.payment_intent_id,
    })
```

- [ ] **Step 4: Deploy the function**

Run: `npx supabase functions deploy open-pack-usd --no-verify-jwt`

Expected: deploys successfully. (If the bundler returns a transient `exit 1`, retry once — it's a known intermittent.)

- [ ] **Step 5: Spot-check that there are no remaining `vendor_payouts` references in the file**

Run: `grep -n "vendor_payouts" supabase/functions/open-pack-usd/index.ts`

Expected: ZERO output (the function should no longer reference the old table name anywhere, including comments at the top of the file).

If the grep returns any matches besides comments, update those too. The comments at the top of the file (lines ~13-16) likely reference `vendor_payouts row` — update to `seller_payouts row` for clarity.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/open-pack-usd/index.ts
git commit -m "fix(functions): point open-pack-usd at renamed seller_payouts table"
```

---

## Task 3: Update stripe-webhook idempotency check + extend account.updated for sellers

Two changes in one file. (1) The idempotency check inside `openVendorPack` still queries `vendor_payouts`. (2) The `handleAccountUpdated` handler currently only flips `vendors.status`; it needs to also handle non-vendor sellers (regular users with `stripe_connect_account_id`).

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Find the existing idempotency check in openVendorPack**

Run: `grep -n "vendor_payouts" supabase/functions/stripe-webhook/index.ts`

Expected: one match around line 253. It's inside `openVendorPack`:

```typescript
  const { data: existing } = await serviceClient
    .from('vendor_payouts')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle()
```

- [ ] **Step 2: Update the table reference**

Change `vendor_payouts` to `seller_payouts`:

```typescript
  const { data: existing } = await serviceClient
    .from('seller_payouts')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle()
```

- [ ] **Step 3: Find the handleAccountUpdated function**

Run: `grep -n "handleAccountUpdated\|function handleAccountUpdated" supabase/functions/stripe-webhook/index.ts`

The function is at the bottom of the file (~line 290 onwards). Read it to understand current shape — it looks up a vendor by `stripe_connect_account_id`, exits if not found.

- [ ] **Step 4: Extend handleAccountUpdated to also flip users.seller_status**

Find the current early-return on `if (!vendor)`. Current shape (around line 305-320):

```typescript
  const { data: vendor, error: lookupError } = await serviceClient
    .from('vendors')
    .select('id, status')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()

  if (lookupError) {
    console.error('[stripe-webhook] vendor lookup failed:', lookupError)
    return new Response('DB error', { status: 500 })
  }

  if (!vendor) {
    console.warn('[stripe-webhook] account.updated for unknown Connect account', account.id)
    return new Response('ok', { status: 200 })
  }
```

Replace the `if (!vendor)` block with a fallback to users-table lookup:

```typescript
  const { data: vendor, error: lookupError } = await serviceClient
    .from('vendors')
    .select('id, status')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()

  if (lookupError) {
    console.error('[stripe-webhook] vendor lookup failed:', lookupError)
    return new Response('DB error', { status: 500 })
  }

  if (!vendor) {
    // Not a vendor — check if it's a regular seller (non-vendor user).
    const { data: sellerUser, error: userLookupError } = await serviceClient
      .from('users')
      .select('id, seller_status')
      .eq('stripe_connect_account_id', account.id)
      .maybeSingle()

    if (userLookupError) {
      console.error('[stripe-webhook] seller user lookup failed:', userLookupError)
      return new Response('DB error', { status: 500 })
    }

    if (!sellerUser) {
      console.warn('[stripe-webhook] account.updated for unknown Connect account', account.id)
      return new Response('ok', { status: 200 })
    }

    if (sellerUser.seller_status === 'active') {
      return new Response('ok', { status: 200 })
    }

    const { error: sellerUpdateError } = await serviceClient
      .from('users')
      .update({ seller_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sellerUser.id)

    if (sellerUpdateError) {
      console.error('[stripe-webhook] seller activate failed:', sellerUpdateError)
      return new Response('DB error', { status: 500 })
    }

    console.log('[stripe-webhook] seller activated:', sellerUser.id)
    return new Response('ok', { status: 200 })
  }
```

The rest of `handleAccountUpdated` (the existing vendor activation flow) stays exactly the same.

- [ ] **Step 5: Deploy the webhook**

Run: `npx supabase functions deploy stripe-webhook --no-verify-jwt`

Expected: deploys successfully.

- [ ] **Step 6: Spot-check no remaining vendor_payouts references**

Run: `grep -n "vendor_payouts" supabase/functions/stripe-webhook/index.ts`

Expected: ZERO output. Update any remaining references (likely comments).

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(webhook): seller_payouts table reference + extend account.updated for non-vendor sellers"
```

---

## Task 4: initiate-seller-connect edge function

Creates a Stripe Connect Express account for a non-vendor user the first time they want to sell. Mirrors the `scripts/create-vendor.mjs` flow but as an authenticated edge function so users can self-serve from the app.

**Files:**
- Create: `supabase/functions/initiate-seller-connect/index.ts`

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/initiate-seller-connect/index.ts
//
// Authenticated. Provisions a Stripe Connect Express account for the
// authenticated user, stores stripe_connect_account_id + seller_status='pending'
// on the users row, generates a Stripe onboarding link, returns the URL.
//
// The webhook (account.updated) flips seller_status to 'active' once the user
// completes Stripe's hosted onboarding and Stripe enables charges + payouts.
//
// Idempotent: if the user already has a stripe_connect_account_id, we
// generate a fresh onboarding link (Stripe links expire after ~1 hour) and
// return it without creating a duplicate account.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!

    if (!stripeSecret) return json({ error: 'STRIPE_SECRET_KEY not configured' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Load the user's current state.
    const { data: userRow, error: userLookupError } = await serviceClient
      .from('users')
      .select('id, email, username, stripe_connect_account_id, seller_status')
      .eq('id', user.id)
      .single()

    if (userLookupError || !userRow) {
      console.error('[initiate-seller-connect] user lookup failed:', userLookupError)
      return json({ error: 'User not found' }, 500)
    }

    let connectAccountId = userRow.stripe_connect_account_id

    if (!connectAccountId) {
      // First-time: create the Stripe Connect Express account.
      const account = await stripe.accounts.create({
        type: 'express',
        email: userRow.email ?? user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          inkstash_user_id: user.id,
          username: userRow.username ?? '',
        },
      })

      connectAccountId = account.id

      // Persist the account id + flip seller_status to 'pending'.
      const { error: updateError } = await serviceClient
        .from('users')
        .update({
          stripe_connect_account_id: connectAccountId,
          seller_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('[initiate-seller-connect] user update failed:', updateError)
        return json({ error: 'Could not persist Connect account id' }, 500)
      }

      console.log('[initiate-seller-connect] created Connect account', connectAccountId, 'for user', user.id)
    } else {
      console.log('[initiate-seller-connect] reusing existing Connect account', connectAccountId, 'for user', user.id)
    }

    // Generate a fresh onboarding link. These expire after ~1 hour.
    const link = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: 'https://inkstash.com/seller-onboarding/refresh',
      return_url: 'https://inkstash.com/seller-onboarding/complete',
      type: 'account_onboarding',
    })

    return json({
      url: link.url,
      stripe_connect_account_id: connectAccountId,
    }, 200)
  } catch (err) {
    console.error('[initiate-seller-connect] error:', err)
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

Run: `npx supabase functions deploy initiate-seller-connect`

Expected: deploys successfully. This function uses JWT auth (not `--no-verify-jwt`) because it must verify the calling user's identity.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/initiate-seller-connect/index.ts
git commit -m "feat(functions): initiate-seller-connect provisions Stripe Connect Express for sellers"
```

---

## Task 5: Add seller_status + stripe_connect_account_id to the User type

The frontend needs to know the user's seller status to gate listing UI in M2. Update the User type so callers can read `user.seller_status` and `user.stripe_connect_account_id`.

**Files:**
- Modify: the file that declares the User interface used by `useAuth` / `AuthManager`.

- [ ] **Step 1: Find where the User type lives**

Run: `grep -rn "interface User\b\|type User =" src/api/auth/ src/hooks/ src/api/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -10`

Likely candidates: `src/api/auth/authManager.ts`, `src/api/auth/types.ts`, or `src/hooks/useAuth.ts`. The User interface is the one that already has fields like `id`, `email`, `username`, `avatar_url`, `seller_verified`, `onboarding_completed`.

- [ ] **Step 2: Add the new fields**

In the User interface, add the two new optional fields. Example (adjust to match the existing style of the file):

```typescript
export interface User {
  // ... existing fields ...
  seller_verified?: boolean;
  onboarding_completed?: boolean;
  // NEW (M1):
  stripe_connect_account_id?: string | null;
  seller_status?: 'inactive' | 'pending' | 'active' | 'paused';
}
```

If the file currently SELECTs specific columns when loading the user (e.g., a `.from('users').select('id, email, username, ...')` somewhere in authManager), add the two new columns to that SELECT so they're populated on login.

- [ ] **Step 3: Find the users SELECT in authManager (or equivalent loader)**

Run: `grep -rn "from('users')" src/api/auth/ src/hooks/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5`

Find the SELECT statement that loads the User. It likely looks like:

```typescript
const { data } = await supabase
  .from('users')
  .select('id, email, username, avatar_url, seller_verified, onboarding_completed, ...')
  .eq('id', authUser.id)
  .single()
```

Add `stripe_connect_account_id` and `seller_status` to the column list:

```typescript
.select('id, email, username, avatar_url, seller_verified, onboarding_completed, stripe_connect_account_id, seller_status, ...')
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output.

If you see errors about new fields being undefined on User in places that don't expect them — those callers may need a fallback. The new fields are optional (`?:`) so they shouldn't break anything that doesn't reference them. If a caller does `user.seller_status === 'active'` and gets `undefined`, that's still a falsy comparison — fine.

- [ ] **Step 5: Commit**

```bash
git add src/api/auth/authManager.ts  # adjust path to the file you actually modified
git commit -m "feat(types): add stripe_connect_account_id + seller_status to User type"
```

(If you modified multiple files in this task, add them all to the same commit.)

---

## Task 6: Create sellersAPI client

Frontend wrapper for `initiate-seller-connect`. Used by M2's `<ConnectOnboardingModal>` and `<SellerConnectGate>` components.

**Files:**
- Create: `src/api/sellers.ts`

- [ ] **Step 1: Write the API client**

```typescript
// src/api/sellers.ts
import { supabase } from './supabase/supabaseClient';

export type SellerStatus = 'inactive' | 'pending' | 'active' | 'paused';

export interface InitiateConnectOnboardingResult {
  url: string;
  stripe_connect_account_id: string;
}

export const sellersAPI = {
  /**
   * Triggers Stripe Connect Express onboarding for the authenticated user.
   * If they don't have a Connect account yet, the edge function creates one
   * and flips seller_status to 'pending'. Returns the Stripe-hosted
   * onboarding URL the user should be redirected to (in the same tab).
   * The webhook flips seller_status to 'active' once Stripe confirms
   * charges_enabled && payouts_enabled.
   */
  async initiateConnectOnboarding(): Promise<InitiateConnectOnboardingResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You must be logged in.');

    const { data, error } = await supabase.functions.invoke('initiate-seller-connect', {
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    if (!data?.url) throw new Error('No onboarding URL returned');

    return data as InitiateConnectOnboardingResult;
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: zero output.

- [ ] **Step 3: Commit**

```bash
git add src/api/sellers.ts
git commit -m "feat(api): sellersAPI client for Stripe Connect onboarding"
```

---

## Task 7: End-to-end smoke test (manual)

This is a verification-only task that proves the M1 foundation works end-to-end before M2 starts depending on it.

**Files:** none (manual test).

You'll need:
- A test user account that is NOT a vendor (so we exercise the new users-table path, not the vendors-table path).
- Access to your Stripe Test mode dashboard.

- [ ] **Step 1: Confirm prerequisites**

Run this query to find a candidate test user that has no `stripe_connect_account_id` yet:

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };

const candidates = await fetch(url + '/rest/v1/users?stripe_connect_account_id=is.null&select=id,username,email,seller_status&limit=5', { headers: h }).then(r => r.json());
console.log('Candidate users with no Connect account yet:');
for (const u of candidates) console.log('  ' + u.username + ' / ' + u.email + ' (seller_status=' + u.seller_status + ')');
" 2>&1
```

Pick one. Note their email.

- [ ] **Step 2: Trigger initiate-seller-connect for that user**

You'll need a valid JWT for that user. Easiest: open the dev app in your browser, log in as that user, open DevTools → Application → Local Storage → find the Supabase auth entry with the `access_token`. Copy the JWT.

Then run:

```bash
JWT="<paste user jwt here>"
curl -X POST "https://<your-project-ref>.supabase.co/functions/v1/initiate-seller-connect" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1
```

(Get your project ref from `VITE_SUPABASE_URL` in `.env` — the subdomain is the ref.)

Expected response:

```json
{
  "url": "https://connect.stripe.com/setup/e/acct_.../...",
  "stripe_connect_account_id": "acct_..."
}
```

- [ ] **Step 3: Verify the user row was updated**

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };
const u = await fetch(url + '/rest/v1/users?email=eq.<test-user-email>&select=id,seller_status,stripe_connect_account_id', { headers: h }).then(r => r.json());
console.log(u);
" 2>&1
```

Expected: `seller_status='pending'`, `stripe_connect_account_id='acct_...'`.

- [ ] **Step 4: Complete Stripe Connect onboarding via the returned URL**

Open the URL from Step 2 in an incognito browser window. Walk through Stripe's hosted onboarding (use test values per the C9 smoke test pattern: DOB 01/01/1990, SSN 000-00-0000, bank routing 110000000 account 000123456789, etc.).

Submit through to "All set."

- [ ] **Step 5: Verify webhook fired and flipped seller_status**

Wait ~30 seconds for Stripe to send `account.updated`. Then re-run the query from Step 3:

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };
const u = await fetch(url + '/rest/v1/users?email=eq.<test-user-email>&select=id,seller_status,stripe_connect_account_id', { headers: h }).then(r => r.json());
console.log(u);
" 2>&1
```

Expected: `seller_status='active'`.

If it's still `'pending'`: check Stripe Dashboard → Developers → Webhooks → find recent `account.updated` events. If they're listed but not delivered to your endpoint, the webhook URL or event subscription is broken (check C9's troubleshooting steps). If they were delivered with 2xx, the issue is in `handleAccountUpdated`'s logic — re-read the code from Task 3.

- [ ] **Step 6: Verify a vendor pack purchase still works (regression)**

Buy any vendor pack using a test card (or have someone else do it). Confirm:
- Webhook logs show `[stripe-webhook] vendor pack opened for intent pi_...`
- A new row appears in `seller_payouts` (not `vendor_payouts` — that table is gone)
- The new row's `payee_user_id` matches the vendor's user_id

```bash
node --input-type=module -e "
import 'dotenv/config';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const h = { apikey: key, Authorization: 'Bearer ' + key };
const recent = await fetch(url + '/rest/v1/seller_payouts?order=created_at.desc&limit=1&select=id,payee_user_id,gross_amount_cents,stripe_payment_intent_id', { headers: h }).then(r => r.json());
console.log('Most recent seller_payouts row:', recent);
" 2>&1
```

If this passes, M1 is done and M2 can safely build on it.

- [ ] **Step 7: Empty commit as a marker**

```bash
git commit --allow-empty -m "test(marketplace-m1): foundation smoke test passed end-to-end"
```

This commit is a record that the manual verification was performed and passed. It also gives a clean point to revert to if M2 work later destabilizes M1.

---

# M1 Acceptance Verification

Phase M1 is complete when:

- [ ] Acceptance #1: Migration applied; `users.stripe_connect_account_id` + `users.seller_status` columns exist with correct constraints (Task 1 Step 3).
- [ ] Acceptance #2: Migration applied; `listings` has the 7 new columns; `comic_catalog_cache`, `refund_requests`, `disputes` tables exist (Task 1 Step 3).
- [ ] Acceptance #3: `vendor_payouts` table is gone; `seller_payouts` exists with `payee_user_id` column; backfill correctly mapped existing rows to their `user_id` values (Task 1 Steps 3 + 4).
- [ ] Acceptance #4: `open-pack-usd` redeploys and inserts into `seller_payouts` correctly; vendor pack regression test (Task 7 Step 6) shows the new row.
- [ ] Acceptance #5: `stripe-webhook` redeploys; idempotency check uses `seller_payouts`; `handleAccountUpdated` correctly handles both vendors AND non-vendor sellers.
- [ ] Acceptance #6: `initiate-seller-connect` edge function returns a Stripe onboarding URL when called by an authenticated user (Task 7 Step 2).
- [ ] Acceptance #7: After completing Stripe Connect onboarding via the returned URL, the webhook flips `users.seller_status` to `'active'` (Task 7 Step 5).
- [ ] Acceptance #8: `sellersAPI.initiateConnectOnboarding()` is exported and typechecks cleanly.
- [ ] Acceptance #9: Vendor pack purchase still works post-rename (no regression).

M1 is done when all nine check.
