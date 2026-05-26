-- Shipping addresses on file. One default per user (enforced by partial
-- unique index, same pattern as user_payment_methods). The Ship request
-- flow captures these on first use and skips the modal afterward.
--
-- This is intentionally NOT KYC-verified data. Full identity verification
-- is gated to marketplace selling / live-auction selling in Phase 5+.

CREATE TABLE IF NOT EXISTS public.user_addresses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  line1           text NOT NULL,
  line2           text,
  city            text NOT NULL,
  state           text NOT NULL,
  postal_code     text NOT NULL,
  country         text NOT NULL DEFAULT 'US',
  phone           text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user
  ON public.user_addresses(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_per_user
  ON public.user_addresses(user_id)
  WHERE is_default = true;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_addresses"
  ON public.user_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_addresses"
  ON public.user_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_addresses"
  ON public.user_addresses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_addresses"
  ON public.user_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Link inventory rows to the address used for shipping (set when the user
-- requests ship). Nullable because non-shipping inventory has no address.
ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS shipping_address_id uuid REFERENCES public.user_addresses(id);

-- Atomic single-default swap. Same pattern as set_default_payment_method.
CREATE OR REPLACE FUNCTION public.set_default_address(
  p_user_id    uuid,
  p_address_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE id = p_address_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'address not found for this user';
  END IF;

  UPDATE public.user_addresses
     SET is_default = false, updated_at = now()
   WHERE user_id = p_user_id AND is_default = true;

  UPDATE public.user_addresses
     SET is_default = true, updated_at = now()
   WHERE id = p_address_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_address(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_address(uuid, uuid) TO authenticated;

-- Updated version of request_ship_inventory_item that also records which
-- address was used. Replaces the Phase 3.5 version which didn't take an
-- address argument.
CREATE OR REPLACE FUNCTION public.request_ship_inventory_item(
  p_user_id        uuid,
  p_inventory_id   uuid,
  p_address_id     uuid
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
  -- Validate the address belongs to the same user before consuming it.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE id = p_address_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'address_invalid';
  END IF;

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
         shipping_requested_at = now(),
         shipping_address_id = p_address_id
   WHERE id = p_inventory_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_ship_inventory_item(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_ship_inventory_item(uuid, uuid, uuid) TO service_role;

-- Drop the old 2-arg version so callers can't accidentally bypass address capture
DROP FUNCTION IF EXISTS public.request_ship_inventory_item(uuid, uuid);
