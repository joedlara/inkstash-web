-- Policy: listing a vault item forfeits the sell-back option permanently.
--
-- Users get one shot at sell-back. The moment they list an item on the
-- marketplace, they've publicly committed to selling it; we treat that as
-- giving up the buy-back guarantee. Even if they delist later, the
-- sell-back path stays closed for that specific inventory row. Their
-- options post-delist are: keep vaulted (no Rubies), or ship to themselves.
--
-- Why this matters: prevents round-trip arbitrage where a user lists at
-- $50, gets no buyers, delists, and sells back for 90% of estimated value
-- in Rubies — risk-free price discovery on InkStash's dime.

ALTER TABLE public.user_inventory
  ADD COLUMN sell_back_forfeited boolean NOT NULL DEFAULT false;

-- Backfill: any row that's currently 'listed' has implicitly forfeited.
UPDATE public.user_inventory
SET sell_back_forfeited = true
WHERE status = 'listed';

-- Extend sell_back_inventory_item to refuse forfeited rows.
-- Preserves the existing function body verbatim except for the new check
-- after the status guard.
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
  -- Lock the inventory row and validate. Joined to pack_items for the
  -- estimated_value (same as before). The select list now also pulls
  -- sell_back_forfeited so we can enforce the new policy.
  SELECT inv.id, inv.user_id, inv.status, inv.pack_item_id, inv.sell_back_forfeited,
         pi.estimated_value
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

  -- NEW: even if the row is back to 'vaulted' (e.g., after a delist), the
  -- sell-back option is permanently forfeited once the user has listed.
  IF v_inv.sell_back_forfeited THEN
    RAISE EXCEPTION 'sellback_forfeited';
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

-- Extend list_vault_item to set sell_back_forfeited=true when listing.
-- This is what makes the forfeit permanent — even on delist, the flag stays.
CREATE OR REPLACE FUNCTION public.list_vault_item(
  p_user_id uuid,
  p_inventory_id uuid,
  p_price_cents integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv             record;
  v_pack_item       record;
  v_pack            record;
  v_listing_id      uuid;
  v_image_url       text;
BEGIN
  IF p_price_cents IS NULL OR p_price_cents < 100 THEN
    RAISE EXCEPTION 'price must be at least 100 cents';
  END IF;

  SELECT * INTO v_inv
  FROM public.user_inventory
  WHERE id = p_inventory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory not found';
  END IF;

  IF v_inv.user_id != p_user_id THEN
    RAISE EXCEPTION 'not owner';
  END IF;

  IF v_inv.status != 'vaulted' THEN
    RAISE EXCEPTION 'inventory not vaulted (current status: %)', v_inv.status;
  END IF;

  SELECT * INTO v_pack_item
  FROM public.pack_items
  WHERE id = v_inv.pack_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack_item not found';
  END IF;

  SELECT * INTO v_pack
  FROM public.packs
  WHERE id = v_pack_item.pack_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack not found';
  END IF;

  IF v_pack.origin != 'house' THEN
    RAISE EXCEPTION 'cannot list vendor pack items (origin: %)', v_pack.origin;
  END IF;

  v_image_url := coalesce(v_pack_item.image_url, '');

  INSERT INTO public.listings (
    user_id,
    source_inventory_id,
    title,
    description,
    condition,
    photos,
    is_buy_now,
    buy_now_price,
    quantity,
    status,
    comic_publisher,
    comic_issue_number,
    application_fee_pct
  ) VALUES (
    p_user_id,
    p_inventory_id,
    v_pack_item.comic_title,
    NULL,
    v_pack_item.grade,
    CASE
      WHEN v_image_url != '' THEN
        jsonb_build_array(jsonb_build_object('url', v_image_url, 'type', 'general'))
      ELSE
        '[]'::jsonb
    END,
    true,
    (p_price_cents::numeric) / 100.0,
    1,
    'active',
    v_pack.partner,
    v_pack_item.issue_number,
    0.100
  )
  RETURNING id INTO v_listing_id;

  -- Flip status AND set the forfeit flag. The flag persists even after a
  -- subsequent delist, so users can never recover the sell-back path once
  -- they've listed.
  UPDATE public.user_inventory
  SET status = 'listed',
      sell_back_forfeited = true
  WHERE id = p_inventory_id;

  RETURN v_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_vault_item(uuid, uuid, integer) TO service_role;
