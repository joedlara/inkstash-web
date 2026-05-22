-- Saved Stripe payment methods per user. Populated by the stripe-webhook
-- function when a PaymentIntent succeeds with setup_future_usage=on_session.
--
-- The Stripe Customer ID lives on the user record (users.stripe_customer_id)
-- so we can look it up without joining. One Customer per InkStash user;
-- many payment methods per Customer.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL UNIQUE,
  card_brand               text NOT NULL,
  card_last4               text NOT NULL,
  exp_month                smallint NOT NULL,
  exp_year                 smallint NOT NULL,
  is_default               boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user
  ON public.user_payment_methods(user_id);

-- Only one default per user. Partial unique index enforces this.
CREATE UNIQUE INDEX IF NOT EXISTS user_payment_methods_one_default_per_user
  ON public.user_payment_methods(user_id)
  WHERE is_default = true;

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users read their own cards. Service role writes (from Edge Functions).
CREATE POLICY "users_read_own_payment_methods"
  ON public.user_payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_payment_methods"
  ON public.user_payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);
