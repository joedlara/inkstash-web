# Drops v1 — Scheduled-Release Sale Items Design Spec

**Goal:** Add **drops** as a new sale type alongside the existing marketplace listings + packs. A drop is a single sellable item or pack scheduled to go live at a future timestamp with a fixed, limited quantity. First-come-first-serve until sold out.

**Why not just use listings?** Listings are single-quantity, always-active-on-create, and seller-authored. Drops are multi-quantity, time-gated, and (for v1) admin-curated. Different lifecycle = different table.

**Out of scope (deferred):**
- Vendor self-service drop authoring → admin script for v1
- Drops inside livestreams → that's the livestream milestone
- Per-user purchase limits ("1 per customer") → flagged as a follow-up
- Waitlists for sold-out drops
- Pre-orders / "save your spot" reservations

---

## Section 1 — What a drop IS

A `drops` row represents one scheduled-release product. It has:

- `go_live_at` — when buying becomes possible
- `quantity_total` — how many copies exist for sale
- `quantity_sold` — counter, server-incremented atomically on purchase
- `price` — fixed USD amount per copy
- Linked content (one of: a `listings` row, a `packs` row, or just inline metadata) — see Section 2

The lifecycle states are derived, not stored:

| State | Condition | UI |
|---|---|---|
| Upcoming | `now() < go_live_at` | Show with countdown, "Drops in 2h 14m" |
| Live | `go_live_at <= now() && quantity_sold < quantity_total` | "Buy now" enabled, "X / Y remaining" |
| Sold out | `quantity_sold >= quantity_total` | "Sold out" badge, buy disabled |
| Ended | (none in v1 — sold-out is permanent; we can add a `closes_at` later) | n/a |

---

## Section 2 — What CAN a drop link to?

Per your scope answer: "drops don't necessarily just have to be packs, they can be exclusive variants of a vendor." So drops are polymorphic:

```sql
drop_kind enum:
  'listing'        -- drop is selling an existing listings row (e.g., a vendor exclusive variant cover)
  'pack'           -- drop is selling a packs row (e.g., a scheduled pack release)
  'standalone'     -- drop has inline metadata, no listings/packs row (e.g., a one-off signed comic with title + image + price)
```

For v1 we ship `'listing'` and `'pack'` since those reuse existing buy flows. `'standalone'` is queued as a follow-up — same DB shape, different fulfillment path (no inventory transfer needed since it's not tied to a listing or pack).

### Decision: drops do NOT duplicate the priced row. They WRAP it.

A drop_kind='listing' row has `listing_id` pointing at a listings row. The listing is `status='active'`, `quantity=quantity_total`, `buy_now_price=drop.price`. The drop adds the time gate + sold-out gate on top.

**Why:** the M3 listing buy flow already handles destination charges, vault inventory, payouts, emails. Drops shouldn't fork it.

The listing's owning user is the vendor / admin who set up the drop. RLS on listings already lets the seller manage their row.

---

## Section 3 — Data model

```sql
CREATE TYPE drop_kind AS ENUM ('listing', 'pack', 'standalone');

CREATE TABLE public.drops (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                drop_kind NOT NULL,
  listing_id          uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  pack_id             uuid REFERENCES public.packs(id) ON DELETE CASCADE,
  -- Inline metadata for kind='standalone' (v2+)
  title               text,
  description         text,
  cover_url           text,
  -- Pricing + supply
  price               numeric(10, 2) NOT NULL,
  quantity_total      integer NOT NULL CHECK (quantity_total > 0),
  quantity_sold       integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  -- Scheduling
  go_live_at          timestamptz NOT NULL,
  -- Display
  hero_image_url      text,
  vendor_id           uuid REFERENCES public.users(id),
  is_featured         boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  -- Integrity: exactly one content link per kind
  CHECK (
    (kind = 'listing' AND listing_id IS NOT NULL AND pack_id IS NULL) OR
    (kind = 'pack' AND pack_id IS NOT NULL AND listing_id IS NULL) OR
    (kind = 'standalone' AND listing_id IS NULL AND pack_id IS NULL AND title IS NOT NULL)
  ),
  CHECK (quantity_sold <= quantity_total)
);

CREATE INDEX drops_go_live_at_idx ON public.drops (go_live_at);
CREATE INDEX drops_vendor_id_idx ON public.drops (vendor_id) WHERE vendor_id IS NOT NULL;

ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

-- Anyone can read drops (browse the /drops grid).
CREATE POLICY "Drops are public" ON public.drops
  FOR SELECT USING (true);

-- Write access is service-role only for v1 (admin-authored via script).
-- A vendor self-service migration ships later when we have a vendor dashboard.
```

### Atomic sold-out: a function, not a trigger

A row-level CHECK constraint blocks oversells (`quantity_sold > quantity_total`), but doesn't prevent the race where two simultaneous buys both pass an in-app "is there capacity?" check and both insert. The proper guard is a **single SECURITY DEFINER function** that:

1. Locks the drops row `FOR UPDATE`
2. Increments quantity_sold if capacity remains
3. Returns ok / sold_out
4. Then the calling edge function proceeds to create the PaymentIntent if ok, fails fast if sold_out

```sql
CREATE FUNCTION public.reserve_drop_capacity(p_drop_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_drop record;
BEGIN
  SELECT id, quantity_total, quantity_sold, go_live_at
    INTO v_drop FROM public.drops WHERE id = p_drop_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'drop_not_found'; END IF;
  IF v_drop.go_live_at > now() THEN RAISE EXCEPTION 'not_yet_live'; END IF;
  IF v_drop.quantity_sold >= v_drop.quantity_total THEN RETURN false; END IF;

  UPDATE public.drops SET quantity_sold = quantity_sold + 1 WHERE id = p_drop_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_drop_capacity(uuid) TO service_role;
```

Refund flow (if buyer's PaymentIntent fails mid-flight): decrement quantity_sold. Spec'd in Section 6.

---

## Section 4 — Buy flow

### Drops-of-kind='listing'

1. Buyer clicks "Buy now" on `/drop/:id`
2. Frontend calls `create-drop-payment-intent` edge fn with `{ drop_id }`
3. Edge fn calls `reserve_drop_capacity(p_drop_id)`:
   - returns false → respond `{ error: 'sold_out' }` → UI flips to sold-out state
   - throws `not_yet_live` → respond `{ error: 'not_yet_live' }` → UI shows countdown
   - returns true → proceed
4. Edge fn looks up the linked listing, creates a destination-charge PaymentIntent on the seller's Connect account (reuses `create-payment-intent` logic with `payment_type='listing'`)
5. Edge fn writes the drop_id into the PI metadata so the webhook can correlate
6. Returns client_secret + drop info
7. Buyer completes Stripe payment
8. Webhook fires `open-listing-order` as it does today, PLUS records the drop_id on the order row

If the PaymentIntent **fails** (card declined, abandoned checkout): the capacity was reserved but never sold. A periodic cleanup releases it back. Section 6 details.

### Drops-of-kind='pack'

Same shape but PaymentIntent uses `payment_type='vendor_pack'` and the webhook fires `open-vendor-pack`. The pack metadata (rarity probs, contents) lives in the existing `packs` row.

---

## Section 5 — UI surfaces

### `/drops` — grid of all drops

- Default sort: live now first, then upcoming sorted by `go_live_at ASC`, then sold-out
- Filter pills: All / Live now / Upcoming / Sold out
- Each tile shows: hero image, title, price, state badge, countdown if upcoming, `quantity_sold / quantity_total` if live
- Tile click → `/drop/:id`

### `/drop/:id` — detail page

Reuses the visual language of `/item/:id` but specialized:
- Big hero image + title + price
- **State banner** (the most important element):
  - Upcoming: "Drops in 2d 14h 22m" with a live countdown
  - Live: "47 of 500 sold" + Buy Now button
  - Sold out: "Sold out" grey badge + maybe "Notify me of similar drops" follow-up
- If kind='pack': show pack contents preview (reuse `PackContentsGrid`)
- If kind='listing': show comic metadata (writer, artist, etc.)

### Home countdown banner

The next upcoming drop (or live drop) gets a banner at the top of `/home`. Replaces the hardcoded countdown that lives there today.

### `/seller-dashboard` — read-only "My drops" section (vendor view)

If `vendor_id = current user`, show a table of their drops with sold/total counters. No CRUD in v1 — admin script only.

---

## Section 6 — Failure handling

### Buyer abandons checkout mid-flow
- Capacity was reserved (`quantity_sold + 1`) but no PaymentIntent succeeded
- Solution: cron that watches `payment_intents` (Stripe API) and releases reserved capacity for any PI created >30 min ago that's still `requires_payment_method` or `canceled` and has `drop_id` in metadata
- For v1, the simplest path: **don't reserve until just before Stripe confirms.** Reserve in step 3 of the buy flow (the edge fn call) and accept that this small window allows abandon-then-someone-else-buys-the-spot. The buyer in step 3 then gets `sold_out` instead of completing — annoying but not catastrophic.

**Decision for v1:** reserve at PI-create time. Accept the abandon-locks-spot risk. Add a Cleanup edge function in v1.1 that releases reserved capacity for PIs older than 30 min that aren't succeeded.

### Buyer's PI succeeds but webhook fails
- The webhook delivery retry handles this (Stripe retries with exponential backoff)
- Same as cart — capacity already reserved, the order eventually completes

### Drop's linked listing goes 'sold' before the drop times out
- The listing's `status = 'sold'` is only set after a buy_now flow completes
- We never call the standalone buy_now on a drop-linked listing — the drop's own flow is the only entry point
- So this can't happen; listings backing drops are inert from the listing UI's perspective

---

## Section 7 — File map

### Migrations (new)
- `20260603080000_create_drops.sql` — table + indexes + RLS + `reserve_drop_capacity()` function

### Edge functions (new)
- `create-drop-payment-intent` — reserves capacity, creates PaymentIntent, returns client_secret

### Edge function modifications
- `stripe-webhook`: write `drop_id` from PI metadata onto the order row so we can track which drops sold

### Frontend (new files)
- `src/api/drops.ts` — list/get drops, createDropPaymentIntent helper
- `src/pages/Drops.tsx` — grid of all drops (NEW; replaces whatever's there from old phase 4 plan)
- `src/pages/DropDetail.tsx` — single drop with countdown / buy / sold-out states
- `src/components/drops/DropCard.tsx` — tile used in the grid
- `src/components/drops/DropCountdown.tsx` — reusable countdown component

### Frontend (modified)
- `src/main.tsx` — add `/drops` (rename existing if needed) and `/drop/:id` routes
- `src/pages/Home.tsx` — wire countdown banner to next upcoming drop
- `src/components/layout/AppSidebar.tsx` — verify "Drops" nav already exists and points at `/drops`

### Admin scripts
- `scripts/create-drop.mjs` — wraps an INSERT into `drops`. Required args: `--kind`, `--linked-id`, `--price`, `--quantity`, `--go-live-at`, `--hero-image-url`. Mirrors the existing `create-vendor-pack.mjs` pattern.

---

## Section 8 — Test plan

1. **Upcoming drop** — seed a drop with `go_live_at` 1 hour in the future. /drops shows countdown. /drop/:id shows the countdown banner. Buy Now button disabled.
2. **Live drop** — seed with `go_live_at` in the past, quantity 5. Buy Now works. quantity_sold increments. /drops shows "X / 5 sold".
3. **Sold-out race** — flip go_live_at to now, quantity 1. Open two browser sessions, click Buy at the same moment. One succeeds, the other gets `sold_out` toast.
4. **Buy a kind='listing' drop** → reuses M3 buy flow, order lands in /purchases.
5. **Buy a kind='pack' drop** → reuses pack-open flow, pack appears in inventory.
6. **Home banner** — verify the next upcoming drop is shown on /home with a live countdown.

---

## Section 9 — Implementation order

1. Migration (table + function + RLS)
2. Admin script to seed a drop
3. drops API client + a couple of seed rows for testing
4. `<DropCard>` + `<DropCountdown>` components
5. `/drops` grid page
6. `/drop/:id` detail page
7. `create-drop-payment-intent` edge fn
8. Stripe webhook side-effect to record drop_id on orders
9. Home page banner wired to next upcoming drop
10. Smoke test all 6 scenarios
11. PR
