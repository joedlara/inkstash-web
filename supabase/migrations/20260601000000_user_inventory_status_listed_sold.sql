-- Extend user_inventory.status to allow 'listed' and 'sold' for marketplace flows.
--
-- The original constraint (from 20260522030000) only permitted vaulted,
-- sold_back, shipping_pending, shipped. M2's list_vault_item RPC sets
-- status='listed' on a successful listing creation. M3's open-listing-order
-- (not shipped yet) will set status='sold' when a vault listing's buyer pays.
--
-- Without this expansion, the M2 vault listing RPC fails with a check
-- constraint violation immediately after the listings INSERT, which leaves
-- a phantom listing row behind because the transaction rolls back the
-- inventory UPDATE but not the listing INSERT (PostgreSQL is all-or-nothing
-- within a single function so actually both roll back — but the symptom from
-- the user's perspective is "List for sale modal returns a 400 with cryptic
-- error and nothing visibly changes").

ALTER TABLE public.user_inventory
  DROP CONSTRAINT IF EXISTS user_inventory_status_check;

ALTER TABLE public.user_inventory
  ADD CONSTRAINT user_inventory_status_check
  CHECK (status IN ('vaulted', 'sold_back', 'shipping_pending', 'shipped', 'listed', 'sold'));
