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

---

# PayPal (deferred)

PayPal as a Stripe Payment Element method requires Stripe → PayPal account linking through Stripe's PayPal integration setup (not a single dashboard toggle). Deferred from Phase 5 MVP. When you're ready to add it: investigate Stripe's PayPal Connect docs and add it as a separate task. The `automatic_payment_methods: { enabled: true }` setting will surface it automatically once it's enabled on the account.

# Resend email confirmations

USD transactions in Phase 5 (Ruby bundles + vendor packs) trigger a confirmation email via Resend. Existing functions in `supabase/functions/send-*` follow the same pattern; the new ones (Task A6, Task C11) follow that same shape.

The Resend API key is already configured: `VITE_RESEND_API_KEY` secret on the Supabase Functions environment. No new secret to provision.

---

# Vendor pack ship-from address (manual workflow until in-app label generation lands)

Vendor pack books ship from the vendor's address, not InkStash's. The `vendor_ship_from_addresses` table (migration `20260527000000`) holds these addresses. RLS allows each vendor to manage their own rows.

## Pre-launch: each vendor must have a default ship-from address

For every vendor (including the launch partner), insert at least one row in `vendor_ship_from_addresses` with `is_default = true`:

```sql
INSERT INTO public.vendor_ship_from_addresses
  (vendor_id, name, company_name, street1, city, state, postal_code, is_default)
VALUES
  ('<vendor uuid>', 'Vendor Owner Name', 'Vendor Brand', '123 Real St',
   'Brooklyn', 'NY', '11201', true);
```

(Get the vendor uuid via `SELECT id, handle FROM public.vendors WHERE handle = 'their_handle';`.)

## When a buyer requests shipping on a vendor pack item

1. `request-ship-item` edge function flips the `user_inventory` row to `shipping_pending`.
2. InkStash admin checks the queue (currently: query `SELECT * FROM public.user_inventory WHERE status = 'shipping_pending'` — there is no UI yet).
3. For each `shipping_pending` item: trace `inventory.pack_purchase_id → pack_purchase.pack_id → pack.vendor_id → vendor_ship_from_addresses` to get the ship-from address.
4. Email the vendor with the buyer's ship-to address and ask the vendor to generate + print the label.
5. Once shipped, manually flip `user_inventory.status = 'shipping_in_transit'` and record the tracking number.

This workflow is a stopgap until the in-app label generation feature lands (see backlog task: "In-app label generation for vendor/inventory ship"). The future flow will let vendors purchase labels directly through InkStash via ShipEngine, similar to how eBay sellers print labels through the eBay UI.

---

# Tax obligations (PRE-LAUNCH TODOs)

InkStash is a marketplace facilitator. Two separate tax obligations apply, handled in different ways:

## 1. Vendor income tax reporting (Form 1099-K) — handled automatically by Stripe Connect

When a vendor crosses the IRS reporting threshold in a calendar year (currently **$2,500 gross payments per vendor in 2026**), Stripe Connect Express **automatically files Form 1099-K with the IRS and sends a copy to the vendor**. No work for InkStash beyond the standard Connect Express onboarding (Task B5), which already collects the vendor's tax ID (SSN/EIN) and W-9 information as part of Stripe's KYC.

**Verification:** in the Stripe Dashboard → Connect → Tax forms, you can preview which connected accounts are on track to receive a 1099-K.

## 2. Sales tax on buyer purchases — InkStash collects, NOT yet wired

Under marketplace facilitator laws (passed in all 50 states post-Wayfair, 2018-2022), **InkStash as the marketplace is the legal collector and remitter of sales tax** on every vendor pack sale, even though the vendor ships the book. The buyer's address determines the tax rate (destination-based in most states).

The Phase 5 code intentionally does NOT enable `automatic_tax` on vendor pack PaymentIntents at launch — vendor packs ship without tax during the MVP phase. This is a deliberate operational decision, not an oversight. Tax goes live as a second step after the registrations below.

**Pre-launch checklist (before any vendor pack ships at non-trivial volume):**

1. Register InkStash with the home state's Department of Revenue as a **marketplace facilitator**. Most states have a single online form, no fee. This gives InkStash a sales tax permit and a remittance obligation.
2. Register InkStash with **Stripe Tax** in the Stripe Dashboard (Settings → Tax). Enter the home state registration first.
3. As economic nexus is crossed in other states (typically **$100,000/year in sales OR 200 transactions per state**), register in those states too. Stripe Tax can monitor and alert when nexus is approaching in a state.
4. Once registered: re-enable `automatic_tax: { enabled: true }` on the vendor_pack branch of `supabase/functions/create-payment-intent/index.ts`. The comment in that file explains exactly where to add the line.
5. Verify tax appears on a test-mode vendor pack PaymentIntent before flipping to production.

**Sales tax permit cadence:** sales tax filings are typically monthly or quarterly. Stripe Tax can generate the filing reports automatically — operator submits and remits.

## Vendors do NOT charge sales tax themselves on vendor pack sales

This is the most important consequence of the marketplace facilitator model: the vendor's existing sales tax flow on their personal store does NOT apply when they sell through InkStash. Communicate this clearly when onboarding the launch partner — their own bookkeeper should exclude InkStash sales from their state sales tax filings. The 1099-K they receive is informational only for income tax purposes (federal/state income tax, paid by the vendor at year-end).
