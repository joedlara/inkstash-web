# Phase 1 Stripe Deployment Runbook

This is the live deployment + test runbook for Phase 1 of the Stripe pack-checkout work. Code is committed on branch `stripe-checkout`. Once you complete these steps, real card payments will work end-to-end against Stripe test mode.

---

## Pre-flight

You'll need:
- Stripe test-mode keys (you said you already have them in `.env`)
- Supabase CLI logged in to the hosted project (`supabase login`)
- ~10 minutes

---

## Step 1 — Set Supabase secrets

The Edge Functions need `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. We do **not** put these in `.env` — they go to Supabase secrets so they live server-side only.

```bash
# Grab your sk_test_... value from the existing .env (or Stripe Dashboard → Developers → API keys)
supabase secrets set STRIPE_SECRET_KEY=sk_test_REPLACE_ME

# We'll set the webhook secret in Step 4 after we know the webhook URL.
```

Verify:
```bash
supabase secrets list
```

You should see `STRIPE_SECRET_KEY` in the list.

---

## Step 2 — Apply the DB migration

```bash
supabase db push
```

This applies `20260521000000_add_stripe_payment_intent_unique_index.sql` which adds the unique partial index on `pack_purchases.stripe_payment_intent_id`. Idempotent — safe to run multiple times.

Verify in Supabase Studio → Database → Indexes → search "stripe_payment_intent" — should see one entry.

---

## Step 3 — Deploy the two new Edge Functions

```bash
# create-payment-intent — requires JWT (authenticated user)
supabase functions deploy create-payment-intent

# stripe-webhook — NO JWT (Stripe sends signature instead of a Supabase token)
supabase functions deploy stripe-webhook --no-verify-jwt

# Also redeploy open-pack since we changed its insert/update logic
supabase functions deploy open-pack
```

Note the URLs that get printed. They'll look like:
```
https://uhstjindafnvlrjkpggx.supabase.co/functions/v1/create-payment-intent
https://uhstjindafnvlrjkpggx.supabase.co/functions/v1/stripe-webhook
```

---

## Step 4 — Register the webhook in Stripe Dashboard

1. Open [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **Add endpoint**
3. **Endpoint URL**: paste the `stripe-webhook` URL from Step 3
4. **Events to send**: choose `payment_intent.succeeded` only (you can add more later)
5. Click **Add endpoint**
6. On the resulting page, click **Reveal** under "Signing secret" — copy the `whsec_...` value
7. Back in terminal:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
```

8. Redeploy the webhook function so it picks up the new secret:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## Step 5 — Clean up `.env`

`VITE_STRIPE_SECRET_KEY` should be **removed** from `.env`. Vite would otherwise bundle it into the client JS, exposing your secret key to anyone who views source.

Open `.env` and delete the line starting with `VITE_STRIPE_SECRET_KEY=...`.

Keep these (they're correct):
- `VITE_STRIPE_PUBLIC_KEY=pk_test_...`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `SUPABASE_SECRET_KEY=...` (your server-side scripts use this; not bundled by Vite)

**Important**: rotate the previously-exposed secret key. Stripe Dashboard → Developers → API keys → "Roll" next to the test secret key. Then update Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_NEW_VALUE
supabase functions deploy create-payment-intent  # pick up new secret
```

---

## Step 6 — Live test

Restart your local dev server so it loads the new `.env`:
```bash
npm run dev
```

In the browser:
1. Sign in
2. Navigate to `/packs`
3. Click **Buy Pack** on an active pack
4. Modal opens with the **real Stripe PaymentElement** (not the mock form)
5. Enter test card: `4242 4242 4242 4242`, any future expiry (e.g. `12/28`), any 3-digit CVC, any 5-digit zip
6. Click **Pay now**
7. Watch the modal: "Confirming payment..." → "Preparing your pack..." → "Done. Opening pack..."
8. Should route to `/pack-reveal/:purchaseId` and the flip-card animation should play

While testing, watch logs in two other terminal tabs:
```bash
supabase functions logs create-payment-intent --tail
supabase functions logs stripe-webhook --tail
```

---

## Verification queries

After a successful test purchase, verify in Supabase Studio SQL editor:

```sql
-- One row per purchase, both fields populated
SELECT id, user_id, pack_id, stripe_payment_intent_id, revealed_at, jsonb_array_length(items_received) as item_count
FROM pack_purchases
ORDER BY created_at DESC
LIMIT 5;
```

`stripe_payment_intent_id` should match the `pi_...` ID shown in Stripe Dashboard → Payments. `item_count` should equal the pack's `item_count`.

---

## Test card matrix

| Card | Behavior | Expected outcome |
|---|---|---|
| `4242 4242 4242 4242` | Succeeds | Reveal happens normally |
| `4000 0027 6000 3184` | 3DS challenge | Stripe modal pops up; click "Complete authentication"; reveal happens |
| `4000 0000 0000 9995` | Declined (insufficient funds) | Inline error in PaymentElement; user can edit card and retry |
| `4000 0000 0000 0341` | Succeeds, then dispute | Reveal happens normally; chargeback appears in Stripe Dashboard later |

---

## Idempotency tests

### Webhook idempotency
1. Complete a purchase
2. Stripe Dashboard → Webhooks → click your endpoint → Events tab
3. Find the `payment_intent.succeeded` event → click **Resend**
4. Run the verification query — should still be exactly one row

### Reveal idempotency
1. Complete a purchase, land on `/pack-reveal/:id`, see the cards
2. Hard refresh the page (Cmd+Shift+R)
3. Same cards should reappear, not new ones
4. Query: `SELECT revealed_at FROM pack_purchases WHERE id = '...'` — timestamp unchanged

---

## Troubleshooting

**"create-payment-intent" returns 500 "STRIPE_SECRET_KEY not configured"**
→ You skipped Step 1 or set it on the wrong project. Run `supabase secrets list` to confirm.

**"stripe-webhook" returns 400 "Invalid signature"**
→ The `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint's signing secret. Re-copy from Stripe Dashboard and redo Step 4 steps 6-8.

**Modal hangs on "Preparing your pack..."**
→ Webhook may not be firing. Check:
   - Stripe Dashboard → Webhooks → your endpoint → click into recent events to see delivery attempts
   - `supabase functions logs stripe-webhook --tail` — should show event arriving

**Pack reveal page shows zero cards**
→ The `open-pack` Edge Function may not have been redeployed in Step 3. Redeploy it.

**Modal shows mock-mode banner instead of Stripe form**
→ `mockMode` wasn't flipped to `false`. Check `src/pages/Packs.tsx` — the `<PackCheckoutModal>` should not pass `mockMode` (defaults to `false` now).

---

## Done with Phase 1

Once you've verified the happy path + at least one idempotency test, Phase 1 is done. The system is now processing real (test-mode) payments end-to-end.

Next up: **Phase 2 — Saved cards**.
