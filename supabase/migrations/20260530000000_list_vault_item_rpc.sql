-- Atomic vault listing creation.
--
-- Given a user's vault inventory row, atomically:
--   1. Validate the inventory belongs to the user and is currently 'vaulted'
--   2. Validate the underlying pack is house-origin (vendor packs cannot be listed)
--   3. INSERT a listings row with source_inventory_id link + comic metadata
--      pulled from the pack_item join
--   4. UPDATE user_inventory.status to 'listed'
--   5. Return the new listing id
--
-- All-or-nothing. SECURITY DEFINER so RLS doesn't fight the cross-table reads.

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
  -- Sanity check the price
  IF p_price_cents IS NULL OR p_price_cents < 100 THEN
    RAISE EXCEPTION 'price must be at least 100 cents';
  END IF;

  -- Load inventory row + verify ownership + status
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

  -- Load pack_item + pack to get metadata
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

  -- Only house pack items can be listed in v1 (vendor pack items are the
  -- vendor's product to control)
  IF v_pack.origin != 'house' THEN
    RAISE EXCEPTION 'cannot list vendor pack items (origin: %)', v_pack.origin;
  END IF;

  -- Build the photos JSONB array from pack_item.image_url
  v_image_url := coalesce(v_pack_item.image_url, '');

  -- Insert the listing
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
    v_pack_item.grade, -- e.g. "CGC 9.8"; nullable
    CASE
      WHEN v_image_url != '' THEN
        jsonb_build_array(jsonb_build_object('url', v_image_url, 'type', 'general'))
      ELSE
        '[]'::jsonb
    END,
    true,                                 -- is_buy_now
    (p_price_cents::numeric) / 100.0,     -- buy_now_price stored as USD numeric
    1,                                    -- quantity
    'active',
    v_pack.partner,                       -- pack.partner often equals publisher for house packs
    v_pack_item.issue_number,
    0.100                                 -- 10% application fee, snapshotted
  )
  RETURNING id INTO v_listing_id;

  -- Flip the inventory status
  UPDATE public.user_inventory
  SET status = 'listed'
  WHERE id = p_inventory_id;

  RETURN v_listing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_vault_item(uuid, uuid, integer) TO service_role;
