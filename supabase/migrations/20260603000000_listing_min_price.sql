-- Belt-and-suspenders: prevent $0 (or sub-$1) listings from being inserted
-- via direct REST/RPC calls. The client now blocks this, but a stale draft
-- or a misuse of the listings.insert() endpoint shouldn't be able to land
-- a free or impossibly-cheap listing in the marketplace feed.
--
-- buy_now_price stays nullable because auction-only listings (Phase 6)
-- don't have it set. The constraint only fires when the column is non-null
-- AND is_buy_now is true.

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_min_price_chk;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_min_price_chk
  CHECK (
    NOT is_buy_now
    OR buy_now_price IS NULL
    OR buy_now_price >= 1
  );
