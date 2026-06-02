# Cart + Multi-Listing Checkout Implementation Plan

> Spec: `docs/superpowers/specs/2026-06-02-cart-multi-listing-design.md`

**Architecture in one breath:** Cart-context (localStorage + server `cart_items` sync) → slide-over drawer → checkout modal → ONE PaymentIntent to InkStash platform → webhook fan-outs N Stripe Transfers, one per seller, minus 10% platform fee → N orders + 1 order_group all visible from a summary page.

11 tasks. Critical-path dependency: 1 → 2 → (3, 4 in parallel) → 5 → 6 → 7 → 8 → 9 → 11. Task 10 (cron) ships last and is optional for the MVP.

---

## Task 1: 3 additive migrations

**Why first:** every edge fn and API call depends on these columns existing.

`20260603040000_cart_items.sql` — server-side cart for cross-device sync.
`20260603050000_order_groups_and_orders_extensions.sql` — order_groups parent + orders.order_group_id/stripe_transfer_id/transfer_status/transfer_attempts/transfer_last_error.
`20260603060000_failed_transfers.sql` — operational log for transfer failures.

Run: `supabase db push`. Confirm clean.

Commit: `feat(db): cart system migrations (cart_items + order_groups + transfer tracking)`

---

## Task 2: `cartAPI` + rewrite `CartContext`

**Files:**
- Create: `src/api/cart.ts`
- Modify: `src/contexts/CartContext.tsx` (full rewrite)

**`src/api/cart.ts`:**
- `getServerCart()` — SELECT cart_items joined with listings for current user. Returns array shaped like `CartItem`.
- `addServerCartItem(listingId)` — INSERT cart_items. ON CONFLICT do nothing (cart is set-semantics, listing can only be in once).
- `removeServerCartItem(listingId)` — DELETE.
- `clearServerCart()` — DELETE all for current user.

**`CartContext.tsx`:**
- New `CartItem` shape: `{ listing_id, title, cover_url, price, shipping_cost, seller_id, seller_username, added_at }`.
- On mount: hydrate from localStorage immediately (optimistic UI). If signed-in, fire `getServerCart()` and reconcile (server wins on conflict).
- On `addItem(listingId)`: optimistically add stub to local state, fire `addServerCartItem`, on success refetch the joined data for that one item to populate title/cover/price/seller_username. On failure, roll back local state + toast.
- On `removeItem`: optimistic remove, fire server delete, rollback on failure.
- `groupedBySeller` derived getter that bucket items by seller_id.
- Sync to localStorage on every state change (same as before).

Typecheck after. Commit: `feat(cart): cartAPI client + listing-shaped CartContext with server sync`.

---

## Task 3: `<CartDrawer>` + global mount + icon wire

**Files:**
- Create: `src/components/cart/CartDrawer.tsx`
- Create: `src/components/cart/CartItemRow.tsx`
- Modify: `src/components/layout/AppShell.tsx` (or wherever top-level mount lives) — add `<CartDrawer />`
- Modify: top-nav component (find it — likely `AppSidebar.tsx` or a Topnav file) — cart icon click sets a global "drawer open" state. Use a small context or pass through CartContext.

**Decision:** add `drawerOpen` + `setDrawerOpen` to `CartContext` since cart drawer state is conceptually cart state.

**`<CartDrawer>` layout (per spec):**
- MUI `<Drawer anchor="right" open={drawerOpen} onClose={...}>`
- Header: "CART (N)" + close button
- Body: scrollable. `groupedBySeller.map(group => <SellerGroup>)`. Each `<SellerGroup>` has a seller pill header + N `<CartItemRow>` children.
- Footer (sticky bottom): subtotal / shipping / total breakdown + "Proceed to Checkout" CTA. CTA opens `<CartCheckoutModal>` (Task 6) — for now wire it to a `console.log('todo: open checkout')` stub.
- Empty state: friendly message + "Browse marketplace" CTA.

**`<CartItemRow>`:** thumbnail (cover_url), title (clickable → `/item/:id`, closes drawer), price + shipping line, remove icon button.

Use brand tokens. Match the visual language we landed in M6 (display font for headings, mono for prices, brand-red primary CTA).

Typecheck. Commit: `feat(cart): slide-over drawer with seller-grouped line items`.

---

## Task 4: Add-to-cart button on ItemDetail

**File:** `src/pages/ItemDetail.tsx`

- Find the existing "Buy Now" button block.
- Add a sibling `<Button>` left of it (or wrap both in a Stack): outlined variant, "+ Add to cart" label. Disabled if `isInCart(item.id)` returns true (just say "In cart" then).
- onClick: `cartContext.addItem(item.id)`. On success, show a brief snackbar with an "Open cart" button that calls `setDrawerOpen(true)`.
- Only render the button when `item.status === 'active' && item.is_buy_now` and the viewer is NOT the seller.

Typecheck. Commit: `feat(cart): add-to-cart button on ItemDetail for buy-now listings`.

---

## Task 5: `create-cart-payment-intent` edge fn

**File:** `supabase/functions/create-cart-payment-intent/index.ts`

Body: `{}` (cart implicit from caller's auth)

Behavior (per spec Section 5):
1. Auth check via JWT
2. Load cart_items for caller, JOIN listings + JOIN users (for seller's stripe_connect_account_id, which we validate exists)
3. For each cart item, validate listing.status === 'active'. If not, return `400 { error: 'stale_items', stale_item_ids: [...] }`
4. Load default shipping address for caller. If none → return 400 `{ error: 'no_shipping_address' }`
5. Compute `total_amount = sum(item_price + shipping_cost)` per item (be careful — listings.buy_now_price is numeric)
6. INSERT order_groups row with status='pending', buyer_id, total_amount
7. For each cart item, INSERT an orders row with `order_group_id`, status='pending', transfer_status='pending', item_price, shipping_cost, seller_id, listing_id, all shipping_* fields from buyer's address
8. Create Stripe PaymentIntent on the platform account (NO `transfer_data` — money lands on InkStash):
   ```
   amount: Math.round(total_amount * 100),
   currency: 'usd',
   automatic_payment_methods: { enabled: true },
   metadata: { payment_type: 'cart', order_group_id: group.id, buyer_id: user.id }
   ```
9. UPDATE order_groups SET stripe_payment_intent_id = pi.id
10. Return `{ client_secret: pi.client_secret, order_group_id: group.id, total_amount }`

Deploy: `supabase functions deploy create-cart-payment-intent`. Commit.

---

## Task 6: `<CartCheckoutModal>` + success page

**Files:**
- Create: `src/components/cart/CartCheckoutModal.tsx`
- Create: `src/pages/CartCheckoutSuccess.tsx`
- Modify: `src/main.tsx` — add `/cart-checkout-success` route
- Modify: `CartDrawer.tsx` from Task 3 — wire the CTA stub to open this modal

**Modal:**
- MUI `<Dialog open onClose maxWidth="sm" fullWidth>`
- Read-only cart summary (same grouping as drawer)
- Call `createCartPaymentIntent()` on mount
- On success: mount `<StripePaymentElement>` with the client_secret, `returnUrl = window.location.origin + '/cart-checkout-success?order_group_id=' + groupId`, `paymentType='cart'` (extend the PaymentType union if needed)
- On stale_items error: parent (CartDrawer) removes those items from cart and shows toast "Some items in your cart are no longer available."
- On no_shipping_address error: link to settings/addresses to fix
- Loading state: spinner with "Preparing checkout…"

**Success page:**
- Reads `order_group_id` from URL
- Polls `GET /order-group/:id` every 1.5s for up to 30s
- When `status === 'paid' || 'fully_paid_out' || 'partial_payout_failed'`, redirect to `/order-group/:id`
- Timeout state: "Your payment is processing. Check My Stash → Purchases shortly."

Typecheck. Commit.

---

## Task 7: stripe-webhook cart branch — `openCartOrderGroup`

**File:** `supabase/functions/stripe-webhook/index.ts`

Add a branch in the `payment_intent.succeeded` handler:
```ts
if (intent.metadata?.payment_type === 'cart') {
  return await openCartOrderGroup(intent, supabaseUrl, serviceRoleKey, stripe)
}
```

`openCartOrderGroup` logic (per spec):
1. Find order_group by stripe_payment_intent_id. Idempotency: if status already paid/fully_paid_out, return 200.
2. UPDATE order_groups SET status='paid', paid_at=now()
3. UPDATE all child orders SET status='processing'
4. For each order:
   - If the listing has source_inventory_id: UPDATE user_inventory SET status='sold', flip ownership, INSERT inventory ownership transfer record (same pattern as M3's open-listing-order — extract that to a shared helper if you have time)
   - UPDATE listings SET status='sold' for the order's listing_id
   - Create Stripe Transfer:
     - amount = Math.round((item_price * 0.9 + shipping_cost) * 100)
     - destination = seller's stripe_connect_account_id
     - transfer_group = order_group.id
     - On success: UPDATE order SET stripe_transfer_id, transfer_status='succeeded'
     - On failure: UPDATE order SET transfer_status='failed', transfer_last_error, INSERT into failed_transfers
   - INSERT seller_payouts row (reuse the existing pattern from open-listing-order)
5. If any order has transfer_status='failed': UPDATE order_groups SET status='partial_payout_failed'. Else status='fully_paid_out', fully_paid_out_at=now()
6. Fire emails (Task 8 handles the actual templates):
   - One buyer cart summary email
   - One seller email per unique seller (with their items list)
7. Empty the buyer's cart_items

Important — clear the buyer's cart_items rows AFTER successful order creation. If the webhook fires twice, the second pass finds nothing in cart and exits idempotently after step 1.

Deploy + commit.

---

## Task 8: Emails (buyer summary + per-seller)

**Files:**
- Create: `supabase/functions/send-cart-checkout-buyer/index.ts`
- Modify: `supabase/functions/send-listing-sold-seller/index.ts` — should already work per-listing; just call it N times from the webhook.

**Buyer email:** subject "Your InkStash cart is on its way!" Body groups items by seller, shows totals, links to /order-group/:id.

Deploy. Commit.

---

## Task 9: `/order-group/:id` summary page

**File:** `src/pages/OrderGroupSummary.tsx`

- Loads the order_group + all child orders
- Shows status banner (paid / processing / partial_payout_failed)
- Lists each order with: thumbnail, title, seller pill, status, shipping tracking if shipped, link to `/order/:id` for full per-order details
- Buyer-only access (RLS handles it)

Modify `src/main.tsx` — add `/order-group/:id` route.

Typecheck. Commit.

---

## Task 10: `retry-failed-transfers` cron (optional for MVP)

**File:** `supabase/functions/retry-failed-transfers/index.ts`

Scheduled to run hourly via Supabase cron. Picks up orders where transfer_status='failed' AND transfer_attempts < 24, retries the Stripe Transfer, updates the order.

Ship without if time is tight — failed transfers will just sit until someone manually triggers a retry. ops alert can come later.

---

## Task 11: End-to-end smoke test (manual)

Per spec Section 8 — 5 scenarios. Document any bugs found and fix before PR.

Then push branch + open PR.

---

## Self-review before PR

1. Spec coverage: every section of the spec mapped to a task? Yes.
2. Placeholder scan: no TBDs in implementation code.
3. Type consistency: CartItem shape matches between context, API, drawer, modal.
4. M3 regression test: single-item buy-now from ItemDetail page still works unchanged.
