-- Switch which user_payment_methods row is is_default=true for a user,
-- enforced by the partial unique index user_payment_methods_one_default_per_user.
-- Wrapped in a single statement so both updates land atomically.

CREATE OR REPLACE FUNCTION public.set_default_payment_method(
  p_user_id            uuid,
  p_payment_method_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Refuse if the row doesn't belong to this user — prevents privilege escalation
  -- via the SECURITY DEFINER context if the user-side caller is spoofed.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_payment_methods
    WHERE id = p_payment_method_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'payment method not found for this user';
  END IF;

  UPDATE public.user_payment_methods
     SET is_default = false
   WHERE user_id = p_user_id AND is_default = true;

  UPDATE public.user_payment_methods
     SET is_default = true
   WHERE id = p_payment_method_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_default_payment_method(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_default_payment_method(uuid, uuid) TO authenticated;
