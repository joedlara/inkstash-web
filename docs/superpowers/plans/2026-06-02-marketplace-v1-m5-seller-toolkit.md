# Marketplace v1 / M5 — Seller Toolkit Implementation Plan

> **Goal:** Ship 3 coordinated seller features (delist, AI description, in-app shipping labels) as one PR.
>
> **Architecture:** 3 small migrations, 3 edge functions, 3 UI surfaces. No new pages — extending /seller-dashboard, /list-item, /order/:id.
>
> **Tech Stack:** Supabase Postgres + edge functions (Deno), Stripe Connect (existing), ShipEngine REST API, Anthropic Messages API (Claude Haiku 4.5).

---

## Task 1: Three additive DB migrations

**Why first:** edge functions depend on these columns existing.

- Create `supabase/migrations/20260603010000_listings_delisted_at.sql`:
  ```sql
  ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS delisted_at timestamptz;
  ```
- Create `supabase/migrations/20260603020000_anthropic_usage.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS public.anthropic_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    feature text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE public.anthropic_usage ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Service role only" ON public.anthropic_usage FOR ALL USING (false);
  -- Service role bypasses RLS; nobody else needs read.
  ```
- Create `supabase/migrations/20260603030000_orders_label_columns.sql`:
  ```sql
  ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS label_url text,
    ADD COLUMN IF NOT EXISTS label_purchased_at timestamptz;
  ```
- `supabase db push`
- Commit: `feat(db): M5 migrations — delisted_at + anthropic_usage + label cols`

---

## Task 2: Edge function `delist-listing`

**File:** `supabase/functions/delist-listing/index.ts`

**Behavior:**
1. Parse `{ listing_id }` from body
2. Verify caller's JWT, get user_id
3. SELECT listing — confirm `user_id == caller`
4. UPDATE `listings SET status='delisted', delisted_at=now()` WHERE id = listing_id
5. If `source_inventory_id` is set, UPDATE `user_inventory SET status='vaulted'` WHERE id = source_inventory_id (sell_back_forfeited stays true — do not touch it)
6. Return `{ success: true }`

**Auth:** uses service role internally for the inventory side-effect; verifies the JWT manually first.

- Deploy: `supabase functions deploy delist-listing`
- Commit: `feat(edge): delist-listing — flips listings.status + returns inventory to vaulted`

---

## Task 3: Edge function `generate-listing-description`

**File:** `supabase/functions/generate-listing-description/index.ts`

**Behavior:**
1. Parse `{ photo_urls: string[]; title?: string }` from body
2. Verify JWT, get user_id
3. Validate: 1 ≤ photo_urls.length ≤ 5
4. Build Anthropic Messages API request:
   - Model: `claude-haiku-4-5-20251001`
   - System prompt: the prompt from the spec
   - User message: array of `{ type: "image", source: { type: "url", url: <photo_url> } }` blocks + a final `{ type: "text", text: "Title: ${title}" }` block
   - Max tokens: 400 (covers 200 words comfortably)
5. Call `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY` from env
6. Extract `content[0].text` (assistant text response)
7. INSERT into `anthropic_usage`: user_id, feature='listing_description', input_tokens, output_tokens
8. Return `{ description: string }`

**Env setup:** user must `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` once.

- Deploy: `supabase functions deploy generate-listing-description`
- Commit: `feat(edge): generate-listing-description — Claude Haiku vision for product copy`

---

## Task 4: Edge function `purchase-shipping-label`

**File:** `supabase/functions/purchase-shipping-label/index.ts`

**Behavior:**
1. Parse `{ order_id }`
2. Verify JWT, get user_id
3. SELECT order joined with listings + the seller's ship-from address (from `seller_ship_from_addresses` matching `order.seller_id`)
4. Confirm `order.seller_id == caller`
5. Confirm `order.label_url IS NULL` (idempotency — don't re-buy)
6. Confirm `order.selected_shipping_rate_id` is set (was chosen at checkout)
7. Call ShipEngine: `POST https://api.shipengine.com/v1/labels/rates/{rate_id}` with `API-Key` header
8. Response includes `label_download.pdf` URL + `tracking_number` + `carrier_code`
9. UPDATE orders: `label_url`, `label_purchased_at=now()`, `tracking_number`, `carrier`, `status='shipped'`, `shipped_at=now()`
10. Invoke existing `send-shipping-notification-email` edge fn with the buyer's email + tracking info
11. Return `{ label_url, tracking_number, carrier }`

**Env:** uses existing `SHIPENGINE_API_KEY` secret.

- Deploy: `supabase functions deploy purchase-shipping-label`
- Commit: `feat(edge): purchase-shipping-label — ShipEngine label purchase + status flip + email`

---

## Task 5: Delist UI on /seller-dashboard

**File:** `src/pages/SellerDashboard.tsx` (My listings tab)

**Steps:**
1. Find the "My listings" tab — likely renders a list/grid of the user's active listings
2. Add a `<IconButton>` with `<MoreVert />` icon on each row → opens a `<Menu>` with one item: "Delist"
3. Selecting Delist opens a `<Dialog>` confirm: "Take this listing down? Buyers will no longer see it. You can list again later, but Ruby sell-back stays unavailable."
4. Confirm button calls a new `listingsAPI.delist(listingId)` → POSTs to `delist-listing` edge function
5. On success: optimistically remove the row from local state + show a toast ("Listing removed")
6. On error: show error toast, leave row visible

**API helper:** add to `src/api/listings.ts`:
```typescript
async delist(listingId: string): Promise<{ success: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const { data, error } = await supabase.functions.invoke('delist-listing', {
    body: { listing_id: listingId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw new Error(error.message);
  return data;
},
```

- Commit: `feat(seller-dashboard): delist action on active listings`

---

## Task 6: Wire "Generate from photos" button in /list-item

**File:** `src/pages/ListItem.tsx`

**Steps:**
1. The button currently exists as a disabled tooltip stub from M4 — find it (Description section, near line 820)
2. Replace `disabled` with `disabled={generatingDescription || finalUploadedPhotos.length === 0}` (where `finalUploadedPhotos` are photos with `path` set — the ones actually on Supabase Storage)
3. Add state: `const [generatingDescription, setGeneratingDescription] = useState(false)`
4. Add handler:
   ```tsx
   const handleGenerateDescription = async () => {
     const uploadedUrls = uploadedPhotos.filter(p => p.path).map(p => p.url);
     if (uploadedUrls.length === 0) {
       setSubmitError('Upload at least one photo before generating a description.');
       return;
     }
     setGeneratingDescription(true);
     try {
       const { data: { session } } = await supabase.auth.getSession();
       const { data, error } = await supabase.functions.invoke('generate-listing-description', {
         body: { photo_urls: uploadedUrls.slice(0, 5), title: title || undefined },
         headers: { Authorization: `Bearer ${session!.access_token}` },
       });
       if (error) throw new Error(error.message);
       if (data?.description) setDescription(data.description);
     } catch (err: any) {
       setSubmitError(err.message || 'Failed to generate description');
     } finally {
       setGeneratingDescription(false);
     }
   };
   ```
5. Strip the M4 tooltip + replace with live label: button shows "Generating…" with a CircularProgress when busy, otherwise "Generate from photos"
6. Remove the `Tooltip` wrapper entirely

- Commit: `feat(list-item): wire Generate-from-photos button to Claude vision`

---

## Task 7: Shipping label UI on /order/:id

**File:** `src/pages/OrderManagement.tsx`

**Steps:**
1. After loading the order, derive `isSeller` (already exists)
2. Add a new section between "Order Status" and "Customer Information" called **"Shipping label"** that renders only when `isSeller`:
   - If `order.label_url` is null:
     - Show the buyer's shipping address + a **"Buy + print label"** button (red Brand button)
     - Click → `setLabelLoading(true)` → call `ordersAPI.purchaseLabel(orderId)` → on success, reload the order (status will now be 'shipped', label_url set)
   - If `order.label_url` is set:
     - Show tracking number, carrier, "Print label" button (opens `label_url` in new tab)
3. Add `purchaseLabel(orderId)` to `src/api/orders.ts`:
   ```typescript
   async purchaseLabel(orderId: string): Promise<{ label_url: string; tracking_number: string; carrier: string }> {
     const { data: { session } } = await supabase.auth.getSession();
     const { data, error } = await supabase.functions.invoke('purchase-shipping-label', {
       body: { order_id: orderId },
       headers: { Authorization: `Bearer ${session!.access_token}` },
     });
     if (error) throw new Error(error.message);
     return data;
   },
   ```
4. Add `Order.label_url` + `Order.label_purchased_at` to the TS type (they auto-arrive in `select *`)

- Commit: `feat(orders): in-app ShipEngine label purchase on /order/:id`

---

## Task 8: Smoke test

Manual end-to-end:

1. **Delist:** create listing A → confirm it shows in /marketplace → /seller-dashboard → delist → confirm gone from /marketplace AND inventory row (if from vault) flipped back to 'vaulted' AND `sell_back_forfeited` still true.
2. **AI description:** start a listing → upload 2 photos of a comic → click "Generate from photos" → wait ~5s → description appears → save draft → reload → resume → description preserved → submit.
3. **Buy label:** buy a listing from a 2nd account → switch to seller → /order/:id → see "Shipping label" section → click "Buy + print label" → wait → label opens in new tab → tracking displays → switch back to buyer → /order/:id shows tracking → buyer's email got the shipping notification.
4. **No console regressions** anywhere.

Verify `ANTHROPIC_API_KEY` is set in Supabase secrets BEFORE running the AI test.

---

## Task 9: PR

```bash
git push -u origin marketplace-v1-m5
```

PR title: `Marketplace v1 / M5 — Seller toolkit (delist + AI descriptions + in-app labels)`

PR body:

```markdown
## Summary

M5 closes the seller workflow loop with three coordinated features:

1. **Delist** — sellers can take an active listing down from /seller-dashboard. Flips listings.status to 'delisted', returns the source inventory row to 'vaulted' (sell-back stays forfeited per M2 policy).
2. **AI description** — the M4 "Generate from photos" stub button now actually works. Sends photo URLs + title to Claude Haiku 4.5 vision; ~5s later, a 100-200 word product description populates the textarea.
3. **In-app shipping labels** — /order/:id seller view gets a "Buy + print label" button. Hits ShipEngine with the rate the buyer chose at checkout, stores label_url + tracking_number, auto-flips order to 'shipped' (which triggers the existing shipping email).

## Migrations

- `20260603010000_listings_delisted_at.sql` — `listings.delisted_at timestamptz`
- `20260603020000_anthropic_usage.sql` — usage log table for cost tracking
- `20260603030000_orders_label_columns.sql` — `orders.label_url`, `orders.label_purchased_at`

## New edge functions

- `delist-listing`
- `generate-listing-description` (requires `ANTHROPIC_API_KEY` secret)
- `purchase-shipping-label`

## Test plan

- [x] Delist from /seller-dashboard → listing disappears from /marketplace, inventory returns to vaulted
- [x] Generate description with 2-3 photos → relevant copy appears in ~5s
- [x] Buy label from /order/:id → label opens in new tab, order flips to 'shipped', buyer gets email
- [x] No console regressions

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- Commit: `docs(plan): M5 seller toolkit plan + spec`
- Push branch + open PR
