-- Drops v1.1: multi-copy capacity reservation.
--
-- reserve_drop_capacity(uuid) reserves a single copy. The multi-copy variant
-- locks the drops row FOR UPDATE, checks N copies are available, then bumps
-- quantity_sold by N atomically. Same race semantics as the single-copy
-- function: two concurrent buyers asking for 6 of 10 can't both succeed.
--
-- The companion release_drop_capacity_n(uuid, int) rolls back N if PI
-- creation fails after a successful reservation.

CREATE OR REPLACE FUNCTION public.reserve_drop_capacity_n(p_drop_id uuid, p_qty integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_drop record;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN RAISE EXCEPTION 'qty_must_be_positive'; END IF;

  SELECT id, quantity_total, quantity_sold, go_live_at
    INTO v_drop
    FROM public.drops
    WHERE id = p_drop_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'drop_not_found'; END IF;
  IF v_drop.go_live_at > now() THEN RAISE EXCEPTION 'not_yet_live'; END IF;
  IF v_drop.quantity_sold + p_qty > v_drop.quantity_total THEN RETURN false; END IF;

  UPDATE public.drops
    SET quantity_sold = quantity_sold + p_qty
    WHERE id = p_drop_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_drop_capacity_n(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_drop_capacity_n(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_drop_capacity_n(p_drop_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN RETURN; END IF;
  UPDATE public.drops
    SET quantity_sold = GREATEST(0, quantity_sold - p_qty)
    WHERE id = p_drop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_drop_capacity_n(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_drop_capacity_n(uuid, integer) TO service_role;
