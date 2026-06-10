-- Extend place_livestream_bid to accept an optional explicit bid amount.
--
-- When p_amount_cents is NULL (legacy callers), behavior is unchanged:
-- a flat $1 bump on top of the current price.
--
-- When p_amount_cents is provided, the RPC validates that it is at least
-- $1 above the current price (i.e. current_price_cents + 100). Below
-- minimum raises 'bid_below_minimum'.
--
-- No hard upper cap. The Stripe authorization happens at charge time
-- (charge-auction-win edge fn), not at bid time, so over-commit blowup
-- is caught by Stripe rather than this RPC.
--
-- Postgres treats this 3-arg variant as a SEPARATE OVERLOAD from the
-- existing 2-arg signature (arity differs even with DEFAULT NULL on the
-- new arg). The old 2-arg signature continues to exist and remains
-- callable by any pre-deploy caller — no breakage. The edge fn now
-- explicitly passes p_amount_cents (NULL or a value) so it always
-- routes to this 3-arg overload.

CREATE OR REPLACE FUNCTION public.place_livestream_bid(
  p_item_id      uuid,
  p_bidder       uuid,
  p_amount_cents integer DEFAULT NULL
)
RETURNS TABLE (
  current_price_cents integer,
  current_winner_id   uuid,
  bid_count           integer,
  bidding_ends_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_host uuid;
  v_current integer;
  v_new_price integer;
  v_new_ends  timestamptz;
  v_new_count integer;
BEGIN
  -- Lock the item row so concurrent bidders serialize. This is the
  -- whole reason the RPC exists; without the lock, two simultaneous
  -- bids could read the same current_price_cents and produce ties.
  SELECT li.*, ls.host_user_id
    INTO v_item
    FROM public.livestream_items li
    JOIN public.livestreams ls ON ls.id = li.livestream_id
   WHERE li.id = p_item_id
     FOR UPDATE OF li;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.status <> 'live' OR v_item.bidding_ends_at IS NULL THEN
    RAISE EXCEPTION 'not_bidding' USING ERRCODE = 'P0001';
  END IF;

  IF v_item.bidding_ends_at <= now() THEN
    RAISE EXCEPTION 'bidding_closed' USING ERRCODE = 'P0001';
  END IF;

  v_host := v_item.host_user_id;
  IF v_host = p_bidder THEN
    RAISE EXCEPTION 'cannot_self_bid' USING ERRCODE = 'P0001';
  END IF;

  v_current := COALESCE(v_item.current_price_cents, v_item.start_price_cents, 0);

  IF p_amount_cents IS NULL THEN
    v_new_price := v_current + 100;
  ELSE
    IF p_amount_cents <= 0 THEN
      RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
    END IF;
    IF p_amount_cents < v_current + 100 THEN
      RAISE EXCEPTION 'bid_below_minimum' USING ERRCODE = 'P0001';
    END IF;
    v_new_price := p_amount_cents;
  END IF;

  v_new_ends  := now() + interval '10 seconds';
  v_new_count := COALESCE(v_item.bid_count, 0) + 1;

  -- Explicit assignments avoid the ambiguous-column shadowing between
  -- RETURNS TABLE aliases, the table's own columns, and v_item record
  -- fields — same pattern the 2-arg overload uses post-fix.
  UPDATE public.livestream_items
     SET current_price_cents = v_new_price,
         current_winner_id   = p_bidder,
         bid_count           = v_new_count,
         bidding_ends_at     = v_new_ends
   WHERE id = p_item_id;

  INSERT INTO public.livestream_bids (livestream_item_id, bidder_id, amount_cents)
  VALUES (p_item_id, p_bidder, v_new_price);

  current_price_cents := v_new_price;
  current_winner_id   := p_bidder;
  bid_count           := v_new_count;
  bidding_ends_at     := v_new_ends;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_livestream_bid(uuid, uuid, integer) TO authenticated;

-- The old 2-arg signature stays grantable for any existing callers that
-- predate the deploy. (Postgres treats this as a separate overload by
-- arity.) Once all callers move to the 3-arg form, the 2-arg variant
-- can be dropped in a follow-up cleanup.
