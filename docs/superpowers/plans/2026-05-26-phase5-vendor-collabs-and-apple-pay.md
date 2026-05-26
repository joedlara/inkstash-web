# Phase 5 — Vendor Collabs & Apple Pay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship vendor-collab USD packs + Apple Pay/Google Pay everywhere InkStash takes USD, on top of the existing Ruby-based house pack economy.

**Architecture:** Sequenced as Apple Pay first (unblocks the vendor pack checkout because it adds the centralized `StripePaymentElement` wrapper), then vendor infrastructure + Stripe Connect onboarding, then the full vendor-pack product flow (PackDetail variant, sum-to-price validator, USD pack open, payouts). One enum (`pack_origin`) is added to the existing `packs` table; house packs are untouched in code paths gated by `origin = 'vendor'`.

**Tech Stack:** React 19 + TypeScript + Vite + MUI v7. Supabase (Postgres + RLS + Edge Functions + Auth). Stripe (`@stripe/stripe-js@^8.4.0`, `@stripe/react-stripe-js@^5.3.0`, server `stripe@^18.4.0` in node scripts, `https://esm.sh/stripe@14.21.0` in Deno edge functions). Stripe Connect Express. ShipEngine (already integrated for shipping labels).

**Spec:** `docs/superpowers/specs/2026-05-26-phase5-vendor-collabs-and-apple-pay-design.md`

---

## Testing convention for this plan

There is no automated test framework in this repo today (no Vitest, no Jest, no Playwright). Adding one is out of scope for Phase 5. This plan uses three verification strategies in place of unit tests:

1. **Typecheck after every code change:** `npx tsc --noEmit` — must produce no output. Treat any TS error as a failed test step.
2. **SQL verification after migrations:** explicit `psql`-style queries against the local Supabase Postgres (`supabase db remote commit` writes to remote; local verification uses `supabase db reset` + queries via `supabase db query` or the Supabase Studio SQL editor).
3. **End-to-end manual verification in Stripe test mode** for payment flows, with the exact card numbers and expected outcomes written into each task. Apple Pay confirmation requires a physical iOS/macOS device — flagged in the relevant tasks.

When a step says "Run it to make sure it fails" for a UI change, that means: load the route in the browser, observe the issue, then implement the fix. Treat that as the test.

---

## File Map

### Migrations (new)

| File | Purpose |
|---|---|
| `supabase/migrations/20260526000000_create_vendors_and_pack_origins.sql` | All Phase 5 schema in one migration: `pack_origin` enum, `cover_treatment` enum, `vendors` table, `pack_revenue_splits` table, `vendor_payouts` table, columns added to `packs` and `pack_items`, RLS policies, `validate_vendor_pack` SQL function. |

### Edge Functions

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/create-payment-intent/index.ts` | Modify | Add `payment_type: 'ruby_bundle' \| 'vendor_pack'` switch. Vendor packs add `transfer_data.destination`, `application_fee_amount`, `automatic_tax: { enabled: true }`. Backward-compatible default = `ruby_bundle`. |
| `supabase/functions/stripe-webhook/index.ts` | Modify | Add branches for `payment_type === 'vendor_pack'` (invoke open-pack-usd) and event type `account.updated` (flip vendor status). |
| `supabase/functions/open-pack-usd/index.ts` | Create | Vendor pack opening. Same draw logic as `open-pack-rubies` but no Ruby debit; inserts `vendor_payouts` row. Called by webhook, not client. |

### Frontend

| File | Action | Purpose |
|---|---|---|
| `src/components/checkout/StripePaymentElement.tsx` | Create | Shared Payment Element wrapper. Loads PaymentIntent, mounts `<PaymentElement>`, handles confirm + redirect. Props determine ruby_bundle vs vendor_pack. |
| `src/components/packs/RubyBundleModal.tsx` | Modify | Remove Hold-to-Pay button and `holdProgress` handler logic. Mount `<StripePaymentElement paymentType="ruby_bundle">` in its place. Apple Pay auto-renders. |
| `src/pages/PackDetail.tsx` | Modify | Branch on `pack.origin`. For `vendor`: render `<VendorPackHeader>`, `<CuratorNote>`, `<PackContentsGrid>`, `<VendorPackGuaranteeRow>`, USD checkout entry. For `house` and `publisher`: existing rendering unchanged. |
| `src/components/packs/VendorPackHeader.tsx` | Create | Vendor avatar + handle + "Publisher exclusive" badge. Click → `/v/:handle` vendor profile stub. |
| `src/components/packs/CuratorNote.tsx` | Create | Renders `packs.curator_note` with a quote-style treatment. |
| `src/components/packs/PackContentsGrid.tsx` | Create | "What's in the pack" grid: each `(comic, cover_treatment)` tile shows art, artist, treatment chip, draw probability. |
| `src/components/packs/VendorPackGuaranteeRow.tsx` | Create | One-line "Guaranteed: 3 books, $150. Chase: 4% signed + 1% remarked." |
| `src/components/packs/CardDispositionRow.tsx` | Modify | Hide Sell-back button when source `pack.origin === 'vendor'` (passed via prop). |
| `src/pages/CheckoutVendorPack.tsx` | Create | Vendor pack checkout page. Renders `<StripePaymentElement paymentType="vendor_pack">`. On success, redirects to `/packs/:packId?reveal=:purchaseId`. |
| `src/pages/Packs.tsx` | Modify | Add origin filter pills (All / House / Vendor). Vendor pack tiles show vendor handle. |
| `src/pages/VendorProfile.tsx` | Create | Stub vendor profile page at `/v/:handle`. Shows vendor name, avatar, bio, list of their active packs. |

### API layer

| File | Action | Purpose |
|---|---|---|
| `src/api/packs.ts` | Modify | Add `origin`, `vendor_id`, `value_lock`, `curator_note`, `is_sealed_collectible` to `Pack`. Add `cover_treatment`, `declared_value` to `PackItem`. Add `vendor` nested type. Add `packsAPI.getByHandle()`. |
| `src/api/vendors.ts` | Create | Vendor reads (`getByHandle`, `listActive`, `listPacksByVendor`). Admin writes live in scripts only. |

### Admin scripts (Node, run locally)

| File | Action | Purpose |
|---|---|---|
| `scripts/create-vendor.mjs` | Create | Insert `vendors` row + create Stripe Connect Express account + generate onboarding link + print to stdout. |
| `scripts/validate-vendor-pack.mjs` | Create | Call `validate_vendor_pack` SQL function for a pack id, print pass/fail with reason, do not modify state. |
| `scripts/create-vendor-pack.mjs` | Create | Insert pack + pack_items + pack_revenue_splits row + activate (runs validator, refuses to activate on fail). |

### Routes

| Route | File | Phase |
|---|---|---|
| `/packs/:packId` | `src/pages/PackDetail.tsx` | Existing — modified |
| `/checkout/vendor-pack/:packId` | `src/pages/CheckoutVendorPack.tsx` | New |
| `/v/:handle` | `src/pages/VendorProfile.tsx` | New |

### Files explicitly NOT modified

- `supabase/functions/open-pack-rubies/index.ts` — house pack opening, unchanged.
- `supabase/functions/sell-back-item/index.ts` — sell-back, unchanged (vendor packs skip this UI).
- `supabase/functions/charge-saved-card/index.ts` — saved-card flow used elsewhere, leave alone.
- `scripts/recalc-pack-item-values.mjs` — economy solver, runs only on house packs, unchanged.

---

# SECTION A — APPLE PAY EVERYWHERE

Goal: Ship Apple Pay + Google Pay to the existing Ruby bundle purchase, via a reusable `StripePaymentElement` wrapper that vendor pack checkout will reuse in Section C. Hold-to-Pay (the press-and-hold gesture on the Ruby bundle modal) is removed. Hold-to-Open on house pack PackDetail is untouched.

---

## Task A1: Document Apple Pay domain verification setup

This is an operational task with no code — but it's a hard blocker for Apple Pay rendering in production, so it gets a task to ensure it isn't forgotten.

**Files:**
- Create: `docs/operations/apple-pay-domain-verification.md`

- [ ] **Step 1: Write the operations doc**

Create the file with this exact content:

```markdown
# Apple Pay Domain Verification

Apple Pay buttons silently fail to render unless the domain is verified with Apple via Stripe. This must be done once per domain (production, every preview/staging domain).

## Steps

1. Log into the Stripe Dashboard → Settings → Payment methods → Apple Pay.
2. Click "Add a new domain".
3. Enter the domain (e.g. `inkstash.app`, `staging.inkstash.app`).
4. Stripe gives you a verification file. Download it.
5. Host the file at `https://<domain>/.well-known/apple-developer-merchantid-domain-association` — exact path, no extension.
6. Click "Verify" in the Stripe Dashboard.
7. Test by loading the Ruby bundle modal on Safari (iOS or macOS) with at least one card in Apple Wallet. Apple Pay button must render.

## When this is required

- Before any Phase 5 deploy reaches production.
- Whenever a new staging/preview domain is provisioned and we want Apple Pay testable there.

## CLI alternative (Stripe CLI)

```bash
stripe apple_pay domains create --domain-name inkstash.app
```

Hosting the verification file is still required — the CLI command just creates the Stripe record.
```

- [ ] **Step 2: Commit**

```bash
git add docs/operations/apple-pay-domain-verification.md
git commit -m "docs(ops): add Apple Pay domain verification runbook"
```

---

## Task A2: Create the StripePaymentElement wrapper component

**Files:**
- Create: `src/components/checkout/StripePaymentElement.tsx`

- [ ] **Step 1: Confirm Stripe React deps are present**

Run: `node -e "const p=require('./package.json'); console.log(p.dependencies['@stripe/react-stripe-js'], p.dependencies['@stripe/stripe-js'])"`

Expected: `^5.3.0 ^8.4.0` (or higher). If missing, install:

```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

- [ ] **Step 2: Create the component file**

```tsx
// src/components/checkout/StripePaymentElement.tsx
//
// Shared Stripe Payment Element wrapper. Mounts the Payment Element
// (which auto-shows Apple Pay, Google Pay, Link, and card based on the
// device + payment method types Stripe returns for the PaymentIntent).
//
// Two payment types in Phase 5:
//   - ruby_bundle  — buys Rubies, no Connect routing
//   - vendor_pack  — buys a single vendor pack open, routes 90% to the
//                    vendor's Connect account via destination charge
//
// The component calls the unified create-payment-intent edge function,
// receives the client_secret, and renders <PaymentElement>. On confirm,
// Stripe handles the redirect; the webhook does the post-payment work.

import { useEffect, useState } from 'react';
import { loadStripe, type Stripe as StripeJS } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import { supabase } from '../../api/supabase/supabaseClient';

const stripePromise: Promise<StripeJS | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);

export type PaymentType = 'ruby_bundle' | 'vendor_pack';

export interface StripePaymentElementProps {
  /** What kind of purchase this is — drives the edge function branch. */
  paymentType: PaymentType;
  /** Bundle id for ruby_bundle, pack id for vendor_pack. */
  targetId: string;
  /** Display label for the confirm button, e.g. "Pay $14.99". */
  buttonLabel: string;
  /** URL Stripe redirects to after payment completes. The webhook
   *  does the real work; this page just shows a confirmation. */
  returnUrl: string;
  onError?: (err: Error) => void;
}

export default function StripePaymentElement(props: StripePaymentElementProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('You must be logged in.');

        const { data, error } = await supabase.functions.invoke(
          'create-payment-intent',
          {
            body: {
              payment_type: props.paymentType,
              target_id: props.targetId,
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error('No client secret returned');
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to start checkout';
        if (!cancelled) setInitError(msg);
        props.onError?.(err instanceof Error ? err : new Error(msg));
      }
    })();
    return () => { cancelled = true; };
  }, [props.paymentType, props.targetId]);

  if (initError) {
    return <Alert severity="error" sx={{ mt: 2 }}>{initError}</Alert>;
  }

  if (!clientSecret) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <PaymentForm buttonLabel={props.buttonLabel} returnUrl={props.returnUrl} />
    </Elements>
  );
}

function PaymentForm({
  buttonLabel,
  returnUrl,
}: {
  buttonLabel: string;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    // confirmPayment only returns here on error; success triggers
    // the return_url redirect and this component unmounts.
    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <PaymentElement />
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={!stripe || submitting}
        sx={{ mt: 2, py: 1.4, fontWeight: 700 }}
      >
        {submitting ? <CircularProgress size={20} color="inherit" /> : buttonLabel}
      </Button>
    </Box>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: no output (clean typecheck).

If you see "Cannot find module '../../api/supabase/supabaseClient'" — confirm the path. Existing usage in `src/api/packs.ts` shows `from './supabase/supabaseClient'` — `StripePaymentElement.tsx` is two levels deep so `../../api/supabase/supabaseClient` is correct. If wrong in your tree, fix the import path before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/components/checkout/StripePaymentElement.tsx
git commit -m "feat(checkout): shared StripePaymentElement wrapper with Apple Pay + Google Pay"
```

---

## Task A3: Generalize create-payment-intent edge function

Current state: `supabase/functions/create-payment-intent/index.ts` takes `{ bundle_id }` and creates a PaymentIntent specifically for Ruby bundles. We need it to take `{ payment_type, target_id }` and branch internally. Backward compat: if the request body has `bundle_id` (old shape), treat it as `{ payment_type: 'ruby_bundle', target_id: bundle_id }`.

**Files:**
- Modify: `supabase/functions/create-payment-intent/index.ts`

- [ ] **Step 1: Replace the entire file with the generalized version**

```typescript
// supabase/functions/create-payment-intent/index.ts
// Unified PaymentIntent creator. Branches on payment_type:
//   - ruby_bundle  → uses _shared/rubyBundles, no Connect routing
//   - vendor_pack  → looks up pack + vendor, sets transfer_data.destination
//                    and application_fee_amount for 90/10 split
//
// Returns { clientSecret, paymentIntentId, amount }. The webhook does
// the post-payment work (credit rubies / open vendor pack).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.168.0'
import { findBundle } from '../_shared/rubyBundles.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  payment_type?: 'ruby_bundle' | 'vendor_pack'
  target_id?: string
  bundle_id?: string // backward-compat for the old shape
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

    const body: RequestBody = await req.json()

    // Backward-compat: { bundle_id } → ruby_bundle
    const paymentType: 'ruby_bundle' | 'vendor_pack' =
      body.payment_type ?? (body.bundle_id ? 'ruby_bundle' : 'ruby_bundle')
    const targetId = body.target_id ?? body.bundle_id

    if (!targetId) return json({ error: 'target_id is required' }, 400)

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Find-or-create the Stripe Customer (used by both branches for
    // saved-card support and Stripe Tax address lookup).
    let stripeCustomerId: string | null = null
    const { data: userRow } = await serviceClient
      .from('users')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .maybeSingle()

    stripeCustomerId = userRow?.stripe_customer_id ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userRow?.email ?? user.email,
        metadata: { user_id: user.id },
      })
      stripeCustomerId = customer.id
      await serviceClient
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id)
    }

    if (paymentType === 'ruby_bundle') {
      return await createRubyBundleIntent({
        stripe, serviceClient, user, stripeCustomerId, bundleId: targetId,
      })
    } else if (paymentType === 'vendor_pack') {
      return await createVendorPackIntent({
        stripe, serviceClient, user, stripeCustomerId, packId: targetId,
      })
    } else {
      return json({ error: `Unknown payment_type: ${paymentType}` }, 400)
    }
  } catch (err) {
    console.error('[create-payment-intent] error:', err)
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})

async function createRubyBundleIntent({
  stripe, serviceClient, user, stripeCustomerId, bundleId,
}: {
  stripe: Stripe
  serviceClient: ReturnType<typeof createClient>
  user: { id: string; email?: string | null }
  stripeCustomerId: string
  bundleId: string
}): Promise<Response> {
  const bundle = findBundle(bundleId)
  if (!bundle) return json({ error: 'Unknown bundle' }, 404)

  const intent = await stripe.paymentIntents.create({
    amount: bundle.usdCents,
    currency: 'usd',
    customer: stripeCustomerId,
    setup_future_usage: 'on_session',
    automatic_payment_methods: { enabled: true },
    automatic_tax: { enabled: true },
    metadata: {
      payment_type: 'ruby_bundle',
      bundle_id: bundle.id,
      ruby_total: String(bundle.totalRubies),
      user_id: user.id,
    },
  })

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: bundle.usdCents,
  }, 200)
}

async function createVendorPackIntent({
  stripe, serviceClient, user, stripeCustomerId, packId,
}: {
  stripe: Stripe
  serviceClient: ReturnType<typeof createClient>
  user: { id: string; email?: string | null }
  stripeCustomerId: string
  packId: string
}): Promise<Response> {
  const { data: pack, error: packError } = await serviceClient
    .from('packs')
    .select(`
      id, name, price, status, origin, value_lock, vendor_id,
      vendor:vendors!packs_vendor_id_fkey(
        id, status, stripe_connect_account_id, commission_rate
      )
    `)
    .eq('id', packId)
    .single()

  if (packError || !pack) return json({ error: 'Pack not found' }, 404)
  if (pack.origin !== 'vendor') return json({ error: 'Not a vendor pack' }, 400)
  if (pack.status !== 'active') return json({ error: `Pack not available (${pack.status})` }, 400)

  const vendor = Array.isArray(pack.vendor) ? pack.vendor[0] : pack.vendor
  if (!vendor) return json({ error: 'Vendor not found' }, 500)
  if (vendor.status !== 'active') return json({ error: 'Vendor not active' }, 400)
  if (!vendor.stripe_connect_account_id) {
    return json({ error: 'Vendor Stripe Connect not configured' }, 500)
  }

  const amountCents = Math.round(Number(pack.price) * 100)
  const applicationFeeCents = Math.round(amountCents * Number(vendor.commission_rate))

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    automatic_tax: { enabled: true },
    transfer_data: { destination: vendor.stripe_connect_account_id },
    application_fee_amount: applicationFeeCents,
    metadata: {
      payment_type: 'vendor_pack',
      pack_id: pack.id,
      vendor_id: vendor.id,
      user_id: user.id,
    },
  })

  return json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: amountCents,
  }, 200)
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

- [ ] **Step 2: Deploy the function to Supabase**

Run: `npx supabase functions deploy create-payment-intent`

Expected: `Deployed Function create-payment-intent on project <your-project-ref>`.

- [ ] **Step 3: Smoke test the existing Ruby bundle path still works**

Run the existing app dev server (`npm run dev` or whatever the project uses — check `package.json` scripts), navigate to a Ruby bundle purchase trigger, observe the Stripe Payment Element loads with the bundle's amount in the confirm button. **At this point the modal still has Hold-to-Pay — that's expected; A4 replaces it.**

The legacy `{ bundle_id }` shape still works because of the backward-compat branch in the body parser.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create-payment-intent/index.ts
git commit -m "feat(checkout): generalize create-payment-intent for ruby_bundle + vendor_pack"
```

---

## Task A4: Migrate RubyBundleModal to use StripePaymentElement (remove Hold-to-Pay)

Replaces the current Hold-to-Pay button on the Ruby bundle purchase flow with the new shared Payment Element. Apple Pay + Google Pay will auto-render based on device.

**Files:**
- Modify: `src/components/packs/RubyBundleModal.tsx`

- [ ] **Step 1: Read the current implementation**

Run: `wc -l src/components/packs/RubyBundleModal.tsx`

Expected: 658 lines. Read it to identify (a) where the Hold-to-Pay button is rendered, (b) where its handler (`handleHoldComplete` or similar) lives, (c) where `holdProgress` state is declared.

- [ ] **Step 2: Replace the Hold-to-Pay block**

Find the section that renders the Hold-to-Pay button and the surrounding payment confirmation UI. Replace it with:

```tsx
import StripePaymentElement from '../checkout/StripePaymentElement';

// ... inside the modal body where the Hold-to-Pay button was rendered:
{selectedBundle && (
  <StripePaymentElement
    paymentType="ruby_bundle"
    targetId={selectedBundle.id}
    buttonLabel={`Pay $${(selectedBundle.usdCents / 100).toFixed(2)}`}
    returnUrl={`${window.location.origin}/packs?ruby_purchase=success`}
    onError={(err) => setError(err.message)}
  />
)}
```

Delete the now-unused state: `holdProgress`, `holdTimerRef`, any `useEffect` that ticks the hold progress, the `onPointerDown` / `onPointerUp` / `onPointerLeave` handlers on the old button.

Delete any local function in this file that called `create-payment-intent` directly — that work is now inside `StripePaymentElement`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean. If you see "is declared but never used" warnings on the deleted state variables, that means you missed removing a reference — search for the variable name in the file and remove or replace.

- [ ] **Step 4: Visual verification in browser**

Start the dev server. Open the Ruby bundle modal. Confirm:

- The Hold-to-Pay button is gone.
- The Stripe Payment Element loads (you see a card input form, or a Card tab + Apple Pay button on Safari, or Card + Google Pay on Chrome+Android).
- The confirm button reads "Pay $X.XX" matching the selected bundle's price.
- Pasting Stripe test card `4242 4242 4242 4242` (any future exp, any CVC, any ZIP) → click "Pay" → redirects to `/packs?ruby_purchase=success`.
- Open the browser network tab; confirm there is no call to `charge-saved-card` from this flow anymore.

- [ ] **Step 5: Commit**

```bash
git add src/components/packs/RubyBundleModal.tsx
git commit -m "feat(checkout): replace Hold-to-Pay with StripePaymentElement on Ruby bundle modal"
```

---

## Task A5: Verify webhook still credits Rubies on the new shape

The webhook already handles `payment_intent.succeeded` for Ruby bundles (it reads `metadata.bundle_id` and `metadata.ruby_total`). The generalized edge function in A3 still sets those exact metadata fields for ruby_bundle. This task verifies nothing broke.

**Files:** none (verification only).

- [ ] **Step 1: Trigger a real test-mode Ruby bundle purchase**

Using the dev environment from A4, buy the smallest bundle with test card `4242 4242 4242 4242`.

- [ ] **Step 2: Check the Supabase function logs**

Run: `npx supabase functions logs stripe-webhook --tail`

Expected lines (in this order):

```
[stripe-webhook] event received: payment_intent.succeeded evt_...
[stripe-webhook] credited <N> rubies to user <uuid>
[stripe-webhook] payment method saved for user <uuid>
```

- [ ] **Step 3: Verify Ruby balance updated in DB**

In Supabase Studio SQL editor:

```sql
SELECT balance FROM ruby_balances WHERE user_id = '<your test user uuid>';
SELECT kind, amount, created_at FROM ruby_transactions
WHERE user_id = '<your test user uuid>' ORDER BY created_at DESC LIMIT 3;
```

Expected: balance increased by the bundle's `totalRubies`. Most recent `ruby_transactions` row is `kind = 'bundle_purchase'` with the expected amount.

- [ ] **Step 4: No commit needed (verification only)**

If anything fails here, the bug is in the metadata mapping in `create-payment-intent` — go back and check that `metadata.bundle_id`, `metadata.ruby_total`, and `metadata.user_id` are all set as strings.

---

# SECTION B — VENDOR INFRASTRUCTURE

Goal: Schema for vendors, revenue splits, and payouts. Stripe Connect Express onboarding. Webhook branch for `account.updated`. Admin script to create a vendor and emit the onboarding link.

---

## Task B1: Create the schema migration

**Files:**
- Create: `supabase/migrations/20260526000000_create_vendors_and_pack_origins.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 5: vendor collabs + pack origins
-- ─────────────────────────────────────────────────────────────────────────────

-- ── enums ────────────────────────────────────────────────────────────────────

CREATE TYPE pack_origin AS ENUM ('house', 'vendor', 'publisher');
CREATE TYPE cover_treatment AS ENUM ('cardstock', 'foil', 'signed', 'remarked');
CREATE TYPE vendor_status AS ENUM ('pending', 'active', 'paused', 'offboarded');

-- ── vendors ──────────────────────────────────────────────────────────────────

CREATE TABLE public.vendors (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name                text NOT NULL,
  handle                      text UNIQUE NOT NULL,
  avatar_url                  text,
  bio                         text,
  is_publisher                boolean NOT NULL DEFAULT false,
  commission_rate             numeric(4,3) NOT NULL DEFAULT 0.300
                                CHECK (commission_rate BETWEEN 0 AND 1),
  stripe_connect_account_id   text UNIQUE,
  status                      vendor_status NOT NULL DEFAULT 'pending',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendors_user_id_idx ON public.vendors(user_id);
CREATE INDEX vendors_status_idx ON public.vendors(status);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Public reads: anyone (including anon) can see active vendors so the
-- vendor profile route works for logged-out browsing.
CREATE POLICY vendors_public_read_active ON public.vendors
  FOR SELECT USING (status = 'active');

-- A vendor can see their own row regardless of status.
CREATE POLICY vendors_owner_read ON public.vendors
  FOR SELECT USING (user_id = auth.uid());

-- No client-side writes. All writes go through service role
-- (admin scripts + edge functions).

-- ── packs additions ─────────────────────────────────────────────────────────

ALTER TABLE public.packs
  ADD COLUMN origin              pack_origin NOT NULL DEFAULT 'house',
  ADD COLUMN vendor_id           uuid REFERENCES public.vendors(id),
  ADD COLUMN value_lock          boolean NOT NULL DEFAULT false,
  ADD COLUMN curator_note        text,
  ADD COLUMN is_sealed_collectible boolean NOT NULL DEFAULT false;

-- A vendor pack must have a vendor_id; non-vendor packs must not.
ALTER TABLE public.packs
  ADD CONSTRAINT packs_vendor_id_origin_match
    CHECK (
      (origin = 'vendor' AND vendor_id IS NOT NULL)
      OR (origin != 'vendor' AND vendor_id IS NULL)
    );

CREATE INDEX packs_origin_idx ON public.packs(origin);
CREATE INDEX packs_vendor_id_idx ON public.packs(vendor_id);

-- ── pack_items additions ────────────────────────────────────────────────────

ALTER TABLE public.pack_items
  ADD COLUMN cover_treatment cover_treatment,
  ADD COLUMN declared_value  numeric(10,2);

-- ── pack_revenue_splits ─────────────────────────────────────────────────────

CREATE TABLE public.pack_revenue_splits (
  pack_id        uuid PRIMARY KEY REFERENCES public.packs(id) ON DELETE CASCADE,
  vendor_id      uuid NOT NULL REFERENCES public.vendors(id),
  vendor_cut     numeric(4,3) NOT NULL CHECK (vendor_cut BETWEEN 0 AND 1),
  inkstash_cut   numeric(4,3) NOT NULL CHECK (inkstash_cut BETWEEN 0 AND 1),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pack_revenue_splits_sum CHECK (vendor_cut + inkstash_cut = 1.000)
);

ALTER TABLE public.pack_revenue_splits ENABLE ROW LEVEL SECURITY;

-- No client read. Edge functions and admin scripts use service role.

-- ── vendor_payouts ──────────────────────────────────────────────────────────

CREATE TABLE public.vendor_payouts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                uuid NOT NULL REFERENCES public.vendors(id),
  pack_purchase_id         uuid NOT NULL REFERENCES public.pack_purchases(id),
  pack_id                  uuid NOT NULL REFERENCES public.packs(id),
  gross_amount_cents       integer NOT NULL CHECK (gross_amount_cents > 0),
  vendor_amount_cents      integer NOT NULL CHECK (vendor_amount_cents >= 0),
  inkstash_amount_cents    integer NOT NULL CHECK (inkstash_amount_cents >= 0),
  stripe_payment_intent_id text NOT NULL,
  stripe_transfer_id       text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_payouts_intent_id_uq
  ON public.vendor_payouts(stripe_payment_intent_id);
CREATE INDEX vendor_payouts_vendor_id_idx
  ON public.vendor_payouts(vendor_id);

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

-- A vendor can see their own payouts.
CREATE POLICY vendor_payouts_owner_read ON public.vendor_payouts
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

-- ── validator function ──────────────────────────────────────────────────────

-- Returns NULL if the pack passes validation; returns a human-readable
-- error string if it fails. Called by scripts/validate-vendor-pack.mjs
-- and by scripts/create-vendor-pack.mjs before flipping status to active.
--
-- Rules (only enforced for origin = 'vendor'):
--   1. value_lock must be true.
--   2. vendor must exist and be 'active'.
--   3. vendor must have stripe_connect_account_id.
--   4. Average declared_value of non-chase pack_items × pack.item_count
--      must equal pack.price (within 1¢ tolerance).
--   5. Every non-chase pack_item must have a cover_treatment set.
--   6. Every pack_item must have a declared_value set.

CREATE OR REPLACE FUNCTION public.validate_vendor_pack(p_pack_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pack            record;
  v_vendor          record;
  v_avg_non_chase   numeric;
  v_expected        numeric;
  v_missing_treatment int;
  v_missing_value     int;
BEGIN
  SELECT * INTO v_pack FROM public.packs WHERE id = p_pack_id;
  IF NOT FOUND THEN
    RETURN 'pack not found';
  END IF;

  IF v_pack.origin != 'vendor' THEN
    RETURN NULL;  -- non-vendor packs are not validated by this function
  END IF;

  IF NOT v_pack.value_lock THEN
    RETURN 'value_lock must be true for vendor packs';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_pack.vendor_id;
  IF NOT FOUND THEN
    RETURN 'vendor not found';
  END IF;

  IF v_vendor.status != 'active' THEN
    RETURN format('vendor status is %s (must be active)', v_vendor.status);
  END IF;

  IF v_vendor.stripe_connect_account_id IS NULL THEN
    RETURN 'vendor has not completed Stripe Connect onboarding';
  END IF;

  SELECT count(*) INTO v_missing_value
    FROM public.pack_items
    WHERE pack_id = p_pack_id AND declared_value IS NULL;
  IF v_missing_value > 0 THEN
    RETURN format('%s pack_items missing declared_value', v_missing_value);
  END IF;

  SELECT count(*) INTO v_missing_treatment
    FROM public.pack_items
    WHERE pack_id = p_pack_id
      AND coalesce(is_chase, false) = false
      AND cover_treatment IS NULL;
  IF v_missing_treatment > 0 THEN
    RETURN format('%s non-chase pack_items missing cover_treatment', v_missing_treatment);
  END IF;

  SELECT avg(declared_value) INTO v_avg_non_chase
    FROM public.pack_items
    WHERE pack_id = p_pack_id AND coalesce(is_chase, false) = false;

  IF v_avg_non_chase IS NULL THEN
    RETURN 'no non-chase pack_items found';
  END IF;

  v_expected := v_avg_non_chase * v_pack.item_count;

  IF abs(v_expected - v_pack.price) > 0.01 THEN
    RETURN format(
      'expected pull value $%s does not equal pack price $%s (avg non-chase = $%s × item_count = %s)',
      to_char(v_expected, 'FM999990.00'),
      to_char(v_pack.price, 'FM999990.00'),
      to_char(v_avg_non_chase, 'FM999990.00'),
      v_pack.item_count
    );
  END IF;

  RETURN NULL;  -- pass
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_vendor_pack(uuid) TO service_role;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db reset` (rebuilds local DB from all migrations including this new one).

Expected: completes without errors. If errors mention the migration ordering, check that the filename's timestamp (`20260526000000`) is after the most recent existing migration in `supabase/migrations/`.

- [ ] **Step 3: Verify schema is in place**

Run via Supabase Studio SQL editor (or `psql` against the local DB):

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vendors' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'packs'
  AND column_name IN ('origin','vendor_id','value_lock','curator_note','is_sealed_collectible');

SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pack_items'
  AND column_name IN ('cover_treatment','declared_value');

SELECT proname FROM pg_proc WHERE proname = 'validate_vendor_pack';
```

Expected: every column listed, plus the `validate_vendor_pack` proc.

- [ ] **Step 4: Push the migration to the remote Supabase project**

Run: `npx supabase db push`

Expected: `Applied migration 20260526000000_create_vendors_and_pack_origins.sql` (or similar phrasing — exact wording depends on Supabase CLI version).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260526000000_create_vendors_and_pack_origins.sql
git commit -m "feat(db): vendors, pack origins, revenue splits, payouts + validator"
```

---

## Task B2: Create the vendors API client

**Files:**
- Create: `src/api/vendors.ts`

- [ ] **Step 1: Write the API client**

```typescript
// src/api/vendors.ts
import { supabase } from './supabase/supabaseClient';
import type { Pack } from './packs';

export type VendorStatus = 'pending' | 'active' | 'paused' | 'offboarded';

export interface Vendor {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;                  // without leading '@'
  avatar_url: string | null;
  bio: string | null;
  is_publisher: boolean;
  commission_rate: number;         // InkStash's cut, e.g. 0.10 for launch partner
  stripe_connect_account_id: string | null;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export const vendorsAPI = {
  async getByHandle(handle: string): Promise<Vendor | null> {
    const cleaned = handle.startsWith('@') ? handle.slice(1) : handle;
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('handle', cleaned)
      .eq('status', 'active')
      .maybeSingle();
    if (error || !data) return null;
    return data as Vendor;
  },

  async listActive(): Promise<Vendor[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', 'active')
      .order('display_name', { ascending: true });
    if (error || !data) return [];
    return data as Vendor[];
  },

  async listPacksByVendor(vendorId: string): Promise<Pack[]> {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .eq('vendor_id', vendorId)
      .in('status', ['active', 'sold_out', 'upcoming'])
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Pack[];
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/api/vendors.ts
git commit -m "feat(api): vendors API client (getByHandle, listActive, listPacksByVendor)"
```

---

## Task B3: Extend the packs API types

**Files:**
- Modify: `src/api/packs.ts`

- [ ] **Step 1: Add the new fields to the Pack and PackItem interfaces**

In `src/api/packs.ts`, modify the `Pack` interface to add:

```typescript
export type PackOrigin = 'house' | 'vendor' | 'publisher';

export interface Pack {
  // ...existing fields above...
  origin: PackOrigin;
  vendor_id: string | null;
  value_lock: boolean;
  curator_note: string | null;
  is_sealed_collectible: boolean;
  // existing: id, name, partner, price, item_count, rarity_tiers, status, cover_image, badge, drop_at, created_at
}
```

Modify the `PackItem` interface to add:

```typescript
export type CoverTreatment = 'cardstock' | 'foil' | 'signed' | 'remarked';

export interface PackItem {
  // ...existing fields above...
  cover_treatment: CoverTreatment | null;
  declared_value: number | null;
  // existing: id, pack_id, comic_title, issue_number, grade, condition, rarity,
  //           estimated_value, image_url, quantity, remaining, is_chase, inventory_id
}
```

Add a method to fetch a pack with its vendor joined:

```typescript
// inside packsAPI:
async getByIdWithVendor(packId: string): Promise<(Pack & { vendor: Vendor | null }) | null> {
  const { data, error } = await supabase
    .from('packs')
    .select(`
      *,
      vendor:vendors!packs_vendor_id_fkey(*)
    `)
    .eq('id', packId)
    .single();
  if (error || !data) return null;
  const vendor = Array.isArray((data as any).vendor)
    ? (data as any).vendor[0]
    : (data as any).vendor;
  return { ...(data as Pack), vendor: vendor ?? null };
},
```

Add the Vendor import at the top:

```typescript
import type { Vendor } from './vendors';
```

- [ ] **Step 2: Update FALLBACK_PACKS**

The existing `FALLBACK_PACKS` array needs the new required fields. Add to every entry:

```typescript
origin: 'house' as const,
vendor_id: null,
value_lock: false,
curator_note: null,
is_sealed_collectible: false,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean. If any callers of `packsAPI` break because they destructured `Pack` fields that didn't exist before, they'd need updates — but new optional-feeling fields don't break readers.

- [ ] **Step 4: Commit**

```bash
git add src/api/packs.ts
git commit -m "feat(api): extend Pack + PackItem with origin/vendor fields"
```

---

## Task B4: Webhook branch for vendor onboarding completion

The webhook needs to handle Stripe's `account.updated` event so we can flip `vendors.status` from `pending` to `active` once the vendor finishes onboarding.

**Files:**
- Modify: `supabase/functions/stripe-webhook/index.ts`

- [ ] **Step 1: Find the dispatch point in the existing webhook**

The current webhook has:

```typescript
if (event.type !== 'payment_intent.succeeded') {
  return new Response('ok', { status: 200 })
}
```

Replace this guard with a switch statement that dispatches by event type.

- [ ] **Step 2: Restructure the dispatch**

Replace lines 66-158 (the entire post-signature-verification body) with:

```typescript
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  if (event.type === 'payment_intent.succeeded') {
    return await handlePaymentIntentSucceeded(event, stripe, serviceClient)
  }

  if (event.type === 'account.updated') {
    return await handleAccountUpdated(event, serviceClient)
  }

  return new Response('ok', { status: 200 })
})

async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  stripe: Stripe,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const intent = event.data.object as Stripe.PaymentIntent
  const paymentType = intent.metadata?.payment_type
  const userId = intent.metadata?.user_id

  if (!userId) {
    console.error('[stripe-webhook] missing user_id on intent', intent.id)
    return new Response('Missing user_id in metadata', { status: 400 })
  }

  // Backward compat: old intents without payment_type are ruby_bundle
  const effectiveType = paymentType ?? 'ruby_bundle'

  if (effectiveType === 'ruby_bundle') {
    return await creditRubyBundle(intent, stripe, serviceClient, userId)
  }

  if (effectiveType === 'vendor_pack') {
    return await openVendorPack(intent, serviceClient, userId)
  }

  console.warn('[stripe-webhook] unknown payment_type:', effectiveType)
  return new Response('ok', { status: 200 })
}

async function creditRubyBundle(
  intent: Stripe.PaymentIntent,
  stripe: Stripe,
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  const bundleId = intent.metadata?.bundle_id
  const rubyTotalRaw = intent.metadata?.ruby_total
  if (!bundleId || !rubyTotalRaw) {
    console.error('[stripe-webhook] ruby_bundle missing metadata', intent.id, intent.metadata)
    return new Response('Missing bundle_id or ruby_total', { status: 400 })
  }
  const rubyTotal = parseInt(rubyTotalRaw, 10)
  if (!Number.isFinite(rubyTotal) || rubyTotal <= 0) {
    return new Response('Invalid ruby_total', { status: 400 })
  }

  const { data: credited, error: rpcError } = await serviceClient.rpc(
    'credit_rubies_from_bundle',
    {
      p_user_id: userId,
      p_ruby_total: rubyTotal,
      p_bundle_id: bundleId,
      p_payment_intent_id: intent.id,
    },
  )
  if (rpcError) {
    console.error('[stripe-webhook] credit_rubies_from_bundle failed:', rpcError)
    return new Response('DB error', { status: 500 })
  }
  if (credited === false) {
    console.log('[stripe-webhook] retry: bundle already credited for intent', intent.id)
  } else {
    console.log('[stripe-webhook] credited', rubyTotal, 'rubies to user', userId)
  }

  // Save payment method (unchanged behavior from before)
  const paymentMethodId =
    typeof intent.payment_method === 'string' ? intent.payment_method : intent.payment_method?.id
  if (paymentMethodId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
      const card = pm.card
      if (card) {
        const { count } = await serviceClient
          .from('user_payment_methods')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
        const isFirstCard = (count ?? 0) === 0
        await serviceClient.from('user_payment_methods').upsert(
          {
            user_id: userId,
            stripe_payment_method_id: paymentMethodId,
            card_brand: card.brand,
            card_last4: card.last4,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            is_default: isFirstCard,
          },
          { onConflict: 'stripe_payment_method_id', ignoreDuplicates: true },
        )
      }
    } catch (err) {
      console.error('[stripe-webhook] retrieve payment method failed:', err)
    }
  }

  return new Response('ok', { status: 200 })
}

async function openVendorPack(
  intent: Stripe.PaymentIntent,
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  const packId = intent.metadata?.pack_id
  const vendorId = intent.metadata?.vendor_id
  if (!packId || !vendorId) {
    console.error('[stripe-webhook] vendor_pack missing metadata', intent.id, intent.metadata)
    return new Response('Missing pack_id or vendor_id', { status: 400 })
  }

  // Idempotency: bail if we already opened this pack for this intent
  const { data: existing } = await serviceClient
    .from('vendor_payouts')
    .select('id')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle()
  if (existing) {
    console.log('[stripe-webhook] retry: vendor pack already opened for intent', intent.id)
    return new Response('ok', { status: 200 })
  }

  // Delegate to the open-pack-usd edge function via direct invocation
  // (function-to-function call uses the service role key).
  // @ts-expect-error Deno env
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // @ts-expect-error Deno env
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const res = await fetch(`${supabaseUrl}/functions/v1/open-pack-usd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      user_id: userId,
      pack_id: packId,
      vendor_id: vendorId,
      payment_intent_id: intent.id,
      gross_amount_cents: intent.amount,
      application_fee_amount_cents: intent.application_fee_amount ?? 0,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[stripe-webhook] open-pack-usd failed:', res.status, text)
    return new Response('open-pack-usd failed', { status: 500 })
  }

  console.log('[stripe-webhook] vendor pack opened for intent', intent.id)
  return new Response('ok', { status: 200 })
}

async function handleAccountUpdated(
  event: Stripe.Event,
  serviceClient: ReturnType<typeof createClient>,
): Promise<Response> {
  const account = event.data.object as Stripe.Account
  // Connect account is "active" when charges + payouts are both enabled
  const isActive = account.charges_enabled && account.payouts_enabled
  if (!isActive) {
    console.log('[stripe-webhook] account.updated: not yet active', account.id)
    return new Response('ok', { status: 200 })
  }

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

  if (vendor.status === 'active') {
    return new Response('ok', { status: 200 })
  }

  const { error: updateError } = await serviceClient
    .from('vendors')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', vendor.id)

  if (updateError) {
    console.error('[stripe-webhook] vendor activate failed:', updateError)
    return new Response('DB error', { status: 500 })
  }

  console.log('[stripe-webhook] vendor activated:', vendor.id)
  return new Response('ok', { status: 200 })
}
```

- [ ] **Step 2: Deploy the webhook**

Run: `npx supabase functions deploy stripe-webhook --no-verify-jwt`

Expected: deploys successfully. `--no-verify-jwt` is required because Stripe doesn't send a Supabase JWT.

- [ ] **Step 3: Configure the `account.updated` webhook subscription in Stripe**

In the Stripe Dashboard → Developers → Webhooks → your existing webhook endpoint → "Add events" → enable `account.updated`. The endpoint URL stays the same; Stripe will now POST `account.updated` events to it too.

- [ ] **Step 4: Smoke test Ruby bundle still works**

Repeat the verification from Task A5 — buy a Ruby bundle, watch the function logs, confirm the balance updated. The refactor should not have changed behavior.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/stripe-webhook/index.ts
git commit -m "feat(webhook): branch handlers for ruby_bundle + vendor_pack + account.updated"
```

---

## Task B5: Admin script to create a vendor + Connect onboarding link

This is a Node script that runs against the production (or dev) Supabase + Stripe. It creates a `vendors` row, creates a Stripe Connect Express account, generates an account link, and prints the link for the operator to email to the vendor.

**Files:**
- Create: `scripts/create-vendor.mjs`

- [ ] **Step 1: Confirm `stripe` node SDK is installed**

Run: `node -e "console.log(require('stripe').VERSION || 'present')"`

Expected: prints a version (already installed per `package.json`).

- [ ] **Step 2: Write the script**

```javascript
// scripts/create-vendor.mjs
//
// Create a vendor row + Stripe Connect Express account + onboarding link.
//
// Usage:
//   node scripts/create-vendor.mjs \
//     --user-email vendor@example.com \
//     --display-name "BigTime Comics" \
//     --handle bigtimecomics \
//     --commission-rate 0.10 \
//     --is-publisher
//
// Env required:
//   VITE_SUPABASE_URL
//   SUPABASE_SECRET_KEY     (service role key)
//   STRIPE_SECRET_KEY
//
// Prints the Stripe Connect onboarding link to stdout. Email it to the
// vendor. The webhook flips vendors.status to 'active' once they complete
// onboarding.

import 'dotenv/config';
import Stripe from 'stripe';

const args = parseArgs(process.argv.slice(2));

if (!args['user-email'] || !args['display-name'] || !args['handle']) {
  console.error('Missing required args. See file header for usage.');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !STRIPE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL, SUPABASE_SECRET_KEY, or STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const restHeaders = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...restHeaders, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  // 1. Find the auth user by email
  const usersRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(args['user-email'])}`,
    { headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}` } },
  );
  if (!usersRes.ok) {
    throw new Error(`auth admin lookup failed: ${usersRes.status} ${await usersRes.text()}`);
  }
  const usersJson = await usersRes.json();
  const authUser = (usersJson.users ?? []).find((u) => u.email === args['user-email']);
  if (!authUser) {
    console.error(`No auth.users row for ${args['user-email']}. Have them sign up first.`);
    process.exit(1);
  }
  console.log(`Found auth user ${authUser.id}`);

  // 2. Create Stripe Connect Express account
  const account = await stripe.accounts.create({
    type: 'express',
    email: args['user-email'],
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      vendor_handle: args['handle'],
      inkstash_user_id: authUser.id,
    },
  });
  console.log(`Created Stripe Connect account ${account.id}`);

  // 3. Insert vendors row
  const commissionRate = args['commission-rate']
    ? Number(args['commission-rate'])
    : 0.300;
  if (!(commissionRate >= 0 && commissionRate <= 1)) {
    throw new Error(`commission-rate must be 0..1, got ${args['commission-rate']}`);
  }

  const vendor = await rest('/vendors', {
    method: 'POST',
    body: JSON.stringify({
      user_id: authUser.id,
      display_name: args['display-name'],
      handle: args['handle'],
      is_publisher: Boolean(args['is-publisher']),
      commission_rate: commissionRate,
      stripe_connect_account_id: account.id,
      status: 'pending',
    }),
  });
  console.log(`Inserted vendors row ${vendor[0].id}`);

  // 4. Create the onboarding link
  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://inkstash.app/seller-onboarding/refresh',
    return_url: 'https://inkstash.app/seller-onboarding/complete',
    type: 'account_onboarding',
  });

  console.log('');
  console.log('==================================================');
  console.log(`Onboarding link for ${args['display-name']}:`);
  console.log(link.url);
  console.log('==================================================');
  console.log('Email this link to the vendor. It expires after ~1 hour.');
  console.log('Once they complete onboarding, the webhook flips status to active.');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Smoke test with a real test-mode account**

Create a dummy auth user via Supabase Studio first (or use an existing dev account email), then:

```bash
node scripts/create-vendor.mjs \
  --user-email test-vendor@example.com \
  --display-name "Test Vendor" \
  --handle testvendor \
  --commission-rate 0.10 \
  --is-publisher
```

Expected: prints a Stripe URL like `https://connect.stripe.com/setup/e/acct_.../...`. Open it in a browser, complete the Stripe-hosted onboarding (test mode uses fake bank details — Stripe documents the test routing/account numbers in their guide). After completing, in Supabase Studio:

```sql
SELECT id, handle, status, stripe_connect_account_id
FROM public.vendors WHERE handle = 'testvendor';
```

Expected: `status = 'active'` (flipped by the webhook).

If `status` is still `pending` after onboarding, check the webhook logs: `npx supabase functions logs stripe-webhook --tail`. Common cause: the `account.updated` event isn't enabled in the Stripe webhook subscription.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-vendor.mjs
git commit -m "feat(scripts): create-vendor.mjs — provisions vendor + Connect onboarding link"
```

---

## Task B6: Admin script to validate vendor packs

Wraps the `validate_vendor_pack` SQL function for quick CLI checks.

**Files:**
- Create: `scripts/validate-vendor-pack.mjs`

- [ ] **Step 1: Write the script**

```javascript
// scripts/validate-vendor-pack.mjs
//
// Run the validate_vendor_pack SQL function for a pack id, print result.
//
// Usage:
//   node scripts/validate-vendor-pack.mjs <pack_id>
//
// Exit code 0 on pass, 1 on fail.

import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const packId = process.argv[2];
if (!packId) {
  console.error('Usage: node scripts/validate-vendor-pack.mjs <pack_id>');
  process.exit(1);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_vendor_pack`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_pack_id: packId }),
});

if (!res.ok) {
  console.error(`RPC failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const result = await res.json(); // null on pass, string on fail

if (result === null) {
  console.log(`✓ Pack ${packId} passes validation`);
  process.exit(0);
} else {
  console.log(`✗ Pack ${packId} FAILED: ${result}`);
  process.exit(1);
}
```

- [ ] **Step 2: Smoke test it on a known-bad input**

```bash
node scripts/validate-vendor-pack.mjs 00000000-0000-0000-0000-000000000000
```

Expected: `✗ Pack ... FAILED: pack not found`, exit code 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-vendor-pack.mjs
git commit -m "feat(scripts): validate-vendor-pack.mjs — CLI wrapper for the validator"
```

---

## Task B7: Admin script to create a vendor pack end-to-end

This is the operator's tool for taking a vendor's pack proposal and turning it into an active pack on the site. It inserts the pack, the pack_items, the revenue split row, runs the validator, and flips status to `active` if it passes.

**Files:**
- Create: `scripts/create-vendor-pack.mjs`

- [ ] **Step 1: Write the script**

```javascript
// scripts/create-vendor-pack.mjs
//
// Create a vendor pack from a JSON spec file. The spec defines the pack,
// its items, and which vendor owns it. The script:
//   1. Inserts the packs row (status='upcoming', origin='vendor', value_lock=true)
//   2. Inserts pack_items rows
//   3. Inserts pack_revenue_splits row (snapshots vendor.commission_rate)
//   4. Runs validate_vendor_pack — if fails, prints error and exits 1
//   5. Updates pack status to 'active'
//
// Usage:
//   node scripts/create-vendor-pack.mjs path/to/pack-spec.json
//
// Example spec file:
// {
//   "vendor_handle": "bigtimecomics",
//   "name": "Transformers #25 — Artist Variants",
//   "price": 150.00,
//   "item_count": 3,
//   "curator_note": "I commissioned these covers because the anniversary...",
//   "cover_image": "https://...",
//   "items": [
//     { "comic_title": "Transformers #25 (Artist A cardstock)",
//       "rarity": "common", "cover_treatment": "cardstock",
//       "declared_value": 50.00, "quantity": 50, "remaining": 50,
//       "image_url": "https://...", "is_chase": false },
//     ...
//     { "comic_title": "Transformers #25 (Artist A signed)",
//       "rarity": "rare", "cover_treatment": "signed",
//       "declared_value": 200.00, "quantity": 5, "remaining": 5,
//       "image_url": "https://...", "is_chase": true }
//   ]
// }

import 'dotenv/config';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env');
  process.exit(1);
}

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node scripts/create-vendor-pack.mjs <spec.json>');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const headers = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function main() {
  // 1. Look up vendor
  const vendors = await rest(
    `/vendors?handle=eq.${encodeURIComponent(spec.vendor_handle)}&select=id,commission_rate,status`,
  );
  if (vendors.length === 0) throw new Error(`Vendor handle not found: ${spec.vendor_handle}`);
  const vendor = vendors[0];
  if (vendor.status !== 'active') {
    throw new Error(`Vendor status is ${vendor.status} (need active)`);
  }
  console.log(`Vendor ${spec.vendor_handle} → ${vendor.id} (commission ${vendor.commission_rate})`);

  // 2. Insert pack
  const packs = await rest('/packs', {
    method: 'POST',
    body: JSON.stringify({
      name: spec.name,
      partner: spec.vendor_handle, // backward-compat with existing partner display
      price: spec.price,
      item_count: spec.item_count,
      rarity_tiers: { common: 1.0, rare: 0.0, legendary: 0.0 }, // unused for vendor packs, satisfies NOT NULL
      status: 'upcoming',
      origin: 'vendor',
      vendor_id: vendor.id,
      value_lock: true,
      curator_note: spec.curator_note ?? null,
      cover_image: spec.cover_image ?? null,
      is_sealed_collectible: spec.is_sealed_collectible ?? false,
    }),
  });
  const pack = packs[0];
  console.log(`Inserted pack ${pack.id} (status=upcoming)`);

  // 3. Insert pack_items
  const itemRows = spec.items.map((it) => ({
    pack_id: pack.id,
    comic_title: it.comic_title,
    issue_number: it.issue_number ?? null,
    grade: it.grade ?? null,
    condition: it.condition ?? null,
    rarity: it.rarity, // common | rare | legendary — required by existing schema
    cover_treatment: it.cover_treatment,
    declared_value: it.declared_value,
    estimated_value: it.declared_value, // mirror for compatibility with existing reads
    image_url: it.image_url ?? null,
    quantity: it.quantity,
    remaining: it.remaining,
    is_chase: Boolean(it.is_chase),
  }));
  await rest('/pack_items', { method: 'POST', body: JSON.stringify(itemRows) });
  console.log(`Inserted ${itemRows.length} pack_items`);

  // 4. Insert pack_revenue_splits
  await rest('/pack_revenue_splits', {
    method: 'POST',
    body: JSON.stringify({
      pack_id: pack.id,
      vendor_id: vendor.id,
      vendor_cut: 1 - vendor.commission_rate,
      inkstash_cut: vendor.commission_rate,
    }),
  });
  console.log(`Inserted pack_revenue_splits (vendor ${(1 - vendor.commission_rate) * 100}% / inkstash ${vendor.commission_rate * 100}%)`);

  // 5. Validate
  const valRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_vendor_pack`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_pack_id: pack.id }),
  });
  if (!valRes.ok) throw new Error(`Validator RPC failed: ${valRes.status} ${await valRes.text()}`);
  const validationError = await valRes.json();
  if (validationError !== null) {
    console.error(`✗ Validation failed: ${validationError}`);
    console.error('Pack left in status=upcoming. Fix the spec and update the pack manually, or delete it.');
    process.exit(1);
  }
  console.log(`✓ Validation passed`);

  // 6. Activate
  await rest(`/packs?id=eq.${pack.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active' }),
  });
  console.log(`✓ Pack activated: ${pack.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test with a deliberately invalid spec**

Create a temp file `/tmp/bad-pack.json`:

```json
{
  "vendor_handle": "testvendor",
  "name": "Bad Pack",
  "price": 100.00,
  "item_count": 3,
  "items": [
    { "comic_title": "A", "rarity": "common", "cover_treatment": "cardstock",
      "declared_value": 50, "quantity": 10, "remaining": 10 },
    { "comic_title": "B", "rarity": "common", "cover_treatment": "cardstock",
      "declared_value": 50, "quantity": 10, "remaining": 10 }
  ]
}
```

Run: `node scripts/create-vendor-pack.mjs /tmp/bad-pack.json`

Expected: script gets to step 5, prints `✗ Validation failed: expected pull value $100.00 does not equal pack price $100.00 (avg non-chase = $50.00 × item_count = 3)`. Exit 1. (50 × 3 = 150 ≠ 100.) That's the validator working.

Clean up the orphaned pack row created during this test:

```sql
DELETE FROM public.pack_items WHERE pack_id IN
  (SELECT id FROM public.packs WHERE name = 'Bad Pack');
DELETE FROM public.pack_revenue_splits WHERE pack_id IN
  (SELECT id FROM public.packs WHERE name = 'Bad Pack');
DELETE FROM public.packs WHERE name = 'Bad Pack';
```

- [ ] **Step 3: Commit**

```bash
git add scripts/create-vendor-pack.mjs
git commit -m "feat(scripts): create-vendor-pack.mjs — full pack creation + validation + activation"
```

---

# SECTION C — VENDOR PACK PRODUCT FLOW

Goal: Buyer-facing experience for vendor packs: PackDetail variant, checkout page, USD pack open via webhook, inventory + reveal, vendor profile stub. No buyback. Apple Pay via the Section A wrapper.

---

## Task C1: Create the open-pack-usd edge function

Mirrors `open-pack-rubies` but skipped Ruby debit and added vendor_payouts insert. Called by the webhook (not the client).

**Files:**
- Create: `supabase/functions/open-pack-usd/index.ts`

- [ ] **Step 1: Write the function**

```typescript
// Edge Function: open-pack-usd
// Opens a vendor pack after Stripe payment succeeds. Invoked by
// stripe-webhook (not by clients). The webhook sends user_id, pack_id,
// vendor_id, payment_intent_id, and the amounts already in cents.
//
// Flow:
//   1. Look up pack + items (must be origin='vendor', status='active')
//   2. Insert pack_purchases row keyed by payment_intent_id (idempotent)
//   3. Roll items (same draw logic as open-pack-rubies, but using
//      cover_treatment as the rarity dimension — we just pick weighted
//      by `quantity` / total remaining within the items pool, no
//      separate rarity-tier weights)
//   4. Update pack_items remaining
//   5. Insert user_inventory rows
//   6. Insert vendor_payouts row (one per purchase)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  user_id: string
  pack_id: string
  vendor_id: string
  payment_intent_id: string
  gross_amount_cents: number
  application_fee_amount_cents: number
}

interface PackItem {
  id: string
  comic_title: string
  issue_number: string | null
  grade: string | null
  rarity: string
  cover_treatment: string | null
  declared_value: number | null
  estimated_value: number | null
  image_url: string | null
  remaining: number
  quantity: number
  is_chase: boolean | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // @ts-expect-error Deno env
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    // @ts-expect-error Deno env
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const body: RequestBody = await req.json()
    if (!body.user_id || !body.pack_id || !body.vendor_id || !body.payment_intent_id) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Idempotency: was this intent already processed?
    const { data: existing } = await serviceClient
      .from('vendor_payouts')
      .select('id, pack_purchase_id')
      .eq('stripe_payment_intent_id', body.payment_intent_id)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, idempotent: true, purchase_id: existing.pack_purchase_id }, 200)
    }

    const { data: pack, error: packError } = await serviceClient
      .from('packs')
      .select('id, item_count, origin, status, value_lock')
      .eq('id', body.pack_id)
      .single()
    if (packError || !pack) return json({ error: 'Pack not found' }, 404)
    if (pack.origin !== 'vendor') return json({ error: 'Not a vendor pack' }, 400)
    if (pack.status !== 'active') return json({ error: `Pack not active (${pack.status})` }, 400)

    const { data: items, error: itemsError } = await serviceClient
      .from('pack_items')
      .select('id, comic_title, issue_number, grade, rarity, cover_treatment, declared_value, estimated_value, image_url, remaining, quantity, is_chase')
      .eq('pack_id', body.pack_id)
      .gt('remaining', 0)
    if (itemsError || !items || items.length === 0) {
      return json({ error: 'No items available' }, 400)
    }

    // Insert pack_purchases row
    const { data: purchase, error: purchaseError } = await serviceClient
      .from('pack_purchases')
      .insert({
        user_id: body.user_id,
        pack_id: body.pack_id,
        stripe_payment_intent_id: body.payment_intent_id,
      })
      .select('id')
      .single()
    if (purchaseError || !purchase) {
      console.error('[open-pack-usd] purchase insert failed:', purchaseError)
      return json({ error: 'Purchase insert failed' }, 500)
    }

    // Draw items. Weighted by `remaining` (more available = more likely).
    // is_chase items have their `quantity` divided by 10 before weighting
    // to make them appropriately rare — a 5-remaining chase shouldn't be
    // equally likely as a 50-remaining cardstock common.
    const drawn: PackItem[] = []
    const pool: PackItem[] = items as PackItem[]
    const decrementMap: Record<string, number> = {}

    for (let i = 0; i < pack.item_count; i++) {
      const candidates = pool.filter((p) => (p.remaining - (decrementMap[p.id] ?? 0)) > 0)
      if (candidates.length === 0) break
      const weights = candidates.map((c) => {
        const effective = (c.remaining - (decrementMap[c.id] ?? 0))
        return c.is_chase ? effective / 10 : effective
      })
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let r = Math.random() * totalWeight
      let chosen = candidates[0]
      for (let j = 0; j < candidates.length; j++) {
        r -= weights[j]
        if (r <= 0) { chosen = candidates[j]; break }
      }
      drawn.push(chosen)
      decrementMap[chosen.id] = (decrementMap[chosen.id] ?? 0) + 1
    }

    if (drawn.length === 0) {
      return json({ error: 'Could not draw any items' }, 500)
    }

    // Decrement remaining counts
    for (const [itemId, count] of Object.entries(decrementMap)) {
      const { data: currentItem } = await serviceClient
        .from('pack_items')
        .select('remaining')
        .eq('id', itemId)
        .single()
      if (currentItem && currentItem.remaining >= count) {
        await serviceClient
          .from('pack_items')
          .update({ remaining: currentItem.remaining - count })
          .eq('id', itemId)
          .gte('remaining', count)
      }
    }

    // Update pack_purchases with the drawn items
    await serviceClient
      .from('pack_purchases')
      .update({
        items_received: drawn,
        revealed_at: new Date().toISOString(),
      })
      .eq('id', purchase.id)

    // Seed user_inventory
    const inventoryRows = drawn.map((item) => ({
      user_id: body.user_id,
      pack_purchase_id: purchase.id,
      pack_item_id: item.id,
      status: 'vaulted',
    }))
    await serviceClient.from('user_inventory').insert(inventoryRows)

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
      // stripe_transfer_id is null at this point; can be backfilled if needed
      // by querying the PaymentIntent's latest_charge.transfer
    })

    return json({ ok: true, purchase_id: purchase.id, items: drawn }, 200)
  } catch (err) {
    console.error('[open-pack-usd] error:', err)
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

Run: `npx supabase functions deploy open-pack-usd --no-verify-jwt`

(`--no-verify-jwt` because the webhook uses a service role key, not a Supabase JWT.)

Expected: deploys successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/open-pack-usd/index.ts
git commit -m "feat(functions): open-pack-usd for vendor pack post-payment opening"
```

---

## Task C2: VendorPackHeader component

**Files:**
- Create: `src/components/packs/VendorPackHeader.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/packs/VendorPackHeader.tsx
import { Box, Avatar, Chip, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { Vendor } from '../../api/vendors';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  vendor: Vendor;
}

export default function VendorPackHeader({ vendor }: Props) {
  return (
    <Box
      component={RouterLink}
      to={`/v/${vendor.handle}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',
        color: 'inherit',
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${inkstashColors.border}`,
        transition: 'background 140ms ease',
        '&:hover': { bgcolor: inkstashColors.bgElev },
      }}
    >
      <Avatar
        src={vendor.avatar_url ?? undefined}
        alt={vendor.display_name}
        sx={{ width: 40, height: 40 }}
      >
        {vendor.display_name[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontFamily: inkstashFonts.ui,
            fontWeight: 700,
            fontSize: 14,
            color: inkstashColors.ink,
          }}
        >
          {vendor.display_name}
        </Box>
        <Box
          sx={{
            fontFamily: inkstashFonts.mono,
            fontSize: 11,
            color: inkstashColors.muted,
          }}
        >
          @{vendor.handle}
        </Box>
      </Box>
      {vendor.is_publisher && (
        <Chip
          label="Publisher exclusive"
          size="small"
          sx={{
            bgcolor: inkstashColors.brand,
            color: '#fff',
            fontFamily: inkstashFonts.mono,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        />
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/packs/VendorPackHeader.tsx
git commit -m "feat(packs): VendorPackHeader component"
```

---

## Task C3: CuratorNote, PackContentsGrid, VendorPackGuaranteeRow components

**Files:**
- Create: `src/components/packs/CuratorNote.tsx`
- Create: `src/components/packs/PackContentsGrid.tsx`
- Create: `src/components/packs/VendorPackGuaranteeRow.tsx`

- [ ] **Step 1: CuratorNote**

```tsx
// src/components/packs/CuratorNote.tsx
import { Box } from '@mui/material';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  note: string;
  vendorName: string;
}

export default function CuratorNote({ note, vendorName }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        my: 3,
        py: 2.5,
        px: 3,
        borderLeft: `3px solid ${inkstashColors.brand}`,
        bgcolor: inkstashColors.bgSunken,
        borderRadius: '0 4px 4px 0',
      }}
    >
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 1,
        }}
      >
        Curator's note · {vendorName}
      </Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.ui,
          fontSize: 14,
          fontStyle: 'italic',
          color: inkstashColors.ink,
          lineHeight: 1.55,
        }}
      >
        {note}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: PackContentsGrid**

```tsx
// src/components/packs/PackContentsGrid.tsx
import { Box, Chip } from '@mui/material';
import type { PackItem, CoverTreatment } from '../../api/packs';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  items: PackItem[];
}

const TREATMENT_LABEL: Record<CoverTreatment, string> = {
  cardstock: 'Cardstock',
  foil: 'Foil',
  signed: 'Signed',
  remarked: 'Remarked',
};

const TREATMENT_COLOR: Record<CoverTreatment, string> = {
  cardstock: 'rgba(255,255,255,0.6)',
  foil: '#8ab4f8',
  signed: '#f5c842',
  remarked: '#ef6c8a',
};

export default function PackContentsGrid({ items }: Props) {
  // Total remaining inventory across the pack determines the per-item draw weight.
  // Chase items are weighted at 1/10 to reflect the open-pack-usd draw logic.
  const totalWeight = items.reduce((sum, it) => {
    const w = it.is_chase ? (it.remaining / 10) : it.remaining;
    return sum + w;
  }, 0);

  return (
    <Box>
      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          color: inkstashColors.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          mb: 1.5,
        }}
      >
        What's in the pack
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {items.map((item) => {
          const weight = item.is_chase ? (item.remaining / 10) : item.remaining;
          const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
          const treatment = item.cover_treatment ?? 'cardstock';
          return (
            <Box
              key={item.id}
              sx={{
                bgcolor: inkstashColors.bgElev,
                border: `1px solid ${inkstashColors.border}`,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  aspectRatio: '2/3',
                  bgcolor: inkstashColors.bgSunken,
                  backgroundImage: item.image_url ? `url(${item.image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <Box sx={{ p: 1.25 }}>
                <Box
                  sx={{
                    fontFamily: inkstashFonts.ui,
                    fontSize: 12,
                    fontWeight: 600,
                    color: inkstashColors.ink,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.75,
                  }}
                >
                  {item.comic_title}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={TREATMENT_LABEL[treatment]}
                    size="small"
                    sx={{
                      height: 18,
                      bgcolor: 'transparent',
                      border: `1px solid ${TREATMENT_COLOR[treatment]}`,
                      color: TREATMENT_COLOR[treatment],
                      fontFamily: inkstashFonts.mono,
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  />
                  <Box
                    sx={{
                      fontFamily: inkstashFonts.mono,
                      fontSize: 10,
                      color: inkstashColors.muted,
                    }}
                  >
                    {pct.toFixed(1)}%
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: VendorPackGuaranteeRow**

```tsx
// src/components/packs/VendorPackGuaranteeRow.tsx
import { Box } from '@mui/material';
import type { Pack, PackItem } from '../../api/packs';
import { inkstashColors, inkstashFonts } from '../../theme/inkstashTokens';

interface Props {
  pack: Pack;
  items: PackItem[];
}

export default function VendorPackGuaranteeRow({ pack, items }: Props) {
  const chaseItems = items.filter((it) => it.is_chase);
  const totalWeight = items.reduce(
    (sum, it) => sum + (it.is_chase ? it.remaining / 10 : it.remaining),
    0,
  );
  const chaseChancePct = totalWeight > 0
    ? (chaseItems.reduce((s, it) => s + it.remaining / 10, 0) / totalWeight) * 100
    : 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        my: 2,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: inkstashColors.bgSunken,
        border: `1px solid ${inkstashColors.border}`,
        fontFamily: inkstashFonts.ui,
        fontSize: 13,
        color: inkstashColors.ink,
      }}
    >
      <Box sx={{ fontWeight: 700 }}>
        Guaranteed: {pack.item_count} {pack.item_count === 1 ? 'book' : 'books'}, ${pack.price.toFixed(2)} in value.
      </Box>
      {chaseItems.length > 0 && (
        <Box sx={{ color: inkstashColors.muted }}>
          Chase chance: {chaseChancePct.toFixed(1)}% ({chaseItems.length} possible {chaseItems.length === 1 ? 'variant' : 'variants'}).
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/packs/CuratorNote.tsx src/components/packs/PackContentsGrid.tsx src/components/packs/VendorPackGuaranteeRow.tsx
git commit -m "feat(packs): CuratorNote + PackContentsGrid + VendorPackGuaranteeRow for vendor PackDetail"
```

---

## Task C4: Wire vendor pack rendering into PackDetail

`src/pages/PackDetail.tsx` is 1535 lines. Strategy: add a conditional branch near the top of the render that swaps in vendor-pack components when `pack.origin === 'vendor'`, leaving the house pack render path untouched.

**Files:**
- Modify: `src/pages/PackDetail.tsx`

- [ ] **Step 1: Add imports + load the vendor**

At the top of the file, add:

```tsx
import VendorPackHeader from '../components/packs/VendorPackHeader';
import CuratorNote from '../components/packs/CuratorNote';
import PackContentsGrid from '../components/packs/PackContentsGrid';
import VendorPackGuaranteeRow from '../components/packs/VendorPackGuaranteeRow';
import type { Vendor } from '../api/vendors';
```

The component already loads the pack via `packsAPI.getById(packId)`. Replace that call with `packsAPI.getByIdWithVendor(packId)` (added in B3). Update the local state:

```tsx
const [pack, setPack] = useState<(Pack & { vendor: Vendor | null }) | null>(null);
```

- [ ] **Step 2: Conditional branch for vendor pack details panel**

Find the section that currently renders pack metadata (name, price, "Value Odds" block). The exact location depends on the file structure — search for "Value Odds" in the file. Wrap the existing house-pack rendering of that block in a conditional, and add the vendor pack branch:

```tsx
{pack.origin === 'vendor' && pack.vendor && (
  <>
    <VendorPackHeader vendor={pack.vendor} />
    {pack.curator_note && (
      <CuratorNote note={pack.curator_note} vendorName={pack.vendor.display_name} />
    )}
    <PackContentsGrid items={items} />
    <VendorPackGuaranteeRow pack={pack} items={items} />
  </>
)}

{pack.origin !== 'vendor' && (
  <>
    {/* existing Value Odds block + chase callout for house packs */}
  </>
)}
```

- [ ] **Step 3: Vendor pack CTA goes to checkout page, not Hold-to-Open**

Find the "Buy" / "Hold to Open" CTA. House packs (origin = 'house') use Rubies and the Hold-to-Open flow — leave that exactly as-is. For vendor packs, replace the CTA with:

```tsx
{pack.origin === 'vendor' && (
  <Button
    component={RouterLink}
    to={`/checkout/vendor-pack/${pack.id}`}
    variant="contained"
    fullWidth
    sx={{ mt: 2, py: 1.5, fontWeight: 700, fontSize: 16 }}
  >
    Buy with USD — ${pack.price.toFixed(2)}
  </Button>
)}

{pack.origin === 'house' && (
  // ... existing Hold-to-Open button block ...
)}
```

(Add `import { Link as RouterLink } from 'react-router-dom';` if it isn't already imported.)

- [ ] **Step 4: Pass origin to CardDispositionRow during reveal**

Find where `<CardDispositionRow ... />` is rendered (inside the reveal/post-pull section). Add a prop:

```tsx
<CardDispositionRow
  // ... existing props ...
  packOrigin={pack.origin}
/>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean. If errors mention `CardDispositionRow` doesn't accept `packOrigin` — that's expected; C5 adds the prop.

For Step 5, *expect* the typecheck to fail until C5 is done. Comment the new prop temporarily, run typecheck to confirm everything else is clean, then uncomment.

- [ ] **Step 6: Commit (with temporary comment on the new prop)**

```bash
git add src/pages/PackDetail.tsx
git commit -m "feat(packs): branch PackDetail rendering on pack.origin === 'vendor'"
```

---

## Task C5: Hide Sell-back on vendor pack disposition rows

**Files:**
- Modify: `src/components/packs/CardDispositionRow.tsx`

- [ ] **Step 1: Add the prop to the interface**

Add `packOrigin?: 'house' | 'vendor' | 'publisher'` to the component's props. Default to `'house'` so existing callers (which are all house packs today) are unaffected.

- [ ] **Step 2: Conditional render the Sell-back button**

Find the Sell-back button (likely in a button group with Keep + Ship). Wrap it:

```tsx
{packOrigin !== 'vendor' && (
  <Button
    onClick={() => onDisposition('sell')}
    // ... existing styling ...
  >
    Sell-back · {payoutRubies} 💎
  </Button>
)}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean (and the PackDetail change from C4 now also typechecks — go back and uncomment that prop if you commented it).

- [ ] **Step 4: Commit**

```bash
git add src/components/packs/CardDispositionRow.tsx src/pages/PackDetail.tsx
git commit -m "feat(packs): hide Sell-back on vendor pack disposition rows"
```

---

## Task C6: CheckoutVendorPack page

**Files:**
- Create: `src/pages/CheckoutVendorPack.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/pages/CheckoutVendorPack.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Container, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import StripePaymentElement from '../components/checkout/StripePaymentElement';
import { packsAPI, type Pack } from '../api/packs';
import type { Vendor } from '../api/vendors';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function CheckoutVendorPack() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [pack, setPack] = useState<(Pack & { vendor: Vendor | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packId) return;
    (async () => {
      const p = await packsAPI.getByIdWithVendor(packId);
      if (!p) {
        setError('Pack not found.');
      } else if (p.origin !== 'vendor') {
        setError('This pack is not available for USD checkout.');
      } else if (p.status !== 'active') {
        setError('This pack is not currently available.');
      } else {
        setPack(p);
      }
      setLoading(false);
    })();
  }, [packId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pack || !pack.vendor) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">{error ?? 'Pack not available.'}</Alert>
        <Button
          component={RouterLink}
          to="/packs"
          startIcon={<ArrowLeft size={16} />}
          sx={{ mt: 3 }}
        >
          Back to packs
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button
        component={RouterLink}
        to={`/packs/${pack.id}`}
        startIcon={<ArrowLeft size={16} />}
        sx={{ color: inkstashColors.muted, mb: 2 }}
      >
        Back to pack
      </Button>

      <Box
        sx={{
          fontFamily: inkstashFonts.display,
          fontWeight: 900,
          fontSize: 28,
          color: inkstashColors.ink,
          mb: 0.5,
        }}
      >
        {pack.name}
      </Box>
      <Box sx={{ color: inkstashColors.muted, mb: 3 }}>
        From @{pack.vendor.handle} · ${pack.price.toFixed(2)}
      </Box>

      <StripePaymentElement
        paymentType="vendor_pack"
        targetId={pack.id}
        buttonLabel={`Pay $${pack.price.toFixed(2)}`}
        returnUrl={`${window.location.origin}/packs/${pack.id}?reveal=pending`}
        onError={(err) => setError(err.message)}
      />
    </Container>
  );
}
```

- [ ] **Step 2: Register the route**

Find the router setup (likely `src/App.tsx` or `src/main.tsx` or a `routes.tsx` file — search for `<Route` to find it). Add:

```tsx
import CheckoutVendorPack from './pages/CheckoutVendorPack';

// inside the <Routes> block:
<Route path="/checkout/vendor-pack/:packId" element={<CheckoutVendorPack />} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/pages/CheckoutVendorPack.tsx src/App.tsx
git commit -m "feat(checkout): CheckoutVendorPack page wired to StripePaymentElement"
```

(Adjust the `git add` paths to match where you actually registered the route.)

---

## Task C7: VendorProfile stub page

**Files:**
- Create: `src/pages/VendorProfile.tsx`

- [ ] **Step 1: Write the stub**

```tsx
// src/pages/VendorProfile.tsx
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Container, Avatar, Chip, CircularProgress, Alert } from '@mui/material';
import { vendorsAPI, type Vendor } from '../api/vendors';
import { packsAPI, type Pack } from '../api/packs';
import { inkstashColors, inkstashFonts } from '../theme/inkstashTokens';

export default function VendorProfile() {
  const { handle } = useParams<{ handle: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle) return;
    (async () => {
      const v = await vendorsAPI.getByHandle(handle);
      if (v) {
        setVendor(v);
        const ps = await vendorsAPI.listPacksByVendor(v.id);
        setPacks(ps);
      }
      setLoading(false);
    })();
  }, [handle]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!vendor) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">Vendor not found.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar
          src={vendor.avatar_url ?? undefined}
          alt={vendor.display_name}
          sx={{ width: 64, height: 64 }}
        >
          {vendor.display_name[0]?.toUpperCase()}
        </Avatar>
        <Box>
          <Box
            sx={{
              fontFamily: inkstashFonts.display,
              fontWeight: 900,
              fontSize: 24,
              color: inkstashColors.ink,
            }}
          >
            {vendor.display_name}
          </Box>
          <Box
            sx={{
              fontFamily: inkstashFonts.mono,
              fontSize: 12,
              color: inkstashColors.muted,
            }}
          >
            @{vendor.handle}
          </Box>
        </Box>
        {vendor.is_publisher && (
          <Chip
            label="Publisher"
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: inkstashColors.brand,
              color: '#fff',
              fontFamily: inkstashFonts.mono,
              fontSize: 10,
              fontWeight: 700,
            }}
          />
        )}
      </Box>

      {vendor.bio && (
        <Box
          sx={{
            mb: 4,
            color: inkstashColors.ink,
            fontFamily: inkstashFonts.ui,
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {vendor.bio}
        </Box>
      )}

      <Box
        sx={{
          fontFamily: inkstashFonts.mono,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: inkstashColors.muted,
          mb: 1.5,
        }}
      >
        Active packs ({packs.length})
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {packs.map((p) => (
          <Box
            key={p.id}
            component={RouterLink}
            to={`/packs/${p.id}`}
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              border: `1px solid ${inkstashColors.border}`,
              borderRadius: 2,
              p: 2,
              transition: 'border-color 140ms ease',
              '&:hover': { borderColor: inkstashColors.brand },
            }}
          >
            <Box sx={{ fontWeight: 700, mb: 0.5 }}>{p.name}</Box>
            <Box sx={{ fontFamily: inkstashFonts.mono, fontSize: 12, color: inkstashColors.muted }}>
              ${p.price.toFixed(2)} · {p.item_count} items
            </Box>
          </Box>
        ))}
        {packs.length === 0 && (
          <Box sx={{ color: inkstashColors.muted, fontSize: 13 }}>No active packs.</Box>
        )}
      </Box>
    </Container>
  );
}
```

- [ ] **Step 2: Register the route**

Add to your router:

```tsx
import VendorProfile from './pages/VendorProfile';
<Route path="/v/:handle" element={<VendorProfile />} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/pages/VendorProfile.tsx src/App.tsx
git commit -m "feat(vendors): VendorProfile stub page at /v/:handle"
```

---

## Task C8: Origin filter pills on Packs catalog

**Files:**
- Modify: `src/pages/Packs.tsx`

- [ ] **Step 1: Find the catalog list rendering**

Run: `grep -n "packsAPI.list\|.from('packs')" src/pages/Packs.tsx`

You should see one call site that fetches the pack list and one map() rendering tiles.

- [ ] **Step 2: Add origin filter state + UI**

Near the top of the component:

```tsx
import { Box, Chip } from '@mui/material';
import { useState } from 'react';

type OriginFilter = 'all' | 'house' | 'vendor';
const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
```

Above the pack grid:

```tsx
<Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
  {(['all', 'house', 'vendor'] as const).map((f) => (
    <Chip
      key={f}
      label={f === 'all' ? 'All' : f === 'house' ? 'InkStash House' : 'Vendor Collabs'}
      onClick={() => setOriginFilter(f)}
      color={originFilter === f ? 'primary' : 'default'}
      variant={originFilter === f ? 'filled' : 'outlined'}
      sx={{ fontWeight: 600 }}
    />
  ))}
</Box>
```

Filter the rendered pack list:

```tsx
const filteredPacks = packs.filter((p) => {
  if (originFilter === 'all') return true;
  return p.origin === originFilter;
});
// then map filteredPacks instead of packs
```

- [ ] **Step 3: Add vendor handle on vendor pack tiles**

In the tile component (likely a `PackTile` or inline rendering inside `.map`), show the vendor handle:

```tsx
{p.origin === 'vendor' && (
  <Box
    sx={{
      fontFamily: inkstashFonts.mono,
      fontSize: 10,
      color: inkstashColors.brand,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}
  >
    by @{p.partner}
  </Box>
)}
```

(The vendor handle is in `pack.partner` because `create-vendor-pack.mjs` sets `partner = spec.vendor_handle` for backward compat. If you want a cleaner separation, fetch the joined vendor on the catalog list query — but that's a larger refactor and not necessary for Phase 5.)

- [ ] **Step 4: Typecheck and visual verification**

Run: `npx tsc --noEmit`. Expected: clean.

Then run the dev server, navigate to `/packs`, click each filter pill, confirm:
- "All" shows everything.
- "InkStash House" shows only existing packs.
- "Vendor Collabs" shows only vendor packs once any have been created (empty at first — that's correct).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Packs.tsx
git commit -m "feat(packs): origin filter pills + vendor handle on tiles"
```

---

## Task C9: End-to-end vendor pack purchase smoke test

This is the integration test for everything Sections B + C built. It validates the full flow: vendor created → pack created → buyer pays via Apple Pay or card → webhook opens pack → inventory rows exist → vendor_payouts row exists with the correct split.

**Files:** none (verification only).

- [ ] **Step 1: Create a test vendor**

```bash
node scripts/create-vendor.mjs \
  --user-email <your-test-account-email> \
  --display-name "Smoke Test Comics" \
  --handle smoketest \
  --commission-rate 0.10
```

Follow the printed Connect URL, complete onboarding in Stripe test mode (use Stripe's documented test bank: routing `110000000`, account `000123456789`; for individual SSN use `000-00-0000`; DOB `01/01/1990`; any address works).

Verify in Supabase Studio:
```sql
SELECT id, handle, status FROM public.vendors WHERE handle = 'smoketest';
```
Expected: `status = 'active'`.

- [ ] **Step 2: Create a test vendor pack**

Make `/tmp/smoke-pack.json`:

```json
{
  "vendor_handle": "smoketest",
  "name": "Smoke Test 3-Pack",
  "price": 30.00,
  "item_count": 3,
  "curator_note": "End-to-end smoke test pack — three books, $10 each, plus a chase.",
  "items": [
    { "comic_title": "Smoke A", "rarity": "common", "cover_treatment": "cardstock",
      "declared_value": 10, "quantity": 10, "remaining": 10,
      "image_url": "https://picsum.photos/seed/smokeA/300/450" },
    { "comic_title": "Smoke B", "rarity": "common", "cover_treatment": "cardstock",
      "declared_value": 10, "quantity": 10, "remaining": 10,
      "image_url": "https://picsum.photos/seed/smokeB/300/450" },
    { "comic_title": "Smoke C", "rarity": "common", "cover_treatment": "cardstock",
      "declared_value": 10, "quantity": 10, "remaining": 10,
      "image_url": "https://picsum.photos/seed/smokeC/300/450" },
    { "comic_title": "Smoke Chase (signed)", "rarity": "legendary", "cover_treatment": "signed",
      "declared_value": 100, "quantity": 2, "remaining": 2,
      "image_url": "https://picsum.photos/seed/smokeChase/300/450",
      "is_chase": true }
  ]
}
```

Note: 10 × 3 = 30 = pack price. Validator passes.

Run: `node scripts/create-vendor-pack.mjs /tmp/smoke-pack.json`

Expected output ends with `✓ Pack activated: <uuid>`.

- [ ] **Step 3: Buy the pack as a buyer**

In your dev environment, navigate to `/packs`, filter to "Vendor Collabs", click "Smoke Test 3-Pack", click "Buy with USD — $30.00", complete checkout with Stripe test card `4242 4242 4242 4242`.

Expected: redirect to `/packs/<pack-id>?reveal=pending`.

- [ ] **Step 4: Verify the back-end side**

Watch the webhook logs: `npx supabase functions logs stripe-webhook --tail`

Expected output:
```
[stripe-webhook] event received: payment_intent.succeeded evt_...
[stripe-webhook] vendor pack opened for intent pi_...
```

Then in Supabase Studio:

```sql
-- Verify the purchase
SELECT id, user_id, items_received, revealed_at
FROM public.pack_purchases
WHERE stripe_payment_intent_id = '<pi_... from logs>';

-- Verify inventory was seeded
SELECT id, pack_item_id, status FROM public.user_inventory
WHERE pack_purchase_id = '<purchase id above>';

-- Verify the payout row
SELECT gross_amount_cents, vendor_amount_cents, inkstash_amount_cents
FROM public.vendor_payouts
WHERE stripe_payment_intent_id = '<pi_... from logs>';
```

Expected:
- 1 `pack_purchases` row with `items_received` as a JSONB array of 3 drawn items, `revealed_at` set.
- 3 `user_inventory` rows, status `vaulted`.
- 1 `vendor_payouts` row: `gross_amount_cents = 3000`, `inkstash_amount_cents = 300`, `vendor_amount_cents = 2700` (90/10 split on $30).

- [ ] **Step 5: Verify Stripe Connect destination received the funds**

In the Stripe Dashboard (test mode), navigate to the Connect account for `smoketest` (or look up the test mode Connect account id from the `vendors` table). Confirm a $27.00 payout shows in the balance, with a $3.00 application fee going to the platform.

- [ ] **Step 6: Verify the buyer sees the reveal + no Sell-back**

Navigate to `/packs/<pack-id>` while logged in as the buyer. Confirm:
- The vendor pack reveal flow loads (this may require manually setting `?reveal=<purchase-id>` if the redirect doesn't naturally land on the reveal — check the existing PackDetail behavior with house packs and mirror).
- Three books are revealed.
- Each disposition row shows Keep + Ship buttons. **Sell-back is NOT visible.**

- [ ] **Step 7: If everything passes, commit a smoke-test marker**

```bash
git commit --allow-empty -m "test(phase5): vendor pack end-to-end smoke test passed in dev"
```

This is intentionally empty — it's a marker that lets the next person know this verification has been done in this environment.

If anything fails: open an issue, fix in a follow-up task, do not declare Phase 5 done.

---

## Task C10: Per-vendor ship-from address (open question #2 from spec)

The spec's Open Question #2 says vendor pack books ship from the *vendor's* address, not InkStash. The existing `request-ship-item` function uses an `address_id` from the `user_addresses` table (the buyer's address). The origin address is currently a placeholder in `create-shipping-label`. We need to wire vendor-origin shipping.

**Files:**
- Create: `supabase/migrations/20260526010000_vendor_ship_from_addresses.sql`
- Modify: `supabase/functions/create-shipping-label/index.ts`

- [ ] **Step 1: Migration for vendor ship-from addresses**

```sql
-- supabase/migrations/20260526010000_vendor_ship_from_addresses.sql
CREATE TABLE public.vendor_ship_from_addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name         text NOT NULL,
  company_name text,
  street1      text NOT NULL,
  street2      text,
  city         text NOT NULL,
  state        text NOT NULL,
  postal_code  text NOT NULL,
  country      text NOT NULL DEFAULT 'US',
  phone        text,
  is_default   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_ship_from_default_uq
  ON public.vendor_ship_from_addresses (vendor_id)
  WHERE is_default;

ALTER TABLE public.vendor_ship_from_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY vsfa_owner_read ON public.vendor_ship_from_addresses
  FOR SELECT USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db reset` (local), `npx supabase db push` (remote). Expected: applies cleanly.

- [ ] **Step 3: Modify `create-shipping-label` to look up vendor origin**

Read `supabase/functions/create-shipping-label/index.ts` first to understand current shape. The change is: when shipping a `user_inventory` item whose source pack has `origin = 'vendor'`, look up the vendor's default ship-from address and use that as the label origin instead of the hardcoded `123 Main St` placeholder.

First read `supabase/functions/create-shipping-label/index.ts` to find where the origin (ship-from) address is currently constructed — the existing memory note flagged it as `123 Main St, San Francisco`. That hardcoded literal is the spot to wrap.

In the function, after loading the inventory item + pack, replace the hardcoded origin with a conditional:

```typescript
// Was: hardcoded { name: '...', address_line1: '123 Main St', ... }
// Now: conditional on pack.origin
let originAddress = INKSTASH_DEFAULT_ORIGIN; // keep whatever shape the existing literal had — rename the literal to this constant at the top of the file

if (pack.origin === 'vendor' && pack.vendor_id) {
  const { data: vendorAddr } = await serviceClient
    .from('vendor_ship_from_addresses')
    .select('*')
    .eq('vendor_id', pack.vendor_id)
    .eq('is_default', true)
    .maybeSingle();
  if (vendorAddr) {
    originAddress = {
      name: vendorAddr.name,
      company_name: vendorAddr.company_name ?? undefined,
      address_line1: vendorAddr.street1,
      address_line2: vendorAddr.street2 ?? undefined,
      city_locality: vendorAddr.city,
      state_province: vendorAddr.state,
      postal_code: vendorAddr.postal_code,
      country_code: vendorAddr.country,
      phone: vendorAddr.phone ?? undefined,
    };
  }
  // If vendor has no default ship-from, fall through to InkStash default
  // (operator can fix by inserting a row in vendor_ship_from_addresses).
}
```

- [ ] **Step 4: Document a manual setup step**

Add to `docs/operations/apple-pay-domain-verification.md` (or create `docs/operations/vendor-onboarding-checklist.md`):

```markdown
## Vendor ship-from address

For any vendor whose packs require physical shipping (i.e. every vendor in Phase 5),
operator must insert at least one row into `vendor_ship_from_addresses`:

INSERT INTO public.vendor_ship_from_addresses
  (vendor_id, name, company_name, street1, city, state, postal_code, is_default)
VALUES
  ('<vendor uuid>', 'Vendor Owner Name', 'BigTime Comics', '123 Real St',
   'Brooklyn', 'NY', '11201', true);

Without this, ship labels fall back to InkStash's default origin and the vendor's
books would arrive at InkStash before reaching the buyer.
```

- [ ] **Step 5: Deploy + commit**

Run: `npx supabase functions deploy create-shipping-label`

```bash
git add supabase/migrations/20260526010000_vendor_ship_from_addresses.sql \
        supabase/functions/create-shipping-label/index.ts \
        docs/operations/
git commit -m "feat(shipping): vendor_ship_from_addresses + per-vendor origin on labels"
```

---

# Phase 5 Acceptance Verification

After all tasks above are complete, run through the spec's Section 6 acceptance criteria one by one:

- [ ] Acceptance #1: `node scripts/create-vendor.mjs ...` works end-to-end (verified in C9 Step 1).
- [ ] Acceptance #2: `node scripts/create-vendor-pack.mjs ...` works end-to-end (verified in C9 Step 2).
- [ ] Acceptance #3: Buyer can open a vendor pack via Apple Pay on iOS Safari (manual device test required), reveals three books, no Sell-back option. Card path verified in C9; Apple Pay path requires physical device + verified production domain.
- [ ] Acceptance #4: `vendor_payouts` row exists with 90/10 split (verified in C9 Step 4); Connect balance shows $27 vendor + $3 platform application fee (verified in C9 Step 5).
- [ ] Acceptance #5: Ruby bundle purchase no longer has Hold-to-Pay; uses Payment Element (verified in A4 Step 4).
- [ ] Acceptance #6: Hold-to-Open on house pack still works (manual regression test — open a house pack you have Rubies for, confirm the hold gesture still opens it).
- [ ] Acceptance #7: Apple Pay button renders on production for both checkout surfaces (manual test after domain verification per A1).

Phase 5 is done when all seven check.
