-- Drops v1 fix: release_drop_capacity() to roll back a provisional
-- reservation when Stripe PaymentIntent creation fails.
--
-- Original reserve_drop_capacity() bumps quantity_sold up-front so two
-- concurrent buyers can't both pass the capacity check. If the subsequent
-- Stripe call throws (placeholder Connect ID, declined card setup, etc.),
-- the reservation was never used — without a release path the counter
-- drifts forever, eventually marking real drops as sold out.

CREATE OR REPLACE FUNCTION public.release_drop_capacity(p_drop_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.drops
    SET quantity_sold = GREATEST(0, quantity_sold - 1)
    WHERE id = p_drop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_drop_capacity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_drop_capacity(uuid) TO service_role;
