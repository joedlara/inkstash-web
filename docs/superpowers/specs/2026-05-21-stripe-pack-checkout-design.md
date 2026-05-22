# Stripe Pack Checkout & Buyback Economy — Design Spec

**Date:** 2026-05-21 (updated 2026-05-21 to add Rubies economy + Value Odds + Keep/Sell/Ship)
**Branch:** `stripe-checkout`
**Status:** Approved — building in phases

## Product model

Inkstash mirrors the Courtyard.io pack-opening economy with three reinforcing mechanics:

1. **Pack purchase** — pay with card or with Rubies (in-app currency). User reveals comics.
2. **Per-item disposition** — after reveal, each comic gets three choices:
   - **Keep digital** — stays vaulted in My Stash as a digital-only comic. Inkstash retains physical custody.
   - **Sell back (instant buyback)** — Inkstash buys it back at **90% of estimated value**, paid in Rubies. Item leaves user inventory.
   - **Ship print** — physical comic shipped to user's address. (Stubbed in v1; real ShipStation in a follow-up PR.)
3. **Value Odds disclosure** — pre-purchase modal shows three value-band tiers (e.g., `$0-10 → 80%`, `$10-20 → 18%`, `$20+ → 2%`) plus expected value. Backed by the buyback guarantee so the probability table is a real economic contract, not marketing.

### Currency: Rubies (♦)

- **Symbol/icon**: crimson ruby (matches Inkstash brand color)
- **Conversion**: $1 USD = **100 Rubies**, fixed
- **Earning**: only via instant-buyback (90% of estimated USD value × 100)
- **Spending**: pack purchases only (v1). Item purchases later.
- **Cash-out**: not allowed. Rubies are non-redeemable for USD.
- **Storage**: `users.ruby_balance` integer column. Always non-negative.

### Pack purchase paths

| Path | Triggered by | Backend |
|---|---|---|
| **Buy with Card** | "Buy Pack" button on a pack with active Stripe support | Stripe PaymentIntent → webhook creates `pack_purchases` row |
| **Buy with Rubies** | "Use Rubies" button (visible when `ruby_balance >= pack.price * 100`) | Edge Function: atomic `BEGIN; UPDATE users SET ruby_balance = ruby_balance - price_in_rubies WHERE id = X AND ruby_balance >= price_in_rubies; INSERT INTO pack_purchases; COMMIT;` |

Either/or, never hybrid. Buy-with-Rubies button disabled if balance insufficient.

## Goals (Phase 1 — this PR)

1. User clicks "Buy Pack" on a pack card → Inkstash-branded modal opens with a Stripe payment form.
2. User enters a card → clicks Pay → modal shows "Processing your pack..." → on success, routes to `/pack-reveal/:purchaseId`.
3. Stripe secret key never enters the client bundle. `VITE_STRIPE_SECRET_KEY` removed from `.env`. New `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set via `supabase secrets set`.
4. Webhook is the source of truth that creates the `pack_purchases` row. Frontend only confirms payment and polls for the row.
5. Idempotency: re-running the webhook for the same `payment_intent_id` does not create duplicate purchases. Re-opening `/pack-reveal/:purchaseId` does not re-roll cards.

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| **Phase 1 — Real Stripe** | Deploy `create-payment-intent` + `stripe-webhook` Edge Functions. Migration for `pack_purchases.stripe_payment_intent_id`. Flip `PackCheckoutModal mockMode={false}`. Test against Stripe test mode. | **Done** |
| **Phase 2a — Pack Detail Page** | New route `/packs/:packId`. Hero (cover + name + price + Open Pack CTA), Value Odds card, "What's inside" variant gallery. Delete `/pack-reveal/:purchaseId` route — reveal animation runs inline on the detail page after payment. No new backend. | **In progress** |
| **Phase 2b — Saved cards / one-tap open** | Stripe Customer per user. `setup_future_usage: 'on_session'` on the first PaymentIntent. Saved-payment-method storage. Detail page's "Open Pack" charges instantly if a card is on file (no modal); first-time users still see Stripe Elements. | After 2a |
| **Phase 3 — Rubies-only pack economy** | **Major pivot**: pack opens are now Rubies-only, no card at point of pack-open. Card is used only to buy Ruby bundles. Eliminates payment-failure UX from the pack-open loop. See "Phase 3 specifics" below. | After Phase 2b |
| **Phase 3.5 — Keep/Sell/Ship + Value Odds wiring** | Post-reveal Keep/Sell-back/Ship per item. Sell-back grants Rubies at 90% of estimated value. Value Odds bands sourced from `pack_items.estimated_value` per pack. Ship button stubbed. | After Phase 3 |
| **Phase 4 — Real ShipStation** | New Edge Function calling ShipStation API. Label generation, tracking webhook. Requires ShipStation account + API key. | Separate PR |

### Phase 2a specifics (this section of work)

**New route:** `/packs/:packId` (renders pack detail + handles inline reveal)

**Page sections (top → bottom):**
1. **Hero** — pack cover image (right), pack name + partner + price + item-count (left), single primary CTA `Open Pack` (crimson). On click, opens the existing Phase 1 PackCheckoutModal.
2. **Value Odds** — three value bands as a card: `$0-10 → 80%`, `$10-20 → 18%`, `$20+ → 2%` plus expected value footnote. In Phase 2a these are placeholder static bands; Phase 3 computes them from `pack_items.estimated_value`.
3. **What's inside** — responsive grid of every `pack_items` row for this pack. Tile shows cover image, comic title + issue number, rarity badge, estimated value, and ratio label (e.g., "1:50") if `quantity` is small. All variants visible to everyone (no locked silhouettes).

**Reveal flow on the detail page:**
1. User clicks `Open Pack` → existing checkout modal opens
2. Payment succeeds → modal closes → modal-side polling resolves a `purchaseId`
3. Hero + Value Odds + variant gallery fade/slide out (~250ms)
4. Inline reveal takes over: same flip-card mechanic from current `PackReveal.tsx`, rendered in-place
5. After all cards revealed: cards stay, summary fades in below
6. Footer CTAs: `Open Another Pack` (resets the page to pre-purchase state) + `Back to Packs`

**Routing changes:**
- **Add** `/packs/:packId` → renders `PackDetail` page
- **Update** `/packs` grid cards → navigate to `/packs/:packId` instead of opening the modal directly
- **Remove** `/pack-reveal/:purchaseId` route entirely. Existing reveal logic moves into `PackDetail`. The `PackReveal.tsx` file is deleted; the animation code is reused in the detail page.
- Past purchases remain queryable via the `pack_purchases` table; viewed from My Stash (no dedicated route).

**Backwards-compatibility note:** the modal's `navigate(\`/pack-reveal/\${purchaseId}\`)` after polling needs to change to `navigate(-1)` or trigger a state callback on the detail page. The cleanest model is: modal closes → emits `onPurchaseComplete(purchaseId)` callback → detail page swaps into reveal state.

**Out of scope for 2a:**
- Saved cards / one-tap open (that's 2b)
- 3D pack-opening animation (separate branch)
- Sell-back / Ship buttons on revealed cards (Phase 3.5)
- Rubies anywhere on the page (Phase 3)

### Phase 3 specifics — Rubies-only pack economy

**Why pivot:** Phase 1-2b shipped a working card-to-pack flow, but every pack open had a 1-3s Stripe round-trip + occasional failures (declines, 3DS, webhook delays). The Rubies-only model decouples *money* from *opens*: card → Rubies happens occasionally (Stripe involved), Rubies → packs happens constantly (local DB, instant).

**The new flow:**
- Cards are only charged to buy **Ruby bundles**
- Pack opens debit Rubies; no Stripe involvement at point of open
- If a user clicks Open Pack with insufficient balance, a Ruby bundle modal appears auto-selecting the smallest sufficient bundle

**Currency display:**
- Pack cards + detail page show pure Rubies, no USD
- Ruby balance pill always visible in the sidebar header
- Pack price computed at `Math.round(pack.price * 100)` (e.g. $14.99 → ♦1,499) for now; per-pack manual Ruby pricing comes later

**Ruby bundles (Stripe-side):**
| Tile | USD | Base Rubies | Bonus | Total |
|---|---|---|---|---|
| Starter | $4.99 | 499 | — | 499 |
| Popular | $9.99 | 999 | +201 (+20%) | 1,200 |
| Best Value | $24.99 | 2,499 | +1,001 (+40%) | 3,500 |
| Mega | $99.99 | 9,999 | +5,001 (+50%) | 15,000 |

**DB changes:**
```sql
ALTER TABLE users ADD COLUMN ruby_balance integer NOT NULL DEFAULT 0
  CHECK (ruby_balance >= 0);

CREATE TABLE ruby_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  delta integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bundle_purchase', 'pack_open', 'sellback', 'admin_adjustment')),
  stripe_payment_intent_id text,
  pack_purchase_id uuid REFERENCES pack_purchases(id),
  bundle_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Edge Function changes:**
- `create-payment-intent` rebranded conceptually: now takes `bundle_id`, looks up the bundle (hardcoded server-side constants for now), creates intent for the bundle USD price with `metadata.bundle_id` + `metadata.ruby_total`
- `stripe-webhook` rebranded: on `payment_intent.succeeded`, increments `users.ruby_balance` and inserts a `ruby_transactions` row (kind='bundle_purchase'). No longer touches `pack_purchases`.
- `charge-saved-card` rebranded: one-tap top-up. Same flow, charges for bundles instead of packs.
- **New `open-pack-rubies`** Edge Function: server-side atomic transaction debits Rubies, rolls items, inserts `pack_purchases` row, inserts `ruby_transactions` row (kind='pack_open'). Returns the rolled items.

**Frontend changes:**
- New `RubyBundleModal` component — four-tile bundle picker, reuses existing Stripe Elements/HoldToOpen flow under the hood
- New `paymentMethodsAPI` already supports the one-tap path; reuse for bundle purchases
- Pack cards show `♦N,NNN` instead of `$X.XX`
- PackDetail.tsx Open Pack: branches on balance — sufficient → `open-pack-rubies` direct; insufficient → open `RubyBundleModal` with the cheapest sufficient bundle pre-selected. After bundle purchase succeeds, modal closes and pack opens immediately.
- Sidebar header gets a Ruby balance chip (refreshes on every Ruby transaction)

## Non-goals (deferred even within Phase 3)

- Auction checkout (`CheckoutNew.tsx` wiring stays untouched)
- Apple Pay / Google Pay (Stripe Elements supports them; flip on later via PaymentMethod config)
- Refunds / dispute handling (manual via Stripe Dashboard)
- Webhook retry log table
- Coupons, promo codes, tax handling, multi-currency
- Edge Function unit tests (manual + Stripe Dashboard logs cover Phase 1)
- Ruby gifting / transfer between users
- Ruby expiration / decay
- Hybrid card+Ruby payment (always either/or)

## Architecture

```
Browser (React)
  Packs.tsx ──click──► PackCheckoutModal
                          │
                          │ 1. supabase.functions.invoke('create-payment-intent', { pack_id })
                          ▼
                       Stripe Elements (PaymentElement)
                          │
                          │ 2. stripe.confirmPayment({ redirect: 'if_required' })
                          ▼
                       Poll pack_purchases (1.5s × 20 attempts)
                          │
                          ▼
                       navigate('/pack-reveal/:purchaseId')

Supabase Edge Functions (Deno)
  create-payment-intent  ─► Stripe API ─► returns clientSecret
  stripe-webhook         ─► verifies signature ─► upserts pack_purchases
  open-pack (existing)   ─► called from /pack-reveal page

Postgres
  packs                  (read price / status for intent amount)
  pack_purchases         (webhook inserts here; RLS read-own)
  pack_items + user_inventory (open-pack populates these)
```

### New files

- `supabase/functions/create-payment-intent/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/migrations/20260521000000_add_stripe_payment_intent_to_pack_purchases.sql`
- `src/components/packs/PackCheckoutModal.tsx`
- `src/pages/PackReveal.tsx`
- `src/api/packCheckout.ts` (thin wrapper around `supabase.functions.invoke`)

### Modified files

- `src/pages/Packs.tsx` — "Buy Pack" button opens `PackCheckoutModal`
- `src/main.tsx` — add `/pack-reveal/:purchaseId` route
- `.env` — remove `VITE_STRIPE_SECRET_KEY`
- `supabase/functions/open-pack/index.ts` — minor: require `purchase_id` param, set `opened_at`

## Data flow

### Happy path

1. Click "Buy Pack" on `Packs.tsx` → opens `PackCheckoutModal` with `packId`.
2. Modal mounts → `supabase.functions.invoke('create-payment-intent', { body: { pack_id } })`.
3. `create-payment-intent` Edge Function:
   - Validates JWT via `userClient.auth.getUser()`
   - Reads `packs` row via service client: `id, price, status, remaining, name`
   - Rejects if `status !== 'active'` or `remaining <= 0`
   - Calls `stripe.paymentIntents.create({ amount: Math.round(price * 100), currency: 'usd', metadata: { pack_id, user_id }, automatic_payment_methods: { enabled: true } })`
   - Returns `{ clientSecret, paymentIntentId, amount }`
4. Modal renders `<Elements stripe={stripe} options={{ clientSecret }}>` wrapping `<PaymentElement />` + Pay button.
5. User submits → `stripe.confirmPayment({ elements, confirmParams: { return_url }, redirect: 'if_required' })`.
6. On `paymentIntent.status === 'succeeded'` → modal switches to polling state.
7. Stripe → webhook (async, ~100ms-2s): `stripe-webhook` verifies signature, switches on `event.type === 'payment_intent.succeeded'`, upserts `pack_purchases` with `onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true`, returns `200`.
8. Modal polls `pack_purchases` every 1.5s, up to 30s: `select('id').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle()`.
9. Row appears → modal closes → `navigate('/pack-reveal/:purchaseId')`.
10. `/pack-reveal` mounts → calls `open-pack` with `{ pack_id, purchase_id }` → reveals cards.

### Idempotency

Three layers:

1. **Stripe-side**: `paymentIntent.id` is unique; same client secret cannot be confirmed twice.
2. **Webhook-side**: `pack_purchases.stripe_payment_intent_id` has a `UNIQUE` partial index. Upsert with `ignoreDuplicates: true` means Stripe retries (on 5xx/timeout) are no-ops after the first success.
3. **Open-pack-side**: `pack_purchases.opened_at` is set when `open-pack` runs. Function checks `opened_at IS NULL` before assigning items; refreshing `/pack-reveal` shows existing items rather than re-rolling.

### Migration

`supabase/migrations/20260521000000_add_stripe_payment_intent_to_pack_purchases.sql`:

```sql
ALTER TABLE pack_purchases
  ADD COLUMN stripe_payment_intent_id text;

CREATE UNIQUE INDEX pack_purchases_stripe_payment_intent_id_key
  ON pack_purchases(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
```

Partial index so existing rows with `NULL` don't conflict.

## Error handling

| Failure | User sees | Behavior |
|---|---|---|
| `create-payment-intent` rejects pack (sold out / inactive) | Inline Alert: "This pack is no longer available." | Modal stays open with Close. No Stripe call made. |
| `create-payment-intent` throws (Stripe API down) | Inline Alert: "Couldn't start checkout. Please try again." | Retry button re-invokes the Edge Function. |
| Card declined | Stripe's inline error in `<PaymentElement>` plus Alert above the form | User edits card, retries. Same `clientSecret` reused. |
| 3DS challenge | Stripe handles modal/redirect itself | `redirect: 'if_required'` returns user to the same page after challenge. |
| Webhook slow (>30s poll timeout) | "Payment confirmed — preparing your pack" with "View Purchases" button | Money taken; route to `/purchases`. Row appears when webhook eventually fires. |
| Webhook signature verification fails | User unaffected | Function returns `400`. Stripe stops retrying after 400. Logged. |
| Webhook fires but DB insert fails | Same as slow-webhook from user POV | Function returns `500`. Stripe retries with backoff for up to 3 days. |
| User closes modal between confirm and webhook | They lose the modal | Purchase still completes via webhook. Appears in `/purchases` shortly. |
| `open-pack` fails after navigation | Reveal page shows error + "Retry opening" | Purchase row exists with `opened_at = NULL`. Retry is safe. |

**Critical UX decision:** the webhook is the source of truth, not the frontend. If the webhook never fires (unlikely), the user has been charged and we have no record. Mitigation: 30s poll is generous (webhooks normally arrive in <2s); if poll times out we route to `/purchases` with a sticky banner. A nightly reconciliation script is noted as a follow-up but not built here.

## Environment variables

### Removed
- `.env`: `VITE_STRIPE_SECRET_KEY` (was never read by `src/`; confirmed during audit)

### Added (Supabase secrets, not in .env)
- `STRIPE_SECRET_KEY` — `supabase secrets set STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET` — `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...` (obtained from Stripe Dashboard webhook config after deploying the function)

### Already present
- `VITE_STRIPE_PUBLIC_KEY` — publishable key, bundled into client (correct)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — frontend, bundled
- `SUPABASE_SERVICE_ROLE_KEY` — auto-available inside Edge Functions

## Testing

### Manual test plan (before merge)

**Test cards:**
- `4242 4242 4242 4242` — succeeds
- `4000 0027 6000 3184` — 3DS challenge
- `4000 0000 0000 9995` — declined (insufficient funds)

**Happy path:**
1. Sign in, go to `/packs`
2. Click "Buy Pack" on an active pack
3. Modal opens, Stripe PaymentElement renders
4. Enter `4242 4242 4242 4242`, any future expiry, any CVC, any zip
5. Click Pay → loading → "Processing your pack..."
6. Within ~3s, navigates to `/pack-reveal/:purchaseId`
7. Reveal animation runs, `user_inventory` rows visible in Supabase
8. `pack_purchases` row exists with `stripe_payment_intent_id` populated and `opened_at` set

**3DS:** as above with `4000 0027 6000 3184`; Stripe modal pops up; click Complete authentication; flow continues.

**Decline:** as above with `4000 0000 0000 9995`; PaymentElement shows inline error; edit to `4242...`, retry; succeeds with original `clientSecret`; no duplicate `pack_purchases` row.

**Webhook idempotency:**
1. Complete a purchase
2. Stripe Dashboard → Webhooks → Events → find the `payment_intent.succeeded` event → Resend
3. Verify still exactly one `pack_purchases` row for that `payment_intent_id`

**Pack-reveal idempotency:**
1. Complete a purchase, land on `/pack-reveal/:id`
2. Note the cards
3. Hard refresh
4. Same cards appear. `pack_purchases.opened_at` unchanged.

**Sold-out edge:**
1. `UPDATE packs SET remaining = 0 WHERE id = '<test_id>'`
2. Click Buy Pack
3. Inline Alert: "This pack is no longer available." No Stripe charge.

**Auth boundary:**
1. Sign out
2. Navigate directly to `/pack-reveal/:id` → redirected to login (existing route guard).

### Verification commands

```bash
supabase functions logs create-payment-intent --tail
supabase functions logs stripe-webhook --tail
supabase db diff
```

### Not tested in this PR

- Unit tests for Edge Functions (Deno test runner setup out of scope)
- Load testing
- Webhook replay attacks beyond signature check
- Stripe API outage (chaos testing)

## Open questions / follow-ups

- Nightly reconciliation script for missing webhook rows (separate PR)
- Refund button in admin UI (separate PR)
- Auction checkout wiring to use same Edge Functions (separate PR — refactor `CheckoutNew.tsx`)
- Reference price source for Value Odds bands — computed from `pack_items.estimated_value` weighted by rarity, or set per-pack manually? (decide in Phase 3)
- Ruby visual design — icon SVG, balance pill in sidebar, animation when balance increases after sell-back (Phase 3)
- ShipStation account + API key procurement (Phase 4 blocker)
- Anti-abuse: rate limit Buy-with-Rubies to prevent rapid spend loops if estimated_value is mis-set on a pack (Phase 3)
