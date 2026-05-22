-- Rubies — in-app currency. Earned by buying bundles via Stripe or by
-- selling back pulled comics (Phase 3.5). Spent on pack opens.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ruby_balance integer NOT NULL DEFAULT 0
    CHECK (ruby_balance >= 0);

CREATE TABLE IF NOT EXISTS public.ruby_transactions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta                    integer NOT NULL,
  kind                     text NOT NULL CHECK (kind IN ('bundle_purchase', 'pack_open', 'sellback', 'admin_adjustment')),
  stripe_payment_intent_id text,
  pack_purchase_id         uuid REFERENCES public.pack_purchases(id) ON DELETE SET NULL,
  bundle_id                text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ruby_transactions_user
  ON public.ruby_transactions(user_id, created_at DESC);

-- Idempotency for bundle purchases — Stripe webhook retries cannot grant
-- the same bundle twice. NULLs are distinct under Postgres UNIQUE
-- semantics, so pack_open rows (which have NULL stripe_payment_intent_id)
-- don't conflict.
ALTER TABLE public.ruby_transactions
  ADD CONSTRAINT ruby_transactions_stripe_intent_unique
  UNIQUE (stripe_payment_intent_id);

ALTER TABLE public.ruby_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_ruby_transactions"
  ON public.ruby_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic pack-open via Rubies. Guards balance via the CHECK constraint:
-- if ruby_balance would go negative, UPDATE returns 0 rows and we abort.
--
-- Returns the new pack_purchase id (empty row, no items yet — caller rolls
-- and updates it the same way charge-saved-card does).
CREATE OR REPLACE FUNCTION public.debit_rubies_and_create_purchase(
  p_user_id    uuid,
  p_pack_id    uuid,
  p_ruby_cost  integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id uuid;
  v_updated     int;
BEGIN
  IF p_ruby_cost <= 0 THEN
    RAISE EXCEPTION 'ruby_cost must be positive';
  END IF;

  UPDATE public.users
     SET ruby_balance = ruby_balance - p_ruby_cost
   WHERE id = p_user_id
     AND ruby_balance >= p_ruby_cost;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'insufficient_rubies';
  END IF;

  INSERT INTO public.pack_purchases (user_id, pack_id, items_received)
       VALUES (p_user_id, p_pack_id, '[]'::jsonb)
    RETURNING id INTO v_purchase_id;

  INSERT INTO public.ruby_transactions (user_id, delta, kind, pack_purchase_id)
       VALUES (p_user_id, -p_ruby_cost, 'pack_open', v_purchase_id);

  RETURN v_purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_rubies_and_create_purchase(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_rubies_and_create_purchase(uuid, uuid, integer) TO service_role;

-- Bundle credit helper used by the Stripe webhook on payment_intent.succeeded.
-- Idempotent via the unique index on stripe_payment_intent_id where
-- kind='bundle_purchase'.
CREATE OR REPLACE FUNCTION public.credit_rubies_from_bundle(
  p_user_id            uuid,
  p_ruby_total         integer,
  p_bundle_id          text,
  p_payment_intent_id  text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int;
BEGIN
  IF p_ruby_total <= 0 THEN
    RAISE EXCEPTION 'ruby_total must be positive';
  END IF;

  INSERT INTO public.ruby_transactions (
    user_id, delta, kind, stripe_payment_intent_id, bundle_id
  )
  VALUES (
    p_user_id, p_ruby_total, 'bundle_purchase', p_payment_intent_id, p_bundle_id
  )
  ON CONFLICT ON CONSTRAINT ruby_transactions_stripe_intent_unique
  DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    -- Already credited for this intent. Idempotent no-op.
    RETURN false;
  END IF;

  UPDATE public.users
     SET ruby_balance = ruby_balance + p_ruby_total
   WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_rubies_from_bundle(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_rubies_from_bundle(uuid, integer, text, text) TO service_role;
