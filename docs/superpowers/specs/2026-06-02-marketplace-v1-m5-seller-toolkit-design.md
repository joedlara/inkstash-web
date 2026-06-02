# Marketplace v1 / M5 — Seller Toolkit Design Spec

**Goal:** Close the loop on the seller workflow. Sellers can take a listing down, generate a good product description from photos with one click, and buy a shipping label from inside the order page without leaving the app.

**Three coordinated features, one PR:**

1. **Delist** — pull an active listing from the marketplace feed
2. **AI description from photos** — Claude vision generates the listing copy
3. **In-app ShipEngine label purchase** — buy + print labels from `/order/:id`

---

## Section 1 — Delist

### Behavior

- Seller's `/seller-dashboard` "My listings" tab gets a **Delist** action on each active listing row (kebab menu or trailing button).
- Clicking opens a confirmation dialog ("Take this listing down? Buyers will no longer see it. You can list again later, but Ruby sell-back stays unavailable.")
- On confirm: `UPDATE listings SET status = 'delisted', delisted_at = now() WHERE id = ? AND user_id = auth.uid()`.
- Listing immediately disappears from `query_marketplace_feed` (already filters `status = 'active'`).
- For vault items: the corresponding `user_inventory` row stays at `status='listed'` BUT we add an "Available actions" state: the inventory row becomes inert (no Keep/Sell-back/Ship/List buttons — already enforced by `sell_back_forfeited`; we just need the row to not be re-listable from the inventory either, since it's still considered "committed" until the seller does something with it).

  **Decision:** delisting flips `user_inventory.status` back from `'listed'` to `'vaulted'` AND keeps `sell_back_forfeited = true`. The seller can re-list (creates a fresh listing row) or ship to themselves, but cannot sell-back. This matches the spec's stated forfeit policy.

### Data model

No new columns required. Reusing existing:
- `listings.status` already accepts `'delisted'` (added in earlier schema)
- `listings.delisted_at timestamptz` — **NEW column**, nullable
- `user_inventory.sell_back_forfeited` already exists

Migration: `20260603010000_listings_delisted_at.sql`

```sql
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS delisted_at timestamptz;
```

### Edge function: `delist-listing`

```typescript
// Body: { listing_id: string }
// Auth: caller must be listings.user_id
// Steps:
//   1. Verify ownership
//   2. UPDATE listings SET status='delisted', delisted_at=now() WHERE id=? AND user_id=?
//   3. If source_inventory_id IS NOT NULL: UPDATE user_inventory SET status='vaulted' WHERE id=source_inventory_id (sell_back_forfeited stays true)
//   4. Return { success: true }
```

Why an edge function not a direct UPDATE? Because the inventory side-effect needs the service role to bypass RLS, and we want atomicity.

### UI

In `src/pages/SellerDashboard.tsx`, "My listings" tab. Each active row gets:
- Trailing icon button (three-dot menu) with one action: **Delist**
- Confirmation `<Dialog>` before firing the action
- On success: optimistically remove from list + show a toast

---

## Section 2 — AI description from photos

### User flow

1. Seller fills title + uploads 1+ photos on `/list-item` (or on `/edit-listing/:id` — future).
2. The "✨ Generate from photos" button (stub I added in M4) becomes enabled once `uploadedPhotos.length >= 1`.
3. Click → button shows spinner ("Generating…") → ~3-8s later → description textarea is populated with a 100-200 word product description.
4. Seller can edit the result freely. No undo needed — it's just text.

### Prompt design

Claude prompt (sent via edge function — never expose API key client-side):

```
You are writing a product description for a comic book marketplace listing on InkStash. The seller has uploaded these photos of the comic:

[image_url 1]
[image_url 2]
...

Title (as the seller entered it): "{title}"

Write a 100-200 word product description in a friendly, knowledgeable tone. Cover:
- What the comic is (title, issue, publisher if visible)
- Visible condition notes (creases, color, spine, corners)
- Anything noteworthy from the cover (variant, signed, sealed, key issue if you recognize it)
- Don't speculate about value or pricing
- Don't make claims you can't see (no "first appearance of X" unless the cover/indicia confirms it)
- Don't write a sales pitch with exclamation points

Plain prose, no markdown, no bullet points.
```

### Edge function: `generate-listing-description`

```typescript
// Body: { photo_urls: string[]; title: string }
// Auth: any signed-in user
// Steps:
//   1. Validate at least 1 photo, max 5 (cap cost)
//   2. Build messages array for Claude with type="image" content blocks
//   3. Call Anthropic Messages API with claude-haiku-4-5-20251001 (cheap + fast for this)
//   4. Return { description: string } (200 word cap on the response, hard-truncate if longer)
//   5. Log usage to a simple anthropic_usage table for cost tracking
```

Cost guardrails:
- Hard cap 5 photos per call
- Use Haiku 4.5 (cheap + good enough for product descriptions)
- One call per click only (no retries on transient errors — user can click again)

### Data model

New table: `anthropic_usage` (simple usage log for ops visibility)

```sql
CREATE TABLE public.anthropic_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  feature text NOT NULL,             -- 'listing_description'
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz DEFAULT now()
);
```

Migration: `20260603020000_anthropic_usage.sql`

### Env

New Supabase secret: `ANTHROPIC_API_KEY`. User sets this in the Supabase dashboard.

### UI changes

In `src/pages/ListItem.tsx`:
- Replace the disabled "Generate from photos" button's `disabled` to be `disabled={uploadedPhotos.length === 0 || generating}`.
- Add `generating` state + a `handleGenerateDescription` async fn that calls the new edge fn.
- Strip the "AI description coming soon" tooltip; replace with a real loading state.

---

## Section 3 — In-app ShipEngine label purchase

### User flow

1. Order lands (buyer pays via M3 flow). Seller view of `/order/:id` shows order details.
2. New section: **"Shipping label"** card.
3. If label not yet purchased: shows the buyer's shipping address + a **"Buy + print label"** button.
4. Seller clicks → loading state → ShipEngine purchases label → response includes label URL + tracking number.
5. Card now shows:
   - Tracking number
   - "Print label" button (opens PDF in new tab)
   - Carrier name
6. Order status auto-flips to `'shipped'`, which triggers the existing `send-shipping-notification-email` to the buyer (already wired in `OrderManagement.tsx`).

### Edge function: `purchase-shipping-label`

```typescript
// Body: { order_id: string }
// Auth: caller must be orders.seller_id
// Steps:
//   1. Fetch order + listing + the seller's ship-from address (from seller_ship_from_addresses)
//   2. Fetch the rate the buyer selected at checkout (orders.selected_shipping_rate_id → shipping_rates row)
//   3. Call ShipEngine POST /labels/rates/{rateId} (single-step purchase against the rate ID)
//   4. UPDATE orders SET label_url=?, tracking_number=?, carrier=?, status='shipped', shipped_at=now()
//   5. Fire send-shipping-notification-email (already exists, just needs to be invoked)
//   6. Return { label_url, tracking_number, carrier }
```

### Data model

`orders` table — needs:
- `label_url text` — **NEW column**, nullable
- `label_purchased_at timestamptz` — **NEW column**, nullable
- `tracking_number text` — already exists
- `carrier text` — already exists

Migration: `20260603030000_orders_label_columns.sql`

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS label_url text,
  ADD COLUMN IF NOT EXISTS label_purchased_at timestamptz;
```

### Cost handling (per Q4)

Seller pays via ShipEngine. We use a shared InkStash ShipEngine API key. The seller's payout from the buyer's shipping_cost line item nets out the actual label cost — but we don't track that delta separately in v1. Operationally: InkStash absorbs any rate vs cost difference. Real billing engineering deferred.

### UI changes

In `src/pages/OrderManagement.tsx`:
- New "Shipping label" card visible only when `isSeller && !order.label_url`
- Button calls `purchaseShippingLabel(orderId)`
- After success, swap card to show tracking + print button
- If `order.label_url` already exists, render the print/tracking view directly

---

## Out of scope for M5

- Refunds + chargebacks (Section 6 of original spec)
- ShipEngine return labels
- Multi-carrier rate shopping in the seller UI (we use the buyer's chosen rate)
- Voiding a purchased label (rare; manual ops for now)
- Per-seller ShipEngine accounts (single shared key)
- Anthropic cost reporting UI (just log to anthropic_usage)
- Auto-generating description on photo upload (manual click only per Q2)

---

## Test plan (manual smoke)

1. **Delist:** create a listing → see it on marketplace → from /seller-dashboard click Delist → confirm → listing vanishes from /marketplace AND from your inventory row (status flips back to 'vaulted', sell_back stays forfeited).
2. **AI description:** start a new listing → upload 2-3 photos of a comic → click "Generate from photos" → wait ~5s → description textarea populates with relevant copy → manually edit, save draft, resume → description persists.
3. **Buy label:** buy a listing from a 2nd account → switch to seller account → open /order/:id → click "Buy + print label" → wait → label opens in new tab → buyer gets shipping email with tracking → order shows tracking + "Shipped" status on /order/:id for both buyer and seller.
4. **Migrations apply cleanly to remote.**
5. **No console regressions on /list-item, /order/:id, /seller-dashboard.**

---

## Implementation order

1. Migrations (additive, safe)
2. Edge functions (delist-listing, generate-listing-description, purchase-shipping-label)
3. SellerDashboard delist UI
4. ListItem AI description button wired
5. OrderManagement label UI
6. Smoke test
7. PR
