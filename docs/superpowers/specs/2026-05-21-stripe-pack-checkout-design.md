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
| **Phase 1 — Real Stripe** | Deploy `create-payment-intent` + `stripe-webhook` Edge Functions. Migration for `pack_purchases.stripe_payment_intent_id`. Flip `PackCheckoutModal mockMode={false}`. Test against Stripe test mode. | **In progress** |
| **Phase 2 — Saved cards** | Add `setup_future_usage: 'on_session'` to PaymentIntent creation. "Use saved card" path in modal: if user has a default payment method, show one-click confirm; otherwise show full Elements form. Stripe Customer object lifecycle. | Next |
| **Phase 3 — Rubies + Keep/Sell/Ship + Value Odds** | DB: `users.ruby_balance`, `user_inventory` table, `pack_purchases.value_band_*` cols. Post-reveal three-button UI. Ruby wallet in sidebar. Pre-purchase Value Odds modal. "Buy with Rubies" alternate checkout path. Ship button stubbed (DB flag only). | After Phase 2 |
| **Phase 4 — Real ShipStation** | New Edge Function calling ShipStation API. Label generation, tracking webhook. Requires ShipStation account + API key. | Separate PR |

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
