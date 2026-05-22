-- Replace the partial unique index with a proper UNIQUE constraint so
-- Supabase JS upsert(..., { onConflict: 'stripe_payment_intent_id' })
-- can use it as a conflict target. Postgres ON CONFLICT does not
-- recognize partial indexes by column name; it needs a true constraint.
--
-- NULLs are treated as distinct in a UNIQUE constraint, so existing
-- rows with NULL stripe_payment_intent_id remain unaffected.

DROP INDEX IF EXISTS public.pack_purchases_stripe_payment_intent_id_key;

ALTER TABLE public.pack_purchases
  ADD CONSTRAINT pack_purchases_stripe_payment_intent_id_key
  UNIQUE (stripe_payment_intent_id);
