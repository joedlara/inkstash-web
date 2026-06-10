-- Phase 4 cleanup: drop the 2-arg place_livestream_bid overload.
-- The 3-arg overload added in 20260610112500_place_livestream_bid_custom_amount.sql
-- handles both flat and custom bids (NULL p_amount_cents = flat $1 bump).
-- The place-bid edge fn was updated in that migration to always call the
-- 3-arg variant. The 2-arg variant has been dead since.
DROP FUNCTION IF EXISTS public.place_livestream_bid(uuid, uuid);
