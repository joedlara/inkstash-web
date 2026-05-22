-- Idempotency guard: Stripe webhook retries must not create duplicate
-- pack_purchases rows. Partial index because pre-Stripe rows have NULL
-- and many NULLs cannot conflict.

CREATE UNIQUE INDEX IF NOT EXISTS pack_purchases_stripe_payment_intent_id_key
  ON public.pack_purchases(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
