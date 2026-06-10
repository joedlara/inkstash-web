-- Host-supplied flat shipping rate for a livestream.
--
-- Per-listing shipping doesn't exist on the listings table — the actual
-- shipping cost is computed server-side at checkout via shipping_rates.
-- For the auction surface we want to show the buyer the shipping cost
-- BEFORE they bid, so they're not surprised at the buy modal.
--
-- The simplest workable model: the host sets one flat shipping price
-- for the whole show. Every item in the stream uses it. The auction
-- card surfaces it on the price line as "$X.XX Shipping + Taxes".
--
-- Null means "shipping calculated at checkout" — keep the existing
-- behavior when the host hasn't set a rate. Zero is a real, meaningful
-- value (free shipping); rendered as "Free shipping".

ALTER TABLE public.livestreams
  ADD COLUMN IF NOT EXISTS flat_shipping_cents integer;

COMMENT ON COLUMN public.livestreams.flat_shipping_cents IS
  'Flat shipping price per item, applied to every lot in this stream. NULL = computed at checkout. 0 = free shipping.';
