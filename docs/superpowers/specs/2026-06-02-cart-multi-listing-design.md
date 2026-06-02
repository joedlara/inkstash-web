# Cart + Multi-Listing Checkout Design Spec

**Goal:** Let a buyer add multiple marketplace listings to a cart and check out in one Stripe payment, even when those listings come from different sellers. Replaces today's single-item buy flow (which still works for "Buy Now" from the item detail page).

**Architecture summary:**
- **Cart UI:** slide-over drawer from the top nav (replaces the `/cart` route's standalone page)
- **Cart state:** localStorage-backed React Context (same pattern as the existing dead `CartContext` but redone for listings)
- **Payment:** ONE Stripe PaymentIntent to the InkStash platform account. After confirm, server-side fans out N Transfers to each seller's Connect account, taking 10% off each
- **Shipping:** per-listing — uses the rate the seller selected when listing. No re-rating at cart time
- **Failure handling:** transfer failures don't fail the order. Items affected get status='pending_payout' with retry logic. Buyer always sees a successful checkout

---

## Section 1 — Data model

### `cart_items` (NEW — server-side cart, optional but recommended)

We've been running cart in localStorage. For v1 we keep that pattern, but I'm adding a server-side `cart_items` table too for two reasons:
1. Cart syncs across devices for signed-in users
2. We can validate listings still exist + are still in-stock at add-to-cart time (e.g., reject add if status went from 'active' → 'sold' since the buyer loaded the page)

```sql
CREATE TABLE public.cart_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id   uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)  -- a listing can only be in your cart once
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Decision:** localStorage cart stays as fallback/optimistic UI. On signed-in load, we hydrate from `cart_items` (which wins on conflict).

### `order_groups` (NEW — wraps a multi-seller cart checkout)

A single Stripe PaymentIntent + cart checkout creates ONE `order_groups` row that ties together N `orders` rows (one per seller). Lets us:
- Show the buyer a unified order summary post-checkout
- Track transfer failures at the group level
- Issue partial refunds per seller later (M7+)

```sql
CREATE TABLE public.order_groups (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id                    uuid NOT NULL REFERENCES public.users(id),
  stripe_payment_intent_id    text NOT NULL UNIQUE,
  total_amount                numeric(10,2) NOT NULL,
  status                      text NOT NULL CHECK (status IN ('pending', 'paid', 'partial_payout_failed', 'fully_paid_out')),
  created_at                  timestamptz DEFAULT now(),
  paid_at                     timestamptz,
  fully_paid_out_at           timestamptz
);

ALTER TABLE public.order_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer can read own order groups" ON public.order_groups
  FOR SELECT USING (auth.uid() = buyer_id);
```

### `orders` table — add `order_group_id` + transfer tracking columns

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_group_id              uuid REFERENCES public.order_groups(id),
  ADD COLUMN IF NOT EXISTS stripe_transfer_id          text,
  ADD COLUMN IF NOT EXISTS transfer_status             text CHECK (transfer_status IN ('pending', 'succeeded', 'failed', 'retrying')),
  ADD COLUMN IF NOT EXISTS transfer_attempts           integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transfer_last_error         text;
```

`order_group_id` is NULL for legacy single-item orders (the M3 buy-now path) so we don't break anything. Cart-created orders all share an `order_group_id`.

### `failed_transfers` (NEW — operational log)

```sql
CREATE TABLE public.failed_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id),
  seller_id       uuid NOT NULL REFERENCES public.users(id),
  amount_cents    integer NOT NULL,
  stripe_error    text,
  attempted_at    timestamptz DEFAULT now()
);

ALTER TABLE public.failed_transfers ENABLE ROW LEVEL SECURITY;
-- Service role only; ops-facing
```

---

## Section 2 — Cart context refactor

Rewrite `src/contexts/CartContext.tsx`:
- Replace the `CartItem` interface (auction-only) with a listing-focused shape
- Hydrate from `cart_items` table on mount for signed-in users
- Sync to both localStorage AND `cart_items` table on every change
- Sign-out clears local cart but server cart persists

```typescript
export interface CartItem {
  listing_id: string;
  title: string;
  cover_url: string | null;
  price: number;            // item_price in dollars
  shipping_cost: number;    // also in dollars
  seller_id: string;
  seller_username: string;  // for the "X items from username" grouping
  added_at: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (listingId: string) => Promise<void>;  // server-side validation
  removeItem: (listingId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  totalPrice: number;
  groupedBySeller: Array<{
    seller_id: string;
    seller_username: string;
    items: CartItem[];
    subtotal: number;
  }>;
}
```

The `addItem(listingId)` signature changed — caller doesn't pass details. The context fetches the listing server-side, validates it's still active + buyable, then adds. This prevents stale-cart attacks (cart full of $1 listings the seller already raised the price on).

---

## Section 3 — Cart drawer UI

Replace `/cart` page with a slide-over drawer.

### `<CartDrawer>` component
- Lives in `src/components/cart/CartDrawer.tsx`
- Mounted globally (in AppShell or main.tsx) so any page can open it
- Triggered by clicking the cart icon in the top nav (already exists)
- Slides in from the right via MUI `<Drawer anchor="right">`

### Layout

```
┌─────────────────────────────────────┐
│  CART (3)                       [×] │
├─────────────────────────────────────┤
│                                     │
│  ── @dynamixjl ──                  │
│  ┌───┐  Absolute Batman #1         │
│  │📕 │  $45.00 + $5.50 ship       │
│  └───┘                         [×] │
│                                     │
│  ── @comicfan42 ──                 │
│  ┌───┐  Watchmen #1                │
│  │📗 │  $75.00 + $4.50 ship       │
│  └───┘                         [×] │
│  ┌───┐  Saga #1                    │
│  │📘 │  $12.00 + $4.50 ship       │
│  └───┘                         [×] │
│                                     │
├─────────────────────────────────────┤
│  Subtotal           $132.00         │
│  Shipping            $14.50         │
│  Total              $146.50         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Proceed to Checkout          │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

- Items grouped by seller using `groupedBySeller`. Seller pill at the top of each group links to `/@username`.
- Each row: cover thumbnail, title, price + shipping, remove button.
- Bottom: subtotal / shipping / total breakdown. "Proceed to Checkout" CTA opens the checkout modal.

### Add-to-cart affordance

Add a "+ Add to cart" button on `/item/:id` next to the existing "Buy Now" button (only for buy-now listings, not auctions). Wires `cartContext.addItem(listingId)`. On success, brief toast: "Added to cart" + a button to open the drawer.

---

## Section 4 — Checkout modal

New `<CartCheckoutModal>` triggered by "Proceed to Checkout" in the drawer.

### Flow

1. Modal opens. Shows cart summary (read-only, same item grouping).
2. Calls a new edge function `create-cart-payment-intent` which:
   - Validates all listings still active + still owned by their sellers
   - Validates the buyer has a saved shipping address (or prompts to add one)
   - Computes total = sum of (item_price + shipping_cost) per item
   - Creates ONE PaymentIntent on the platform account (no `transfer_data` — money lands on InkStash, not destination-charged anywhere)
   - Returns `client_secret` + `order_group_id`
3. `<StripePaymentElement>` mounts with the client_secret. Buyer enters card.
4. On confirm, Stripe redirects to `/cart-checkout-success?order_group_id=...`
5. The success page polls `/order-group/:id` until `status` flips to `paid` (the webhook handler does the heavy lifting in the background).
6. Once paid, redirect to a multi-order summary page.

### Why this flow

Stripe's standard pattern for marketplace fan-out is: charge to platform, then create N Transfers. The Transfer leg happens after the Charge succeeds, so the buyer gets one clean "did the card go through? yes/no" experience. If Transfers fail later, that's an internal operational problem — the buyer never knows.

---

## Section 5 — Edge functions

### `create-cart-payment-intent` (NEW)

Replaces the cart-specific case the existing `create-payment-intent` doesn't handle.

**Request body:** `{}` (cart items read from `cart_items` table for the calling user)

**Behavior:**
1. Auth check
2. Load `cart_items` for user, JOIN `listings` to get current price + status + seller_id + selected_shipping_rate_id
3. Reject any cart item where listing status != 'active' (return list of stale item IDs so frontend can remove them)
4. Load the buyer's default shipping address. If none → return 400 "no_shipping_address"
5. Compute `total_amount = sum(item_price + shipping_cost)` per item
6. INSERT `order_groups` row with status='pending'
7. INSERT N `orders` rows with `order_group_id` set, `status='pending'`, `transfer_status='pending'`, all the shipping fields copied from buyer's address
8. Create Stripe PaymentIntent: `amount = total_amount * 100`, `metadata.order_group_id = group.id`, `metadata.payment_type = 'cart'`
9. Persist `stripe_payment_intent_id` on the order_group row
10. Return `{ client_secret, order_group_id, total_amount }`

### `stripe-webhook` extension (MODIFY)

Add a new branch in `payment_intent.succeeded`:
```typescript
if (intent.metadata?.payment_type === 'cart') {
  return await openCartOrderGroup(intent, supabaseUrl, serviceRoleKey, stripe)
}
```

### `openCartOrderGroup` (NEW logic in webhook)

1. Find `order_group` by `stripe_payment_intent_id` (idempotency check — if already 'paid', return 200)
2. UPDATE order_group SET status='paid', paid_at=now()
3. UPDATE all child `orders` SET status='processing' (matches what M3 does for single orders)
4. For each `order`, transfer vault inventory ownership if `listings.source_inventory_id` is set (reuses M3's logic from `open-listing-order` — extract to a shared helper)
5. UPDATE all child `listings` SET status='sold' for each item
6. For each `order`, create a Stripe Transfer:
   - `amount = (item_price * 0.9) * 100 + shipping_cost * 100` (10% off price, full shipping)
   - `destination = seller's stripe_connect_account_id`
   - `transfer_group = order_group.id` (lets Stripe associate them)
   - On success: UPDATE order SET stripe_transfer_id, transfer_status='succeeded'
   - On failure: UPDATE order SET transfer_status='failed', transfer_last_error, INSERT into `failed_transfers`
7. After all transfers attempted: if any failed, UPDATE order_group SET status='partial_payout_failed'. Otherwise status='fully_paid_out'.
8. Fire confirmation emails:
   - One email to buyer summarizing the whole cart
   - One email per seller (reuse existing `send-listing-sold-seller`)

### `retry-failed-transfers` (NEW — scheduled cron)

A cron-triggered edge function (Supabase cron is in beta but works). Runs every 60 minutes:
1. Find orders where `transfer_status = 'failed'` AND `transfer_attempts < 24`
2. For each, attempt the Transfer again. Increment `transfer_attempts`.
3. On success, update order. If still failing after 24 attempts (24h), log to ops alert.

For v1 we'll set this up but it's an MVP — most failures self-resolve when the seller fixes their Connect account.

---

## Section 6 — Frontend changes

### Files modified
- `src/contexts/CartContext.tsx` — rewrite for listings + server sync
- `src/pages/Cart.tsx` — delete (replaced by drawer)
- `src/main.tsx` — remove `/cart` route, mount `<CartDrawer>` globally
- `src/pages/ItemDetail.tsx` — add "+ Add to cart" button next to "Buy Now"
- `src/components/layout/AppSidebar.tsx` or wherever the top nav cart icon lives — wire click to open drawer

### Files created
- `src/components/cart/CartDrawer.tsx` — the slide-over UI
- `src/components/cart/CartItemRow.tsx` — single line item inside the drawer
- `src/components/cart/CartCheckoutModal.tsx` — the post-CTA modal with Stripe Payment Element
- `src/pages/CartCheckoutSuccess.tsx` — the polling success page that lands after Stripe confirm
- `src/pages/OrderGroupSummary.tsx` — shows all N orders from one cart checkout, linked from email + redirect
- `src/api/cart.ts` — `addToCart(listingId)`, `removeFromCart(listingId)`, `getCart()`, `createCartPaymentIntent()`

---

## Section 7 — Out of scope (deferred)

- **Re-rating combined shipments** for same-seller items in cart (M3 shipping rates stay per-item)
- **Save for later** (move from cart to a wishlist)
- **Guest cart checkout** (must be signed in)
- **Cart quantity > 1 per listing** (each comic is unique by definition; cart items are unique by listing_id)
- **Coupons / promo codes** (no surface today)
- **Tax** (handled by Stripe Tax later)
- **Refunds at the order_group level** (single-order refunds remain on the per-order page; group refunds need their own UX)

---

## Section 8 — Test plan (manual smoke)

1. **Add to cart, single seller, 2 items** → drawer shows 2 items grouped under one seller pill → subtotal correct → checkout → buyer's card charged once → 2 orders created in DB, both with order_group_id set → 1 Transfer to seller for combined amount minus fees → vault inventory transferred → buyer email summary lists both → seller emails one each.

2. **Add to cart, 2 sellers, 1 item each** → drawer shows 2 grouped sections → checkout → buyer charged once → 2 orders + 2 Transfers (one to each seller) → 2 confirmation emails to buyer (no, 1 unified one) and 2 to sellers.

3. **Cart item goes stale during checkout** → seller marks their listing sold via another route between buyer's cart-load and checkout-confirm → create-cart-payment-intent rejects with `stale_items: [listing_id]` → frontend removes them from cart and shows toast "1 item in your cart is no longer available."

4. **Transfer failure mid-checkout** → seller's Connect account is disabled between checkout-confirm and webhook → buyer's charge succeeds → order_group.status = 'partial_payout_failed' → failed_transfers row created → retry-failed-transfers cron picks it up next hour → succeeds → order_group.status flips to 'fully_paid_out'.

5. **Single-item buy-now from ItemDetail page still works unchanged** (the M3 path). This is the critical regression test — cart work cannot break existing single-item checkout.

---

## Implementation order

1. Migrations (additive, safe)
2. `cartAPI` + rebuild `CartContext`
3. `<CartDrawer>` + add-to-cart button on ItemDetail
4. `create-cart-payment-intent` edge fn
5. `<CartCheckoutModal>` + success page
6. `openCartOrderGroup` webhook branch
7. Buyer + seller emails
8. `retry-failed-transfers` cron (lower priority — ship without if needed)
9. Smoke test + PR

---

## Open questions

- **Cart cap?** No, but the Stripe PaymentIntent has a max of $999,999.99 which we'll never hit.
- **Cart expiry?** No active cleanup; localStorage + server cart persist indefinitely. Stale items handled at checkout time.
- **Auction items in cart?** Out of scope — cart is buy-now listings only. Auctions still go through the existing "place bid" flow.
