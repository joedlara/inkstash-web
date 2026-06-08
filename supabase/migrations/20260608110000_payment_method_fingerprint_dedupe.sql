-- Dedupe saved payment methods by Stripe card fingerprint.
--
-- Background: Stripe issues a fresh PaymentMethod id (pm_xxx) every
-- time a buyer types the same card on the PaymentElement, so our
-- existing UNIQUE on stripe_payment_method_id never catches a re-entry
-- of the same physical card. Buyers were ending up with 6-7 duplicate
-- rows for the same card.
--
-- Stripe exposes card.fingerprint — a stable hash of the underlying
-- PAN that's identical across re-tokenizations of the same card.
-- We dedupe on (user_id, card_fingerprint) so each physical card a
-- user owns can only land in user_payment_methods once.
--
-- Backfill: legacy rows have card_fingerprint=NULL. The partial unique
-- index ignores them, and the webhook below will populate fingerprint
-- on future writes. A one-shot backfill against Stripe would be nice
-- but isn't in this MVP's scope — the user already manually pruned
-- the worst cases.

ALTER TABLE public.user_payment_methods
  ADD COLUMN IF NOT EXISTS card_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_fingerprint
  ON public.user_payment_methods (user_id, card_fingerprint)
  WHERE card_fingerprint IS NOT NULL;

-- Partial unique index: enforces one row per (user_id, card_fingerprint)
-- pair, but only when card_fingerprint is set. Legacy null rows
-- coexist without conflict; new writes hit this constraint and the
-- webhook's upsert resolves them.
CREATE UNIQUE INDEX IF NOT EXISTS user_payment_methods_unique_fingerprint
  ON public.user_payment_methods (user_id, card_fingerprint)
  WHERE card_fingerprint IS NOT NULL;
