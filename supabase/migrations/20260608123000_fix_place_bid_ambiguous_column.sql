-- Fix "column reference 'bid_count' is ambiguous" in place_livestream_bid.
--
-- The RETURNS TABLE columns collide with both the table's columns and
-- the PL/pgSQL record fields (`v_item.bid_count`). Postgres can't tell
-- which one we mean inside the UPDATE / SELECT. Qualify everything
-- with table aliases and compute the new bid_count into a local var.

CREATE OR REPLACE FUNCTION public.place_livestream_bid(
  p_item_id  uuid,
  p_bidder   uuid
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

  v_new_price := COALESCE(v_item.current_price_cents, v_item.start_price_cents, 0) + 100;
  v_new_ends  := now() + interval '10 seconds';
  v_new_count := COALESCE(v_item.bid_count, 0) + 1;

  -- Explicitly UPDATE … SET target = value via the table; using bare
  -- column names on the right-hand side of SET assignments here is
  -- where Postgres got confused vs the RETURNS TABLE alias.
  UPDATE public.livestream_items
     SET current_price_cents = v_new_price,
         current_winner_id   = p_bidder,
         bid_count           = v_new_count,
         bidding_ends_at     = v_new_ends
   WHERE id = p_item_id;

  INSERT INTO public.livestream_bids (livestream_item_id, bidder_id, amount_cents)
  VALUES (p_item_id, p_bidder, v_new_price);

  -- Return the result, prefixing each value with its OUT column name
  -- via the alias trick so they bind to the RETURNS TABLE columns
  -- explicitly (avoids any future shadow-name issues).
  current_price_cents := v_new_price;
  current_winner_id   := p_bidder;
  bid_count           := v_new_count;
  bidding_ends_at     := v_new_ends;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_livestream_bid(uuid, uuid) TO authenticated;
