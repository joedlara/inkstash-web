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
