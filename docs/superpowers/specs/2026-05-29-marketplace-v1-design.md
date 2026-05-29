# Marketplace v1 — Comics-Only Fixed-Price Listings Design Spec

**Date:** 2026-05-29
**Branch (anticipated):** `marketplace-v1`
**Approach:** Surgical — extend existing schema (listings, orders, ItemDetail, ListItem, Marketplace) with what's missing rather than rebuild. Schema cleanup deferred to a later phase.
**Builds on:** Phase 5 (vendor Stripe Connect + StripePaymentElement + email pattern), Phase 3.5 (Keep/Sell/Ship), Phase 4 (My Stash + addresses)

---

## Overview

Marketplace v1 turns InkStash from "pack-opening app" into "every user can become a seller." Buyers discover comics on `/marketplace`, pay via Stripe (Apple Pay / card), and InkStash takes a 10% application fee. Sellers receive funds via Stripe Connect Express — the same flow vendors use for their pack revenue.

Two listing sources are supported from day one:

1. **Vault items**: a user's pack pull, listed via "List for sale" button on their My Stash inventory row. The book stays in the InkStash vault until sold; InkStash ships from the vault to the buyer. Sellers never handle the physical book.

2. **Outside items**: comics the seller owns elsewhere, listed via the existing 4-step `/list-item` wizard. The seller is responsible for shipping when sold. v1 uses external (off-app) label purchase; Phase 7 wires in-app ShipEngine labels.

**Comics only.** Any non-comic surface (cards, Funko, figures) is legacy code from before the pivot and is removed in this phase. Filtering happens by comic metadata (publisher, writer, artist, issue number, title) — not by abstract product categories.

**Buyer-side first**. The blocker scope for v1 is buyer-facing: discovery → checkout → payment → seller payout. Seller-side polish (in-app label purchase, advanced analytics, multi-quantity wizard) is explicitly deferred.

---

## Scope decisions made during brainstorming

- **Listing sources**: both vault items and outside-item wizard, day one.
- **Pricing**: seller sets price, 10% InkStash fee deducted from seller payout, buyer pays sticker. Fee applies to item only, not shipping pass-through.
- **Vault items**: stay in InkStash vault until sold; InkStash is escrow; InkStash ships to buyer.
- **Seller verification**: gated by Stripe Connect Express onboarding (the same flow vendors use). No listing until `users.seller_status = 'active'`.
- **Comics-only**: drop cards/Funko/figures from ListItem wizard and Marketplace filters.
- **Catalog source**: ComicVine API (key already configured as `COMIC_VINE_KEY` in `.env`) + free-text fallback for obscure or missing comics.
- **Marketplace UI**: unified grid mixing listings + auctions, with source filter pills. Auctions read-only (their flow lands in Phase 6).
- **Schema cleanup**: deferred to a later phase, not a v1 blocker.

---

## Audit reference (pre-existing infrastructure)

A read-only audit before this spec found significant pre-existing marketplace infrastructure dating to before the comic-niche pivot:

- **Working**: `listings` table with photos/pricing/condition; `orders` table extended for listings (`20260512000001_orders_support_listings.sql`); `ListItem.tsx` 4-step wizard creates real listings rows; Supabase Storage photo upload; `OrderManagement.tsx` for status + tracking; ShipEngine rate quotes saving to `shipping_rates`.
- **Broken or missing**: `Marketplace.tsx` only queries auctions table (listings invisible); no Stripe Payment Intent for marketplace orders (buyers literally don't pay today); no `users.stripe_connect_account_id` column; no seller verification gate on listing creation; categories always `NULL`; `create-shipping-label` never called post-payment.

The spec below is built around closing the gaps and refactoring what needs to change without rewriting what already works.

---

## Section 1 — Data model changes

Three things land in a single migration `supabase/migrations/20260529000000_marketplace_v1_schema.sql`.

### `users` table — Stripe Connect for sellers

```sql
ALTER TABLE public.users
  ADD COLUMN stripe_connect_account_id text UNIQUE,
  ADD COLUMN seller_status text NOT NULL DEFAULT 'inactive'
    CHECK (seller_status IN ('inactive', 'pending', 'active', 'paused'));

CREATE INDEX users_seller_status_idx ON public.users(seller_status);
```

- `seller_status='inactive'`: default for every user. They haven't started seller onboarding.
- `seller_status='pending'`: user kicked off Stripe Connect Express onboarding. `stripe_connect_account_id` is populated; account isn't `charges_enabled` yet.
- `seller_status='active'`: Stripe confirms `charges_enabled && payouts_enabled`. User can now list and receive funds.
- `seller_status='paused'`: admin-only; manual halt for fraud / suspended user.

### `listings` table — vault link, comic metadata, fee snapshot

```sql
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
```

- `source_inventory_id`: FK to user_inventory. NULL for outside-item listings. Set for vault listings. Partial index for fast vault-source lookups.
- `comic_*` fields: structured metadata, populated either from ComicVine API or by user free-text entry. Filtering on `/marketplace` uses these columns directly.
- `application_fee_pct`: snapshotted at listing creation. Future changes to the platform fee don't affect existing listings.

### `comic_catalog_cache` table — memoize ComicVine

```sql
CREATE TABLE public.comic_catalog_cache (
  id              integer PRIMARY KEY,
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
```

PK is ComicVine's own issue id (integer) — gives natural deduplication. The `gin` tsvector index supports server-side autocomplete search. Search hits the cache first, falls through to ComicVine on miss, populates cache.

### `vendor_payouts` → `seller_payouts` rename

```sql
ALTER TABLE public.vendor_payouts RENAME TO seller_payouts;
ALTER TABLE public.seller_payouts RENAME COLUMN vendor_id TO payee_user_id;

-- Existing FK pointed at vendors.id; migrate to point at the underlying user.
-- Backfill: for each existing row, look up the vendor's user_id and store that.
UPDATE public.seller_payouts sp
SET payee_user_id = v.user_id
FROM public.vendors v
WHERE sp.payee_user_id = v.id;

-- Drop the FK to vendors and add a new FK to auth.users.
ALTER TABLE public.seller_payouts
  DROP CONSTRAINT IF EXISTS vendor_payouts_vendor_id_fkey,
  ADD CONSTRAINT seller_payouts_payee_user_id_fkey
    FOREIGN KEY (payee_user_id) REFERENCES auth.users(id);

ALTER INDEX vendor_payouts_intent_id_uq RENAME TO seller_payouts_intent_id_uq;
ALTER INDEX vendor_payouts_vendor_id_idx RENAME TO seller_payouts_payee_user_id_idx;
```

Unifies vendor pack payouts and marketplace seller payouts into one table. Future audits of "all platform payouts" hit one place. The `open-pack-usd` edge function needs a one-line update (`vendor_id` → `payee_user_id` in the insert) but the schema shape is identical.

### RLS policies for new columns

The existing `listings` RLS policies (anyone can read `status='active'`, owner can mutate) cover the new columns automatically. The new `comic_catalog_cache` is service-role only — clients never read it directly; they hit the `search-comic-catalog` edge function.

### `seller_payouts` RLS (carried over from vendor_payouts)

```sql
DROP POLICY IF EXISTS vendor_payouts_owner_read ON public.seller_payouts;
CREATE POLICY seller_payouts_owner_read ON public.seller_payouts
  FOR SELECT USING (payee_user_id = auth.uid());
```

---

## Section 2 — Vault item listing flow

The new path. Users list a pack pull they want to sell without ever handling the physical book.

### UI entry point

In `CardDispositionRow.tsx`, the row that already has **Keep / Sell-back / Ship** gets a fourth option: **List for sale**. Conditions for showing it:

- `pack.origin === 'house'` — vendor pack pulls cannot be listed in v1 (those are the vendor's product to control).
- `inventory.status === 'vaulted'` — already-shipped or already-sold items can't be relisted.

If `users.seller_status !== 'active'`, the button still renders but opens the Connect onboarding modal instead of the price input. This is the same gate the `/list-item` page uses (Section 3).

### Connect onboarding gate

A new `<SellerConnectGate>` component wraps the "start selling" affordance everywhere. Behavior:

- If `seller_status === 'active'`: render `children` (the actual list button).
- Otherwise: render the children disabled with a tooltip; clicking opens a `<ConnectOnboardingModal>`.

The modal explains "To sell on InkStash, you need to verify with Stripe (~5 minutes). This is the same verification banks use." Button: "Start verification" → calls `sellersAPI.initiateConnectOnboarding()` → returns Stripe URL → opens in same tab. User completes Stripe-hosted onboarding. The existing `stripe-webhook` `account.updated` branch (extended in this phase) detects `charges_enabled && payouts_enabled` and flips `users.seller_status = 'active'`. On return, the modal polls Supabase Realtime on the user row and auto-dismisses when status flips.

### Set price modal

After verification, clicking "List for sale" opens `<SetPriceModal>`:

```
Set your asking price

Comic: Absolute Batman #1 (Jock variant)  [shows source_inventory thumbnail + title]

Asking price: [____] USD

Buyers will pay         $50.00
InkStash fee (10%)     -$5.00
You'll receive          $45.00

[Cancel] [List for sale]
```

Submit calls `listingsAPI.listVaultItem(inventoryId, priceCents)`, which invokes the `list-vault-item` edge function.

### `list-vault-item` edge function

The function performs an atomic SQL operation via a `SECURITY DEFINER` RPC, `list_vault_item(p_user_id, p_inventory_id, p_price_cents)`:

```sql
-- Pseudocode for the RPC body
SELECT * INTO v_inv FROM user_inventory WHERE id = p_inventory_id;
IF v_inv.user_id != p_user_id THEN RAISE 'not owner'; END IF;
IF v_inv.status != 'vaulted' THEN RAISE 'not vaulted'; END IF;

SELECT * INTO v_pack_item FROM pack_items WHERE id = v_inv.pack_item_id;
SELECT * INTO v_pack FROM packs WHERE id = v_pack_item.pack_id;
IF v_pack.origin != 'house' THEN RAISE 'vendor pack item, cannot list'; END IF;

INSERT INTO listings (
  user_id, source_inventory_id, title, photos,
  comic_publisher, comic_issue_number,
  buy_now_price, is_buy_now, status, application_fee_pct
) VALUES (
  p_user_id, p_inventory_id,
  v_pack_item.comic_title,
  jsonb_build_array(jsonb_build_object('url', v_pack_item.image_url)),
  v_pack.partner,  -- pack.partner is often the publisher for house packs
  v_pack_item.issue_number,
  p_price_cents / 100.0, true, 'active', 0.100
) RETURNING id INTO v_listing_id;

UPDATE user_inventory SET status = 'listed' WHERE id = p_inventory_id;

RETURN v_listing_id;
```

The edge function wraps this RPC in error handling and returns the new listing id to the client. Errors propagate as 4xx/5xx responses.

### On sale (post-payment, in webhook)

`open-listing-order` edge function (Section 6) handles the inventory transfer:

```sql
UPDATE user_inventory SET status = 'sold' WHERE id = listing.source_inventory_id;
UPDATE listings SET status = 'sold' WHERE id = listing.id;
INSERT INTO user_inventory (user_id, pack_purchase_id, pack_item_id, status)
VALUES (
  buyer_id,
  NULL,  -- not from a pack purchase; from a marketplace order
  (SELECT pack_item_id FROM user_inventory WHERE id = listing.source_inventory_id),
  'vaulted'  -- new owner has it vaulted at InkStash; the book never moved
);
```

The book stays in InkStash's vault. Ownership transferred via inventory row swap. When the buyer requests shipping (existing `request-ship-item` flow), InkStash admin generates the label.

### Delisting

A "Delist" action on the seller's `/seller-dashboard` (My Listings tab) reverses the flow:

```sql
UPDATE user_inventory SET status = 'vaulted' WHERE id = listing.source_inventory_id;
UPDATE listings SET status = 'delisted' WHERE id = listing.id;
```

The book returns to the seller's vault. They can sell-back, ship, or relist.

### Key invariants

- A vault book is reachable to exactly one user via `user_inventory.user_id` at all times.
- A listing's `source_inventory_id` is unique (cannot list the same vault item twice).
- The book's physical custody stays with InkStash throughout: vault → vault → vault → ship-to-buyer. No seller handling.

---

## Section 3 — Outside-item listing flow (refactor `ListItem.tsx`)

The existing 4-step wizard refactored: replace step 1 (multi-product catalog search) with ComicVine search + free-text fallback. Strip non-comic flows. Add seller verification gate.

### Step 1 — Comic search (rewritten)

UI: an autocomplete input. As the user types, debounce 300ms, then call `comicCatalogAPI.search(query)` which hits the `search-comic-catalog` edge function.

The edge function:

1. Search `comic_catalog_cache` via tsvector match on the query.
2. If <3 results: call ComicVine's `/issues/?filter=name:<query>&field_list=id,name,issue_number,image,volume,cover_date,person_credits` endpoint.
3. For each new result, INSERT into `comic_catalog_cache`. Map ComicVine's response: `id` → cache id, `name` → name, `issue_number` → issue_number, `image.thumb_url` → cover_url, `volume.publisher.name` → publisher (requires a second hop or use the `volume` filter), credits → writer/artist.
4. Return unified list to client: `[{ id, name, issue_number, cover_url, publisher, writer, artist }]`.

Rate limiting: ComicVine allows 200 requests/hour per IP. The cache layer is the primary mitigation; on 429 from ComicVine, the function returns the cache hits with a flag indicating "limited results — try again in a minute" so the UI degrades gracefully.

UI dropdown each result as: cover thumb (32x48), title + issue, publisher chip. Click populates step 2.

### Free-text fallback

At the bottom of the dropdown: **"Don't see your comic? Enter manually."** Opens an inline form replacing the dropdown:

- Title (required)
- Issue number (optional)
- Publisher (optional, free-text)
- Writer (optional)
- Artist (optional)

Submit moves to step 2 with `comic_vine_id = NULL` and only the user-entered fields populated.

### Steps 2-4 (mostly unchanged)

- **Step 2 — Details**: condition (radio: Sealed / Near Mint / Very Fine / Fine / Good / Poor — replacing the generic "new/used/etc." legacy strings), grade (optional text — for slabbed comics like "CGC 9.8"), description (optional textarea), photos.
- **Step 3 — Pricing + shipping**: `buy_now_price` (required). The `is_auction` flag and auction fields stay hidden in v1 (Phase 6 surfaces them). Seller's ship-from address (required, picker from `seller_ship_from_addresses`). ShipEngine rate quotes via existing `getRates` flow.
- **Step 4 — Review + submit**: confirmation page → INSERT into `listings`. `category` left NULL (we don't use it anymore — comics-only is implicit). On success, redirect to `/item/:id`.

### Seller verification gate

The wizard's outer route renders `<SellerConnectGate>` around the entire form. If `users.seller_status !== 'active'`, the wizard never renders — the user sees the Connect onboarding modal. After completion they return to `/list-item` and the wizard renders normally.

### Removed from `ListItem.tsx`

- The multi-product catalog search component (Comics / Cards / Funko / Figures tabs)
- Condition strings specific to non-comic items
- The category dropdown (column stays nullable in DB; we just never set it)
- Auction-only fields (`auction_start_time`, `auction_end_time`, `auction_duration_days`) — UI hidden, columns retained in schema for Phase 6

---

## Section 4 — Marketplace browse + filtering (`Marketplace.tsx`)

Unified feed mixing listings + auctions, server-side query, comic-only filters.

### Data fetch

New `marketplaceAPI.listFeed({ filters, sort, page, pageSize })`. Calls Supabase RPC:

```sql
CREATE FUNCTION public.query_marketplace_feed(
  p_filters jsonb,
  p_sort text,
  p_page int,
  p_page_size int
) RETURNS setof <feed_card_shape>
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH unified AS (
    SELECT
      l.id,
      'listing'::text AS source,
      l.title,
      (l.photos->0->>'url') AS cover_url,
      l.buy_now_price AS price,
      'Buy now'::text AS display_price_label,
      l.user_id AS seller_id,
      l.comic_publisher,
      l.comic_writer,
      l.comic_artist,
      l.comic_issue_number,
      (l.source_inventory_id IS NOT NULL) AS is_vault_item,
      NULL::timestamptz AS ends_at,
      l.created_at
    FROM public.listings l
    WHERE l.status = 'active' AND l.is_buy_now = true
      AND (p_filters->>'publisher' IS NULL OR l.comic_publisher = p_filters->>'publisher')
      AND (p_filters->>'query' IS NULL OR
           l.title ILIKE '%' || (p_filters->>'query') || '%' OR
           l.comic_issue_number ILIKE '%' || (p_filters->>'query') || '%')
      AND ((p_filters->>'source') IS NULL OR (p_filters->>'source') = 'all' OR (p_filters->>'source') = 'listing')

    UNION ALL

    SELECT
      a.id,
      'auction'::text AS source,
      a.title,
      a.image_url AS cover_url,
      coalesce(a.current_bid, a.starting_bid) AS price,
      'Current bid'::text AS display_price_label,
      a.seller_id,
      NULL::text AS comic_publisher,
      NULL::text AS comic_writer,
      NULL::text AS comic_artist,
      NULL::text AS comic_issue_number,
      false AS is_vault_item,
      a.end_time AS ends_at,
      a.created_at
    FROM public.auctions a
    WHERE a.status IN ('active', 'live')
      AND ((p_filters->>'source') IS NULL OR (p_filters->>'source') = 'all' OR (p_filters->>'source') = 'auction')
  )
  SELECT * FROM unified
  ORDER BY
    CASE p_sort WHEN 'price_asc' THEN price END ASC,
    CASE p_sort WHEN 'price_desc' THEN price END DESC,
    CASE p_sort WHEN 'ending_soon' THEN ends_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'recent' OR p_sort IS NULL THEN created_at END DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;
```

The RPC also returns a `total_count` field via `COUNT(*) OVER ()` (one extra query is fine for v1 traffic; switch to caching if needed).

### Filters (above the grid)

- **Source pills**: All / Buy Now / Auctions. Auctions tab is visible but auction cards navigate to `/auction/:id` which renders existing read-only legacy UI until Phase 6.
- **Publisher pills**: dynamic from `SELECT comic_publisher, count(*) FROM listings WHERE status='active' AND comic_publisher IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 6`. Cached for 5 minutes. "More publishers..." opens a modal with the full list.
- **Search input**: title + issue number `ILIKE '%query%'`. Server-side.
- **Sort dropdown**: Recently listed (default) / Price low to high / Price high to low / Ending soon.
- **Advanced filters slideout** (mobile: bottom sheet, desktop: side panel): writer, artist, condition. Wired in v1 but live as a follow-up if not in first pass.

### Card affordance

A new `<ListingFeedCard>` component renders each card. Visual hierarchy:

- Cover art (3:4 ratio)
- Title + issue number ("Absolute Batman #1")
- Publisher chip (gold for known publishers, neutral for unknown)
- Price + source label ("Buy now — $45" or "Current bid — $23")
- **"Vault item"** badge (small green chip) when `is_vault_item = true` — communicates "ships fast from InkStash" trust signal
- Seller avatar + handle (subtle, bottom-right corner)
- Click → `/item/:id`

### Pagination

Show 24 cards initial. "Load more" button fetches next 24 by incrementing `page` parameter. Server's `total_count` lets us hide the button when exhausted.

### Empty states

- Zero filters, zero results: "No comics for sale yet — be the first to list!" CTA → `/list-item`.
- Filters applied, no results: "No matches. Try removing some filters." Clear-filters button.

### Strip non-comic stuff

The existing `Marketplace.tsx` has hardcoded categories `['All', 'Comics', 'Trading Cards', 'Funko Pop', 'Figures']`. These get deleted entirely. Comics-only is implicit; the UI doesn't ask.

---

## Section 5 — Listing detail + checkout (`ItemDetail.tsx` + Stripe)

The detail page already falls back to listings; v1's work is wiring real Stripe payment with Connect destination charges.

### `ItemDetail.tsx` changes

- Add comic metadata rows under the title:
  - Line 1: Publisher chip (gold), Writer ("by [name]") if present
  - Line 2: Artist ("art by [name]") if present
  - Line 3: Issue number ("Issue #X")
- Add **"Vault item — ships fast from InkStash"** trust badge when `listing.source_inventory_id != null`.
- The existing "Buy Now" button stops adding to cart. Instead opens `<CheckoutListingModal>` (modal over the detail page, mirroring `CheckoutVendorPackModal` from Phase 5).
- Remove the auction countdown UI when viewing a listing — listings don't have `end_time`.
- Photo gallery, condition badge, seller card unchanged.

### `<CheckoutListingModal>` (new)

```ts
interface Props {
  open: boolean;
  onClose: () => void;
  listing: Listing & { seller: { id, username, stripe_connect_account_id } };
}
```

Body:

1. Title: "Buy [comic title]"
2. Item summary: cover thumb + title + condition
3. Price breakdown:
   - Item: $X.XX
   - Shipping: $Y.YY (auto-picked cheapest rate from `shipping_rates`; "Change" link opens picker)
   - Tax: NOT shown in v1 (Stripe Tax not yet enabled — see Section 8)
   - **Total: $X+Y**
4. Shipping address selector (reuses Phase 4 `addresses` API + `ShipAddressModal`). Required before payment.
5. `<StripePaymentElement paymentType="listing" targetId={listing.id} buttonLabel="Pay $X.XX" returnUrl={...}>` — the shared Phase 5 wrapper.

`returnUrl` builds via the same fragment-safe URLSearchParams pattern as `RubyBundleModal`: `${origin}${pathname}?listing_purchase=success`.

### Generalize `create-payment-intent` (extend Phase 5's edge function)

Adds a third branch on `payment_type`:

```ts
type PaymentType = 'ruby_bundle' | 'vendor_pack' | 'listing'
```

When `payment_type='listing'`:

1. Load the listing + seller from DB via service-role client:
   ```sql
   SELECT l.*, u.stripe_connect_account_id, u.seller_status
   FROM listings l
   JOIN users u ON u.id = l.user_id
   WHERE l.id = target_id;
   ```
2. Validate:
   - `listing.status === 'active'` (400 if not)
   - `seller_status === 'active'` (400 if not)
   - `stripe_connect_account_id IS NOT NULL` (500 if not — operational error)
3. Resolve shipping cost from `shipping_rates` table for the chosen rate id (passed in request body) OR fall back to the listing's cheapest available rate.
4. Calculate amounts in cents:
   - `itemCents = round(listing.buy_now_price * 100)`
   - `shippingCents = round(shipping_rate.amount * 100)`
   - `applicationFeeCents = round(itemCents * listing.application_fee_pct)` — fee on item only, not shipping
   - `amountCents = itemCents + shippingCents`
5. Bounds check: `applicationFeeCents < amountCents` (defensive — same pattern as vendor pack).
6. Create PaymentIntent:
   ```ts
   stripe.paymentIntents.create({
     amount: amountCents,
     currency: 'usd',
     customer: stripeCustomerId,
     automatic_payment_methods: { enabled: true },
     // Note: automatic_tax intentionally off until Stripe Tax + state registration (per ops doc).
     transfer_data: { destination: stripe_connect_account_id },
     application_fee_amount: applicationFeeCents,
     metadata: {
       payment_type: 'listing',
       listing_id: listing.id,
       seller_id: seller_id,
       buyer_id: user.id,
       shipping_address_id: body.shipping_address_id,
       shipping_rate_id: body.shipping_rate_id,
     },
   })
   ```

### Webhook handler (extend `stripe-webhook`)

Add a new branch in `handlePaymentIntentSucceeded` for `metadata.payment_type === 'listing'`:

```typescript
if (effectiveType === 'listing') {
  return await openListingOrder(intent, serviceClient, supabaseUrl, serviceRoleKey)
}
```

`openListingOrder` calls the new `open-listing-order` edge function (Section 6). Idempotency: function checks `orders.stripe_payment_intent_id` UNIQUE constraint; if exists, returns ok early.

Also extend the existing `handleAccountUpdated` handler from Phase 5 to flip `users.seller_status = 'active'` (currently it only handles vendors). The pattern:

```typescript
// In handleAccountUpdated, after the existing vendor lookup:
if (!vendor) {
  // Check if it's a regular seller (not a vendor)
  const { data: user } = await serviceClient
    .from('users')
    .select('id, seller_status')
    .eq('stripe_connect_account_id', account.id)
    .maybeSingle()
  if (user && user.seller_status !== 'active') {
    await serviceClient
      .from('users')
      .update({ seller_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', user.id)
    console.log('[stripe-webhook] seller activated:', user.id)
  }
}
```

---

## Section 6 — Order lifecycle + refunds

### `open-listing-order` edge function (new)

Called by `stripe-webhook` after `payment_intent.succeeded` for `payment_type='listing'`. Mirrors `open-pack-usd`.

Flow:

1. **Idempotency check**: query `orders` for the `stripe_payment_intent_id`; if exists, return `{ ok: true, idempotent: true }`.
2. **Load context**: listing + seller from `metadata.listing_id`, buyer from `metadata.buyer_id`, shipping address from `metadata.shipping_address_id`, shipping rate from `metadata.shipping_rate_id`.
3. **Insert order row**:
   ```sql
   INSERT INTO orders (
     buyer_id, seller_id, listing_id, status,
     shipping_address_id, shipping_cost_cents,
     item_price_cents, total_cents, application_fee_cents,
     stripe_payment_intent_id
   ) VALUES (...);
   ```
4. **Vault item branch**: if `listing.source_inventory_id IS NOT NULL`:
   - `UPDATE user_inventory SET status='sold' WHERE id = listing.source_inventory_id`
   - `UPDATE listings SET status='sold' WHERE id = listing.id`
   - `INSERT INTO user_inventory (user_id, pack_item_id, status) VALUES (buyer_id, ..., 'vaulted')`
5. **Outside item branch**: just `UPDATE listings SET status='sold'`. No inventory rows (we don't have the book).
6. **Insert seller_payouts row**:
   ```sql
   INSERT INTO seller_payouts (
     payee_user_id, pack_purchase_id, pack_id,
     gross_amount_cents, vendor_amount_cents, inkstash_amount_cents,
     stripe_payment_intent_id
   ) VALUES (
     seller_id, NULL, NULL,
     gross_amount_cents, gross - application_fee, application_fee,
     intent.id
   );
   ```
   (The `pack_purchase_id` and `pack_id` columns from the rename stay nullable for marketplace orders.)
7. **Fire-and-forget emails**:
   - `send-listing-sold-buyer` to `buyer.email`
   - `send-listing-sold-seller` to `seller.email`

### Outside-item ship flow

Seller is responsible for fulfilling. v1 is admin-light:

1. Order created → seller email fires: "You sold [title]. Ship to [buyer address]. Tracking required by [now + 7 days]."
2. Seller buys label externally (USPS, eBay shipping, etc.).
3. Seller enters tracking + carrier in `/order/:orderId` (existing `OrderManagement.tsx` UI). Status flips to `'shipped'`. Buyer gets shipping notification.
4. After 7 days no tracking → reminder email to seller.
5. After 14 days no tracking → admin alert (manual intervention).
6. Buyer can manually mark `'delivered'` from `/purchases`.

Phase 7 will wire in-app ShipEngine label purchase (the `C10-followup` backlog task already tracks this).

### Vault item ship flow

InkStash ships from the vault. v1 is admin-manual.

1. Order created → seller email fires: "Your vault listing sold. InkStash will ship it." No action required from seller.
2. Admin queue (new admin view, simple SQL-driven): show `orders WHERE status='processing' AND listing.source_inventory_id IS NOT NULL`. Admin sees buyer address + listing details.
3. Admin generates ShipEngine label using `create-shipping-label` with `ship_from = INKSTASH_RECEIVING_ADDRESS` constant (Section 8 — placeholder until real address provisioned), `ship_to = buyer's address from order`.
4. Once label exists, status flips to `'shipped'`. Buyer gets tracking notification.
5. Buyer can manually mark `'delivered'`.

### Payouts (both paths)

Stripe Connect destination charges already moved the seller's portion to their Connect balance at payment time. Stripe's default 2-day delay applies. Daily payout schedule.

No InkStash code touches payouts post-payment in v1. Stripe handles the rest.

### Refunds

**Buyer-initiated**: button on `/purchases` row → opens `<RefundRequestModal>` → submits to `request-refund` edge function:

1. Validate order is buyer's own and status in `('processing', 'shipped', 'delivered')`.
2. UPDATE `orders SET status='refund_pending'`.
3. Insert `refund_requests` row (new lightweight table) capturing reason text + requested_at.
4. Email seller + InkStash admin.

**Admin processing**: admin reviews refund_requests, approves or denies. Approved → `process-refund` edge function:

1. Call Stripe: `refunds.create({ payment_intent, reverse_transfer: true })` — pulls funds back from seller's Connect balance, returns to buyer.
2. UPDATE `orders SET status='refunded'`.

**Return-shipping routing** (per user clarification):

- **Vault item refund**: buyer ships book back to **InkStash receiving address**, not the original seller. Return label generated with `ship_to = INKSTASH_RECEIVING_ADDRESS`. Once received and condition confirmed:
  - Refund processed.
  - `UPDATE user_inventory SET status='vaulted', user_id = listing.user_id WHERE id = listing.source_inventory_id` (book returns to original seller's vault).
  - Delete buyer's `user_inventory` row.
  - Seller can relist.
- **Outside item refund**: buyer ships back to seller's original ship-from address. Once seller confirms receipt (via `OrderManagement.tsx` "Confirm return received" button), refund processed. Seller can relist via "Sold but returned" → re-list action on seller-dashboard.

**Return shipping cost** (v1 simplification):

- Buyer pays return shipping cost. Refund amount reduced by return label cost.
- "Item not as described" claims handled admin-manually; admin can override cost allocation.

### Disputes (chargebacks)

Stripe sends `charge.dispute.created` to webhook. v1 logs to a `disputes` table (new lightweight schema):

```sql
CREATE TABLE public.disputes (
  id text PRIMARY KEY,  -- Stripe dispute id
  order_id uuid REFERENCES public.orders(id),
  payment_intent_id text NOT NULL,
  amount_cents integer NOT NULL,
  reason text,
  status text,
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Emails admin. No in-app dispute response UI in v1 — admin handles in Stripe Dashboard. Phase 6+ adds UI.

---

## Section 7 — Component + file map

### Migrations (new)

| File | Purpose |
|---|---|
| `supabase/migrations/20260529000000_marketplace_v1_schema.sql` | Adds `users.stripe_connect_account_id`, `users.seller_status`; listings columns (source_inventory_id, comic_*, application_fee_pct); `comic_catalog_cache` table + indexes; rename `vendor_payouts` → `seller_payouts` with column rename + FK migration; new `disputes` table; new `refund_requests` table; RPC `list_vault_item`; RPC `query_marketplace_feed`. |

### Edge functions

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/create-payment-intent/index.ts` | Modify | Add `payment_type: 'listing'` branch with Connect destination charge routing + shipping cost handling. |
| `supabase/functions/stripe-webhook/index.ts` | Modify | (1) Add `payment_type='listing'` branch → invoke `open-listing-order`; (2) Extend `handleAccountUpdated` to also flip `users.seller_status='active'`; (3) Add `charge.dispute.created` handler that logs to `disputes` table + emails admin. |
| `supabase/functions/open-listing-order/index.ts` | Create | Vault-aware order open: insert order row, update inventory + listing status, insert `seller_payouts` row, fire emails. Mirrors `open-pack-usd`. |
| `supabase/functions/open-pack-usd/index.ts` | Modify | One-line change: `seller_payouts` insert uses `payee_user_id` (the vendor's user_id) instead of `vendor_id`. |
| `supabase/functions/search-comic-catalog/index.ts` | Create | ComicVine + cache layer. Returns unified search results, populates cache. |
| `supabase/functions/list-vault-item/index.ts` | Create | Wraps the `list_vault_item` RPC; validates ownership, returns new listing id. |
| `supabase/functions/request-refund/index.ts` | Create | Buyer-initiated refund request: flips order to `refund_pending`, inserts row, fires emails. |
| `supabase/functions/process-refund/index.ts` | Create | Admin endpoint that calls Stripe `refunds.create` with `reverse_transfer: true`, updates inventory for vault items, sends confirmation emails. |
| `supabase/functions/send-listing-sold-buyer/index.ts` | Create | Resend confirmation to buyer with itemized order. |
| `supabase/functions/send-listing-sold-seller/index.ts` | Create | Resend "you sold X" to seller with payout info. |
| `supabase/functions/get-marketplace-feed/index.ts` | Create | Calls `query_marketplace_feed` RPC; light wrapper for client. |

### Frontend pages

| File | Action | Purpose |
|---|---|---|
| `src/pages/Marketplace.tsx` | Modify (substantial) | Unified feed via `marketplaceAPI.listFeed`, publisher pill row, search, sort modes, strip non-comic categories, infinite scroll. |
| `src/pages/ItemDetail.tsx` | Modify | Add comic metadata rows, vault badge, swap "Buy Now → cart" for "Buy Now → CheckoutListingModal", clean up auction countdown for listings. |
| `src/pages/ListItem.tsx` | Modify (substantial) | Replace step 1 with ComicVine search + free-text fallback, drop non-comic flows, add seller verification gate. |
| `src/pages/MyStash.tsx` | Modify | Wire the new "List for sale" button on vault inventory rows (only on Inventory tab, only for house pack pulls). |
| `src/pages/SellerDashboard.tsx` | Modify | Add "Refund pending" indicator on orders; add "Confirm return received" button for outside-item returns; add "Sold but returned" re-list action. |
| `src/pages/Purchases.tsx` | Modify | Add "Request refund" button per order row, show refund status. |

### Frontend components

| File | Action | Purpose |
|---|---|---|
| `src/components/checkout/CheckoutListingModal.tsx` | Create | Modal wrapping `StripePaymentElement` for listing payment. Mirrors `CheckoutVendorPackModal`. |
| `src/components/listings/ListingFeedCard.tsx` | Create | Card for unified marketplace grid. Source badge, price/auction state, vault badge. |
| `src/components/listings/PublisherFilterPills.tsx` | Create | The "Marvel, DC, Image..." pill row with dynamic counts. |
| `src/components/listings/SellerConnectGate.tsx` | Create | Wraps any "start selling" CTA. Intercepts with Connect onboarding modal if user isn't `seller_status='active'`. Reused by ListItem and the My Stash "List" button. |
| `src/components/listings/ConnectOnboardingModal.tsx` | Create | Stripe Connect Express onboarding launcher. Polls Supabase Realtime for status flip. |
| `src/components/listings/SetPriceModal.tsx` | Create | Lightweight modal: enter price, see fee breakdown, confirm. Used by vault listing flow. |
| `src/components/listings/RefundRequestModal.tsx` | Create | Buyer-initiated refund request form. |
| `src/components/packs/CardDispositionRow.tsx` | Modify | Add "List for sale" button (gated by `packOrigin === 'house'` + `inventory.status === 'vaulted'` + `seller_status === 'active'`). |

### API layer

| File | Action | Purpose |
|---|---|---|
| `src/api/marketplace.ts` | Create | `listFeed(filters, sort, page)`, `getById(id)`, publisher list helpers. |
| `src/api/listings.ts` | Create | `create(spec)` for outside items, `listVaultItem(inventoryId, priceCents)` for vault, `delist(id)`, `listMine()`. |
| `src/api/comicCatalog.ts` | Create | Wraps `search-comic-catalog` edge function. |
| `src/api/refunds.ts` | Create | `request(orderId, reason)`, `getStatus(orderId)`. |
| `src/api/sellers.ts` | Create | `getSellerStatus()`, `initiateConnectOnboarding()` (returns Stripe URL). |

### Routes (no changes to `src/main.tsx`)

All routes used by Marketplace v1 already exist: `/marketplace`, `/item/:id`, `/list-item`, `/my-stash`, `/seller-dashboard`, `/purchases`, `/order/:orderId`. No new routes needed.

### Files explicitly NOT modified in this phase

- `src/pages/Live.tsx`, `src/pages/Drops.tsx`, `src/pages/Raffles.tsx` — no marketplace integration in v1
- `src/pages/PackDetail.tsx`, `supabase/functions/open-pack-rubies` — house pack flow untouched
- `supabase/functions/create-shipping-label/index.ts` — wiring to marketplace ship flow is Phase 7

---

## Section 8 — Open questions, deferrals, operational TODOs

### Open questions to resolve during implementation (not blockers for spec approval)

1. **InkStash receiving address for vault returns** — placeholder string `INKSTASH_RECEIVING_ADDRESS` in `_shared/constants.ts`. Update via SQL/PR when fulfillment partner address is locked in. The constant pattern lets it be a single update later.
2. **ComicVine rate limit handling** — 200 req/hour per IP. Mitigations: aggressive caching, exponential backoff on 429, free-text fallback always available. If traffic justifies, evaluate ComicVine's paid tier.
3. **Vault listing pricing floor** — should users be prevented from listing below `pack_item.estimated_value`? Decision: no. Sellers list whatever they want; market settles prices.
4. **Listing expiration** — eBay model is 30-day expiration. v1 has none; listings stay `active` until sold or delisted. Revisit in v1.1 if stale listings accumulate.
5. **Multi-quantity listings** — `listings.quantity` column exists and is functional. v1 wizard doesn't expose it (assumes quantity=1). Sellers list multiple by creating multiple listings. Revisit when seller feedback demands it.
6. **Customer find-or-create race in `create-payment-intent`** — pre-existing pattern across the codebase (flagged in Phase 5 audit). More important with marketplace because more first-time payments. Recommended as a separate small follow-up task; not a v1 blocker.

### Explicit non-goals for v1 (deferred to later phases)

- **Auctions** (Phase 6) — schema supports them; v1 hides auction creation, surfaces existing auction listings as read-only links to legacy `/auction/:id`.
- **Live commerce** (separate future phase) — Marketplace v1's data model is forward-compatible. Live integration is a presentation layer on top, not a model change.
- **Best Offer / negotiation** — buyer can't offer below sticker. Future.
- **Watchlist / save for later** — no saved-listings concept in v1.
- **Seller reviews / ratings** — no review system. Trust is implicit (Stripe verification = legitimate seller).
- **Bundled shipping** — each listing is its own order, even if a buyer buys multiple from the same seller.
- **Marketplace search algorithm** — v1 is `ILIKE`. Phase 6+ considers Meilisearch or pg_trgm.
- **Buyer-side promotional features** — no coupons, no discount codes, no referral rewards.
- **Seller analytics dashboard** — `/seller-dashboard` exists, analytics tab stays mock for v1.
- **In-app ShipEngine label purchase** — Phase 7 (already tracked as `C10-followup` backlog task).
- **In-app dispute response UI** — Stripe Dashboard handles disputes. v1 logs disputes; Phase 6+ adds in-app response.
- **Vendor-owned blind-bag packs in marketplace** — packs stay in `/packs`, manually approved by InkStash + vendor. Marketplace is for regular items only.

### Operational TODOs before public launch (out-of-code)

- Register InkStash with home state as marketplace facilitator (sales tax).
- Enable Stripe Tax in Stripe Dashboard. Re-enable `automatic_tax: { enabled: true }` on the listing PaymentIntent (single-line change in `create-payment-intent`).
- Provision InkStash receiving address for vault returns. Update `INKSTASH_RECEIVING_ADDRESS` constant.
- Document admin refund flow (which Stripe Dashboard page, which SQL queries, which admin route).
- Evaluate ComicVine paid tier if expected query volume exceeds free tier.
- Ensure Stripe webhook subscription includes `account.updated` and `charge.dispute.created` events (the existing endpoint from Phase 5 needs these added if not already present).

---

## Phase 5 (real) acceptance criteria

Phase is complete when:

1. A new (non-vendor) user can complete Stripe Connect Express onboarding starting from a "List for sale" CTA. `users.seller_status` flips to `'active'` via the webhook.
2. That same user can list a vault item (a house pack pull from My Stash). Listing row created with `source_inventory_id` link. Inventory status flips to `'listed'`.
3. That same user can list an outside item via the refactored `/list-item` wizard. Step 1 uses ComicVine search (and free-text fallback if missing). Listing row created with `comic_*` metadata populated, `source_inventory_id = NULL`.
4. A different user visits `/marketplace` and sees both listings (filterable by publisher pills).
5. The buyer clicks a listing, sees ItemDetail with comic metadata + vault badge (if applicable). Buy Now button opens `CheckoutListingModal`.
6. Payment via Stripe Payment Element (test card 4242...) completes. Webhook fires. Order row created. `seller_payouts` row records 90/10 split (seller_amount + inkstash_amount = gross). Stripe Connect destination receives seller's portion.
7. For vault item sale: `user_inventory.status='sold'` on seller's row; new `user_inventory` row created for buyer with `status='vaulted'`; listing status `'sold'`.
8. For outside item sale: listing status `'sold'`; no inventory rows changed (we don't have the book).
9. Buyer receives confirmation email via Resend (`send-listing-sold-buyer`).
10. Seller receives "you sold X" email (`send-listing-sold-seller`).
11. Buyer can request refund from `/purchases`. Order status flips to `'refund_pending'`. Admin can process via `process-refund`. Stripe refund executes with `reverse_transfer: true`. For vault items, inventory ownership reverts to seller.
12. The legacy `vendor_payouts` data is migrated to `seller_payouts` with `payee_user_id` populated correctly. Existing vendor pack flow unchanged in behavior.

Phase 5 (real) is done when all twelve check.
