-- user_inventory: one row per comic the user has pulled from a pack.
-- Tracks lifecycle (vaulted / sold_back / shipping_pending / shipped).
-- Backbone of Phase 3.5 keep/sell/ship + the future Inkstash marketplace.

CREATE TABLE IF NOT EXISTS public.user_inventory (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_purchase_id      uuid NOT NULL REFERENCES public.pack_purchases(id) ON DELETE CASCADE,
  pack_item_id          uuid NOT NULL REFERENCES public.pack_items(id),
  status                text NOT NULL DEFAULT 'vaulted'
                          CHECK (status IN ('vaulted', 'sold_back', 'shipping_pending', 'shipped')),
  sold_back_rubies      integer,
  sold_back_at          timestamptz,
  shipping_requested_at timestamptz,
  shipped_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user
  ON public.user_inventory(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_inventory_purchase
  ON public.user_inventory(pack_purchase_id);

CREATE INDEX IF NOT EXISTS idx_user_inventory_status
  ON public.user_inventory(user_id, status);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_inventory"
  ON public.user_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Sell back a single inventory item:
--  - validate ownership + current status='vaulted'
--  - compute payout = floor(estimated_value * 0.9 * 100) Rubies
--  - update inventory row (status='sold_back', sold_back_rubies, sold_back_at)
--  - credit user.ruby_balance
--  - insert a ruby_transactions row (kind='sellback')
-- All-or-nothing.
CREATE OR REPLACE FUNCTION public.sell_back_inventory_item(
  p_user_id        uuid,
  p_inventory_id   uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv         record;
  v_estimated   numeric;
  v_payout      integer;
BEGIN
  -- Lock the inventory row and validate
  SELECT inv.id, inv.user_id, inv.status, inv.pack_item_id, pi.estimated_value
    INTO v_inv
    FROM public.user_inventory inv
    JOIN public.pack_items pi ON pi.id = inv.pack_item_id
   WHERE inv.id = p_inventory_id
     FOR UPDATE OF inv;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_not_found';
  END IF;

  IF v_inv.user_id <> p_user_id THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_inv.status <> 'vaulted' THEN
    RAISE EXCEPTION 'not_sellable: status is %', v_inv.status;
  END IF;

  v_estimated := COALESCE(v_inv.estimated_value, 0);
  IF v_estimated <= 0 THEN
    RAISE EXCEPTION 'no_estimated_value';
  END IF;

  -- 90% buyback rate * 100 Rubies/USD = floor(estimated_value * 90)
  v_payout := floor(v_estimated * 90)::integer;

  IF v_payout <= 0 THEN
    RAISE EXCEPTION 'no_payout';
  END IF;

  UPDATE public.user_inventory
     SET status = 'sold_back',
         sold_back_rubies = v_payout,
         sold_back_at = now()
   WHERE id = p_inventory_id;

  UPDATE public.users
     SET ruby_balance = ruby_balance + v_payout
   WHERE id = p_user_id;

  INSERT INTO public.ruby_transactions (user_id, delta, kind, pack_purchase_id)
    SELECT p_user_id, v_payout, 'sellback', inv.pack_purchase_id
      FROM public.user_inventory inv
     WHERE inv.id = p_inventory_id;

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.sell_back_inventory_item(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sell_back_inventory_item(uuid, uuid) TO service_role;

-- Mark an inventory item as ship-requested. Stubs the request; real ShipStation
-- fulfillment lives in Phase 4.
CREATE OR REPLACE FUNCTION public.request_ship_inventory_item(
  p_user_id        uuid,
  p_inventory_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_owner  uuid;
BEGIN
  SELECT user_id, status
    INTO v_owner, v_status
    FROM public.user_inventory
   WHERE id = p_inventory_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_not_found';
  END IF;

  IF v_owner <> p_user_id THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_status <> 'vaulted' THEN
    RAISE EXCEPTION 'not_shippable: status is %', v_status;
  END IF;

  UPDATE public.user_inventory
     SET status = 'shipping_pending',
         shipping_requested_at = now()
   WHERE id = p_inventory_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_ship_inventory_item(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_ship_inventory_item(uuid, uuid) TO service_role;
