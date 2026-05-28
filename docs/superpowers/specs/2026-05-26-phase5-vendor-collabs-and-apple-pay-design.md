# Phase 5 — Vendor Collabs & Apple Pay Design Spec

**Date:** 2026-05-26
**Branch (anticipated):** `phase5-vendor-collabs`
**Builds on:** Phase 3 (Rubies + house packs), Phase 3.5 (Keep/Sell/Ship), Phase 4 (Live Drops & Raffles), Phase 3.5b (economy rebalance)
**Out of scope for this phase:** publisher-direct packs (deferred — no distributor relationships yet), CGC/PSA grading pipeline (deferred — idea-stage only), marketplace listings (Phase 6+).

---

## Overview

Phase 5 introduces a second product line that lives alongside the existing house pack economy: **vendor-collab packs**. These are real-money (USD), real-product purchases co-curated with named partner vendors (initially one launch partner) who carry their own inventory and brand. The phase also rolls out Apple Pay + Google Pay everywhere InkStash takes USD, via a centralized Stripe Payment Element wrapper.

Two coherent products under one roof after this phase:

1. **InkStash the casino** (house packs) — Rubies, buyback, gamified, low-stakes, instant-feedback loop. Unchanged.
2. **InkStash the curation marketplace** (vendor packs) — USD, no buyback, premium curated bundles from named partner vendors, ship-to-vault or ship-to-user. New.

Both share the same pack-opening engine, the same reveal animation, the same inventory and shipping flows, the same Apple Pay checkout. The differences are surfaced through `packs.origin` and a small set of conditional UI rules.

---

## Competitive Positioning

This phase is informed by analysis of three competitors actively promoted on TikTok:

| | Rips by Triumph | Courtyard.io | Boxed.gg | InkStash post-Phase 5 |
|---|---|---|---|---|
| Category | TCG (Pokémon-heavy) | TCG (graded slabs) | TCG + CS2 skins | **Comics** |
| Pack source | House-curated only | House + P2P marketplace | House-curated only | **House + named vendor collabs** |
| Buyback | 100% FMV (forced 7-day window) | 90% FMV, 7-day window, free vault | Gems → PayPal vouchers, ~5% mark-up | House: 90% via Rubies. Vendor: none. |
| Odds transparency | Vague ("up to $10,000") | Per-pack drop tables | Public odds + provably-fair | Value Odds bands (live) + chase gallery (new) |
| Apple Pay | No | Yes | Yes | **Yes (new)** |
| Vendor collabs | None | None | None (Shroud sponsored streams only) | **Named partners w/ 90/10 split, Stripe Connect payouts (new)** |

**The edge:** Nobody else is doing co-branded blind bag packs with named partner vendors who carry their own inventory. The competitors are all house-curated. Combined with the comic niche (also unique) and the existing live-streaming roadmap (Phase 4), this is a defensible position.

---

## Section 1: Pack Origins & Vendors

### `packs.origin` enum

Add a new column to the existing `packs` table:

```sql
CREATE TYPE pack_origin AS ENUM ('house', 'vendor', 'publisher');
ALTER TABLE packs ADD COLUMN origin pack_origin NOT NULL DEFAULT 'house';
ALTER TABLE packs ADD COLUMN vendor_id uuid REFERENCES vendors(id);
ALTER TABLE packs ADD COLUMN value_lock boolean NOT NULL DEFAULT false;
```

Semantics:

- **`house`** — InkStash-curated. Existing behavior unchanged. Uses Rubies. Has buyback. Runs through the economy solver. `vendor_id` is null. `value_lock = false`.
- **`vendor`** — Co-curated with a named partner. Uses USD via Stripe. No buyback (vendor keeps that revenue line via their own brand). `vendor_id` is set. `value_lock = true` (the validator enforces that contents sum to pack price; the solver does not run).
- **`publisher`** — Reserved for future use (sealed Marvel/DC/Boom publisher product sourced via InkStash distributor relationships). **Not built in Phase 5.** Enum value exists so we don't have to migrate later.

### `vendors` table (new)

```sql
CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,           -- "BigTime Comics"
  handle text UNIQUE NOT NULL,          -- "@bigtimecomics"
  avatar_url text,
  bio text,
  is_publisher boolean NOT NULL DEFAULT false, -- true for partners who print exclusive variants
  commission_rate numeric(4,3) NOT NULL DEFAULT 0.300 CHECK (commission_rate BETWEEN 0 AND 1),
  stripe_connect_account_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','offboarded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendors_user_id_idx ON vendors(user_id);
CREATE INDEX vendors_handle_idx ON vendors(handle);
```

- `commission_rate` is **InkStash's cut**, expressed as a decimal: 0.10 = InkStash keeps 10%, vendor keeps 90%. Default is 0.30 (70/30 vendor/InkStash), but the launch partner gets 0.10 set at onboarding.
- `is_publisher = true` flags vendors who print their own exclusive covers (like the launch partner). Surfaces a "Publisher exclusive" badge on every pack from them; the curator's-note copy can lean on it.
- `stripe_connect_account_id` is set during Stripe Connect Express onboarding (see Section 4). Required before any pack from this vendor can go `active`.

### `pack_revenue_splits` table (new)

Snapshots the split at pack-creation time so changing a vendor's default `commission_rate` later does not retroactively change earlier packs.

```sql
CREATE TABLE pack_revenue_splits (
  pack_id uuid PRIMARY KEY REFERENCES packs(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  vendor_cut numeric(4,3) NOT NULL CHECK (vendor_cut BETWEEN 0 AND 1),
  inkstash_cut numeric(4,3) NOT NULL CHECK (inkstash_cut BETWEEN 0 AND 1),
  CHECK (vendor_cut + inkstash_cut = 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

A row is inserted when a vendor pack moves from `upcoming` → `active`. The values are copied from `vendors.commission_rate` at that moment.

### `vendor_payouts` table (new)

Records each Stripe Connect transfer for accounting and a future vendor dashboard.

```sql
CREATE TABLE vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  pack_purchase_id uuid NOT NULL REFERENCES pack_purchases(id),
  pack_id uuid NOT NULL REFERENCES packs(id),
  gross_amount_cents integer NOT NULL,         -- buyer paid
  vendor_amount_cents integer NOT NULL,        -- vendor's cut
  inkstash_amount_cents integer NOT NULL,      -- application fee
  stripe_transfer_id text,                      -- transfer record on Stripe
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vendor_payouts_vendor_id_idx ON vendor_payouts(vendor_id);
```

Stripe Connect destination charges handle the actual money movement; this table is our local source of truth for who got paid what.

---

## Section 2: Vendor-Collab Variable-Payout Packs

### Product model

A vendor pack is a curated bundle of comics from a named partner. The launch use case: the partner commissions exclusive cover variants for an existing comic (e.g., Transformers #25 with art by four different artists, plus signed and remarked treatments of some), then bundles three books per pack at $150.

**Key contract for the buyer:**

- Pay $150, receive three books whose declared values sum to $150 (the guarantee).
- Small probability of pulling a chase variant (signed cover, remarked blank cover) worth substantially more — the chase is on **cover treatment**, not on rarity tier.
- USD only. No Rubies. No buyback. Books vault → ship to buyer.
- Inventory belongs to the vendor; InkStash facilitates the listing, the pack-opening UX, payment processing, and shipping logistics.

**Why this works (not arbitrageable):**

The books in a vendor pack are **exclusives that don't exist on the open market** — the vendor commissioned them and owns the print run. There is no eBay-cheaper alternative. The "fair value" is the vendor's own SRP for these same books sold individually in their store (typically $50-$60/book for small-press exclusives). The pack is priced at the sum of those SRPs; the chase variants are the upside.

### Cover treatment as rarity

For vendor packs, the rarity dimension is **cover treatment**, not the abstract common/rare/legendary used for house packs. Add to `pack_items`:

```sql
CREATE TYPE cover_treatment AS ENUM ('cardstock', 'foil', 'signed', 'remarked');
ALTER TABLE pack_items ADD COLUMN cover_treatment cover_treatment;
ALTER TABLE pack_items ADD COLUMN declared_value numeric(10,2);
```

- `cover_treatment` is nullable; it's only set for `pack.origin = 'vendor'` items. House pack items leave it null.
- `declared_value` is the vendor's stated SRP for the book. Used by the sum-to-pack-price validator and shown in the UI. House packs continue to use `estimated_value` (which is solver-derived); vendor packs use `declared_value` (which is vendor-set). This avoids confusing the two value sources.
- `is_chase` (existing column) is set true for `signed` and `remarked` treatments — they're the chase tier. Cardstock and foil are not chase.

### Validator (instead of solver)

Vendor packs don't run through `scripts/recalc-pack-item-values.mjs`. Instead, a validator runs at pack-activation time:

```typescript
// pseudocode for the activation check
function validateVendorPack(pack: Pack): ValidationResult {
  if (pack.origin !== 'vendor') return { ok: true };
  if (!pack.value_lock) return { ok: false, error: 'vendor packs must have value_lock=true' };

  const nonChaseItems = pack.items.filter(i => !i.is_chase);
  const guaranteedValue = sum(nonChaseItems.map(i => i.declared_value));
  const slotCount = pack.item_count;

  // If a 3-pack draws 3 of N non-chase items at random and each is declared at SRP,
  // the expected guaranteed-only pull value should equal pack.price.
  // The constraint: average declared_value of non-chase items × slot_count = pack.price.
  const avgNonChase = guaranteedValue / nonChaseItems.length;
  const expectedGuaranteed = avgNonChase * slotCount;

  if (Math.abs(expectedGuaranteed - pack.price) > 0.01) {
    return {
      ok: false,
      error: `non-chase items must average $${pack.price / slotCount}/each (got $${avgNonChase})`,
    };
  }

  // Stripe Connect must be set up before activation
  if (!pack.vendor.stripe_connect_account_id) {
    return { ok: false, error: 'vendor must complete Stripe Connect onboarding' };
  }

  return { ok: true };
}
```

The validator is invoked from the admin tooling when flipping a pack `upcoming → active` and from the edge function that creates the PaymentIntent (defense in depth, in case admin tooling is bypassed). For Phase 5, pack creation is manual (SQL or admin script run by you); vendor self-serve pack creation is Phase 6+.

### PackDetail for vendor packs

The existing `src/pages/PackDetail.tsx` gets a conditional rendering branch based on `pack.origin`. New blocks for `origin = 'vendor'`:

1. **Vendor header strip** (replaces partner text) — vendor avatar + handle + "Publisher exclusive" badge (if `is_publisher`). Clickable to vendor profile (Phase 5 ships a stub profile page; full profile is Phase 6).
2. **Curator's note** — a `packs.curator_note text` field (new column), vendor-authored, 2-4 sentences. "I commissioned these covers from [artists] because the Transformers anniversary issues are a long-term hold." Sits below the vendor header.
3. **"What's in the pack"** (replaces Value Odds bands) — visual grid of every distinct cover-art × treatment combination in the pack. Each card shows: cover art thumbnail, artist name, treatment chip (Cardstock / Foil / Signed / Remarked), and the probability of pulling that specific item (computed from `pack_items` counts).
4. **Pack contents guarantee row** — single line: "Guaranteed: 3 books, $150 in value. Chase chance: 4% (signed) + 1% (remarked)."
5. **Reveal section** — unchanged from house packs. Same FlipCard, same `CardDispositionRow`, but:
   - The **Sell-back** button is hidden on every disposition row when the source pack was `origin = 'vendor'`. Only Keep and Ship show.
   - The reveal animation, the count-up, the rarity-tier flash all stay identical to house packs. The buyer experience of *opening* is consistent across origins; only the post-pull options differ.

### Optional: Sealed-collectible flag

Add `packs.is_sealed_collectible boolean DEFAULT false`. Most packs leave it false. When true, the pack tile in the catalog grid gets a "Sealed Collectible" badge and the buyer flow offers a "Keep sealed (don't open)" option at checkout. Sealed packs go straight to the user's inventory as an `inventory.status = 'sealed'` item, eligible for future marketplace listing as collectibles in their own right.

For Phase 5 we add the column and the badge, but the "keep sealed" checkout path is a stretch goal — only build it if there's time after the core vendor pack flow ships. The launch partner has not asked for it.

---

## Section 3: Apple Pay & Google Pay Everywhere (in scope for Phase 5)

### Surfaces

Two checkout surfaces use Apple Pay + Google Pay + card after Phase 5:

1. **Ruby bundle purchase** — exists today as Stripe Card-only. Migrated to Stripe Payment Element.
2. **Vendor pack checkout** — new. Stripe Payment Element from day one, with Stripe Connect destination charges.

**Out of scope:** publisher pack checkout (publisher origin not built in Phase 5), marketplace checkout (Phase 6+), grading fee (deferred).

**Hold-to-Pay** (the gesture from Phase 2 that confirmed an off-session card charge by holding a button): **removed** from Ruby bundle purchase. Replaced with the Payment Element's native tap-to-confirm (Apple Pay biometric, Google Pay tap, or "Pay $X" button for card). Apple Pay's tap-to-confirm is faster than the hold gesture was anyway.

**Hold-to-Open** (the gesture that opens a Ruby-paid house pack on the PackDetail page): **kept exactly as-is.** This is a pack-opening gesture, not a payment confirmation — the user already owns the Rubies and is triggering the open-pack edge function. It's the tactile center of the house pack experience.

### `StripePaymentElement` wrapper component

One shared component:

```typescript
// src/components/checkout/StripePaymentElement.tsx
interface Props {
  amount: number;                          // in cents
  currency: 'usd';
  paymentType: 'ruby_bundle' | 'vendor_pack';
  metadata: Record<string, string>;        // forwarded to the PaymentIntent
  connectAccountId?: string;               // only for vendor_pack
  applicationFeeAmount?: number;           // only for vendor_pack, in cents
  onSuccess: (paymentIntentId: string) => void;
  onError: (err: Error) => void;
}
```

Internally:

1. On mount, POST to a unified edge function `create-payment-intent` with the props.
2. The edge function creates a Stripe PaymentIntent with `automatic_payment_methods: { enabled: true }` (which auto-shows Apple Pay, Google Pay, Link, and card based on device support). For vendor packs, it also sets `transfer_data: { destination: connectAccountId }` and `application_fee_amount: applicationFeeAmount`.
3. Returns the `client_secret` and `paymentIntentId`.
4. Component mounts the Stripe Payment Element with the `client_secret`.
5. On confirm, calls `stripe.confirmPayment()`. On success, calls `onSuccess` with the PaymentIntent id.
6. Buyer-facing flow then redirects to a confirmation page or (for vendor packs) directly into the reveal sequence.

The existing `create-ruby-bundle-checkout` and `create-pack-checkout` edge functions are consolidated into this one `create-payment-intent` function. The webhook handler routes the post-payment action based on `paymentIntent.metadata.payment_type`:

- `ruby_bundle` → credit Rubies via `credit_rubies_and_record_purchase` RPC
- `vendor_pack` → call the existing `open-pack-rubies` logic adapted for USD (a new `open-pack-usd` edge function — pack-opening logic is the same, the difference is no Ruby debit and a `vendor_payouts` row insertion)

### Stripe Connect Express onboarding for vendors

When a new vendor is created (initially via admin tooling, Phase 6 will add self-serve onboarding):

1. Call Stripe API to create a Connect Express account. Store the `id` on `vendors.stripe_connect_account_id`.
2. Generate an account link with the Stripe API and email it to the vendor (or display it in the admin tool for copy-paste).
3. Vendor clicks the link, completes Stripe-hosted KYC + bank verification (~5 minutes).
4. Stripe webhook (`account.updated`) fires when onboarding completes. Our handler flips `vendors.status` from `pending` to `active`.
5. No vendor pack can be activated until `status = 'active'`.

### Apple Pay domain verification

One-time setup task:

1. In the Stripe dashboard, register the production domain (e.g., `inkstash.app`) for Apple Pay.
2. Stripe provides a verification file. Host it at `https://inkstash.app/.well-known/apple-developer-merchantid-domain-association`.
3. Repeat for any preview/staging domains (Vercel preview URLs need this too if we want Apple Pay to render in test).

Without this, the Apple Pay button silently won't render on production. Document the steps in the implementation plan as an explicit checklist item.

### Stripe Tax

Enable `automatic_tax: { enabled: true }` on every PaymentIntent created by `create-payment-intent`. Stripe Tax handles US sales tax calculation based on the buyer's billing address.

- For **vendor packs**, tax applies to the vendor (it's their sale; InkStash is the platform). Stripe Connect destination charges with `automatic_tax` route this correctly.
- For **Ruby bundle purchases**, tax applies to InkStash.

Stripe Tax requires a one-time enable in the Stripe dashboard with tax registration in each state where InkStash and the vendor have nexus. For launch, registering in InkStash's home state and the launch vendor's home state is enough; expand as the business grows.

---

## Section 4: UI/UX changes summary

| Surface | Change | Origin filter |
|---|---|---|
| `/packs` catalog grid | Add filter pills: All / House / Vendor. Vendor pack tiles get vendor handle + avatar in the tile chrome. | All packs |
| `src/pages/PackDetail.tsx` | Conditional rendering branch for `origin = 'vendor'` (see Section 2). | Vendor packs only |
| `src/components/packs/CardDispositionRow.tsx` | Hide Sell-back button when `pack.origin = 'vendor'`. Keep + Ship only. | Vendor packs only |
| `src/components/packs/RubyBundleModal.tsx` (existing) | Replace Hold-to-Pay button with `<StripePaymentElement>` wrapper. | Ruby bundle |
| `src/pages/CheckoutVendorPack.tsx` (new) | New page wired to `<StripePaymentElement>` with Connect routing. Replaces the Hold-to-Open entry on PackDetail for vendor packs — buyer clicks "Buy with USD" → goes to this checkout → on success redirects back to PackDetail's reveal mode. | Vendor packs only |
| Home page Packs section | No structural change. Vendor packs flow into the same Pack tile component, distinguished by vendor handle in the tile. | All packs |
| Admin (out of repo for now) | One-off admin scripts in `scripts/` for: creating a vendor, creating a vendor pack, running the validator, generating a Connect onboarding link. Vendor self-serve UI is Phase 6+. | n/a |

---

## Section 5: File map

### New files

| File | Purpose |
|---|---|
| `supabase/migrations/20260526000000_create_vendors_and_pack_origins.sql` | `pack_origin` enum, `packs.origin/vendor_id/value_lock/curator_note/is_sealed_collectible` columns, `vendors` table, `pack_revenue_splits` table, `vendor_payouts` table, `cover_treatment` enum, `pack_items.cover_treatment/declared_value` columns, RLS policies. |
| `supabase/functions/create-payment-intent/index.ts` | Unified PaymentIntent creation, replaces `create-ruby-bundle-checkout` and `create-pack-checkout`. Handles both Ruby bundle and vendor pack with Connect routing. |
| `supabase/functions/stripe-webhook/index.ts` | (Modify if exists, create if not.) Routes `payment_intent.succeeded` by `metadata.payment_type` and `account.updated` for vendor onboarding completion. |
| `supabase/functions/open-pack-usd/index.ts` | Vendor pack opening. Same draw logic as `open-pack-rubies` but no Ruby debit; inserts `vendor_payouts` row instead. Triggered by webhook after Stripe payment succeeds (not by client direct call). |
| `src/components/checkout/StripePaymentElement.tsx` | Shared Payment Element wrapper. Apple Pay + Google Pay + card via `automatic_payment_methods`. |
| `src/pages/CheckoutVendorPack.tsx` | Vendor pack checkout page. |
| `src/api/vendors.ts` | Vendor CRUD client (mostly admin-side for Phase 5; user-facing reads for vendor profile). |
| `scripts/create-vendor.mjs` | Admin script: create vendor row + Stripe Connect account + return onboarding link. |
| `scripts/validate-vendor-pack.mjs` | Admin script: run the validator on a pack id, print results, do not modify state. |

### Modified files

| File | Change |
|---|---|
| `src/api/packs.ts` | Add `origin`, `vendor_id`, `value_lock`, `curator_note`, `is_sealed_collectible` to `Pack` interface. Add `cover_treatment`, `declared_value` to `PackItem` interface. Add `vendor` join shape. |
| `src/pages/PackDetail.tsx` | Conditional rendering for `origin = 'vendor'`: vendor header, curator's note, "What's in the pack" grid (replaces Value Odds for vendor packs), guarantee row, USD checkout entry. |
| `src/components/packs/CardDispositionRow.tsx` | Hide Sell-back button when source `pack.origin = 'vendor'`. |
| `src/components/packs/RubyBundleModal.tsx` | Remove Hold-to-Pay button + handler, mount `<StripePaymentElement>` in its place. |
| `src/pages/Packs.tsx` (catalog) | Add origin filter pills (All / House / Vendor). Show vendor handle on vendor pack tiles. |

### Files explicitly NOT modified in Phase 5

- `supabase/functions/open-pack-rubies/index.ts` — house pack opening stays exactly as-is.
- `scripts/recalc-pack-item-values.mjs` — economy solver stays exactly as-is, runs only on house packs.
- House pack UI on PackDetail, Hold-to-Open behavior — unchanged.

---

## Section 6: Testing strategy

- **Migration test:** apply on a fresh Supabase instance, verify all RLS policies, verify default values, verify enum constraints.
- **Validator unit tests:** vendor pack with sum-to-price ✓, vendor pack with off-by-cents (rejected), vendor pack with chase items skipped from sum ✓, vendor pack missing Connect account (rejected).
- **Payment Element integration:** Stripe test mode card numbers for card path. Apple Pay tested manually on a Safari/iOS device with a wallet card (cannot be automated end-to-end without device testing).
- **Connect destination charge:** Stripe test mode Connect account, verify `application_fee_amount` lands in InkStash's balance and the destination amount lands in the connected account's balance.
- **Vendor pack open flow:** end-to-end with Stripe test mode card → webhook fires → `open-pack-usd` runs → inventory rows created → vendor_payouts row inserted → reveal page shows three books with no Sell-back button.
- **Apple Pay domain verification:** verified by visual confirmation on a deployed staging environment (the file is hosted, the button renders). Not unit-testable.

---

## Open questions (track during implementation, do not block spec approval)

1. **Refund handling for vendor packs.** If a buyer disputes a vendor pack charge, the Stripe Connect destination has already received its 90%. We need a refund flow that pulls from the vendor's Connect balance. Stripe's documented pattern is to issue the refund and let Stripe reverse the transfer automatically (`reverse_transfer: true`). Default to that; revisit if it doesn't behave correctly in test mode.
2. **Shipping for vendor pack inventory.** Vendor pack books live in the vendor's physical inventory, not InkStash's vault. When a buyer pulls and chooses to ship, the existing `request-ship-item` edge function generates a label to the buyer — but the **origin address** needs to be the vendor's address, not InkStash's. Add `vendors.ship_from_address_id` (FK to a new `vendor_ship_from_addresses` table, mirroring `seller_ship_from_addresses`) and route ship-from based on the source pack's vendor. Surface this requirement in the implementation plan; the underlying ShipEngine integration already supports per-shipment origins.
3. **Vendor pack inventory tracking.** When a vendor pack sells out, `pack_items.remaining` hits zero — same as house packs. But the vendor also needs to know "how many of these books do I have left in physical inventory to fulfill ships?" That's a vendor-dashboard concern, not Phase 5. For now, the vendor is responsible for keeping their own count; we just won't sell more packs than `remaining > 0`.

---

## Phase 5 acceptance criteria

The phase is complete when:

1. A vendor row can be created via `scripts/create-vendor.mjs`, the resulting Connect onboarding link works, and the vendor's `status` flips to `active` after they complete onboarding.
2. A vendor pack can be created (manually via SQL/script for Phase 5), the validator passes, and the pack appears in the catalog with the vendor badge.
3. A buyer can open a vendor pack via Apple Pay on iOS/Safari, see the reveal sequence, see three books in their inventory with no Sell-back option.
4. The corresponding `vendor_payouts` row exists, the Connect destination has received 90% of the gross, InkStash has received 10% as application fee.
5. The Ruby bundle purchase page no longer has Hold-to-Pay; it uses the Payment Element with Apple Pay support.
6. Hold-to-Open on house pack PackDetail still works exactly as before.
7. Apple Pay button renders on production for both checkout surfaces (verified visually on iOS Safari).
