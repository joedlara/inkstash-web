-- supabase/migrations/20260602010000_marketplace_order_schema_fixes.sql
--
-- Schema fixes required for the open-listing-order edge function (M3-Task9).
--
-- Three issues with the existing schema that block marketplace listing orders:
--
--   1. orders.purchase_type CHECK only allows 'buy_now' and 'bid_won'.
--      Listing orders need 'listing'. Drop + re-add the constraint.
--
--   2. orders shipping snapshot columns (shipping_full_name, etc.) are NOT NULL.
--      For marketplace listing orders, the buyer's shipping address is captured
--      at checkout (stored as shipping_address_id FK to user_addresses) but the
--      denormalized snapshot columns are a legacy pattern from the auction flow
--      that embedded the address at order-creation time. For listing orders the
--      snapshot is populated when the item ships (Phase 7). Make them nullable.
--
--   3. seller_payouts.pack_id and seller_payouts.pack_purchase_id are NOT NULL.
--      Marketplace listing payouts are not associated with a pack purchase.
--      Make both nullable so the INSERT can pass NULL for these columns.

-- ── 1. orders.purchase_type: expand allowed values ───────────────────────────

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_purchase_type_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_purchase_type_check
    CHECK (purchase_type IN ('buy_now', 'bid_won', 'listing'));

-- ── 2. orders: make shipping snapshot columns nullable ───────────────────────
-- These were NOT NULL in the original auction order flow. Listing orders
-- capture the address via shipping_address_id FK; the snapshot is filled at
-- ship time. Both FK column and snapshot columns coexist for backward compat.

ALTER TABLE public.orders
  ALTER COLUMN shipping_full_name     DROP NOT NULL,
  ALTER COLUMN shipping_address_line1 DROP NOT NULL,
  ALTER COLUMN shipping_city          DROP NOT NULL,
  ALTER COLUMN shipping_state         DROP NOT NULL,
  ALTER COLUMN shipping_postal_code   DROP NOT NULL,
  ALTER COLUMN shipping_country       SET DEFAULT 'US';

-- ── 3. seller_payouts: make pack columns nullable ────────────────────────────
-- The table was created for vendor pack payouts where pack_id and
-- pack_purchase_id were always present. Marketplace listing payouts have
-- neither — they are keyed only by stripe_payment_intent_id.

ALTER TABLE public.seller_payouts
  ALTER COLUMN pack_id          DROP NOT NULL,
  ALTER COLUMN pack_purchase_id DROP NOT NULL;
