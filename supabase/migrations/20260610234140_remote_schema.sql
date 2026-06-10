drop function if exists "public"."place_livestream_bid"(p_item_id uuid, p_bidder uuid);

alter table "public"."livestream_chat" add column "mentioned_user_ids" uuid[] not null default '{}'::uuid[];

alter table "public"."livestreams" add column "like_count" bigint not null default 0;

CREATE UNIQUE INDEX idx_orders_unique_auction_buyer ON public.orders USING btree (auction_id, buyer_id) WHERE (auction_id IS NOT NULL);

CREATE UNIQUE INDEX idx_orders_unique_listing_buyer ON public.orders USING btree (listing_id, buyer_id) WHERE (listing_id IS NOT NULL);

CREATE INDEX livestream_chat_mentioned_user_ids_idx ON public.livestream_chat USING gin (mentioned_user_ids);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.place_livestream_bid(p_item_id uuid, p_bidder uuid, p_amount_cents integer DEFAULT NULL::integer)
 RETURNS TABLE(current_price_cents integer, current_winner_id uuid, bid_count integer, bidding_ends_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.tap_livestream_like(p_livestream_id uuid, p_taps integer DEFAULT 1)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_taps integer;
  v_total bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  v_taps := COALESCE(p_taps, 1);
  IF v_taps <= 0 OR v_taps > 50 THEN
    -- Throttle: a single client call can batch up to 50 taps. The ring
    -- meter fires the RPC on completion (~10 taps), so 50 is a generous
    -- per-batch ceiling.
    RAISE EXCEPTION 'invalid_taps' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.livestreams
     SET like_count = like_count + v_taps
   WHERE id = p_livestream_id
   RETURNING like_count INTO v_total;

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'stream_not_found' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_order(p_auction_id uuid, p_buyer_id uuid, p_payment_method_id uuid, p_shipping_address_id uuid, p_item_price numeric, p_shipping_cost numeric, p_tax numeric, p_purchase_type text, p_stripe_payment_intent_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_shipping_address RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_total DECIMAL(10, 2);
  v_seller_id UUID;
  v_seller_exists BOOLEAN;
  v_item_status TEXT;
  v_is_listing BOOLEAN := FALSE;
  v_existing_order_id UUID;
BEGIN
  v_total := p_item_price + p_shipping_cost + p_tax;

  -- Try auctions table first
  SELECT seller_id, status INTO v_seller_id, v_item_status
  FROM auctions WHERE id = p_auction_id;

  IF v_seller_id IS NULL THEN
    -- Fall back to listings table
    SELECT user_id, status INTO v_seller_id, v_item_status
    FROM listings WHERE id = p_auction_id;
    IF v_seller_id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;
    v_is_listing := TRUE;
  END IF;

  -- Check item is still available
  IF v_item_status = 'sold' THEN
    RETURN json_build_object('success', false, 'error', 'This item has already been sold');
  END IF;

  -- Check for duplicate order by this buyer
  IF v_is_listing THEN
    SELECT id INTO v_existing_order_id FROM orders
    WHERE listing_id = p_auction_id AND buyer_id = p_buyer_id
    LIMIT 1;
  ELSE
    SELECT id INTO v_existing_order_id FROM orders
    WHERE auction_id = p_auction_id AND buyer_id = p_buyer_id
    LIMIT 1;
  END IF;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You have already purchased this item');
  END IF;

  -- Verify seller exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_seller_id) INTO v_seller_exists;
  IF NOT v_seller_exists THEN
    RAISE WARNING 'Seller ID % does not exist in auth.users for item %', v_seller_id, p_auction_id;
    v_seller_id := NULL;
  END IF;

  IF v_seller_id IS NOT NULL AND v_seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot purchase your own item');
  END IF;

  -- Get shipping address snapshot
  SELECT * INTO v_shipping_address
  FROM shipping_addresses
  WHERE id = p_shipping_address_id AND user_id = p_buyer_id;

  IF v_shipping_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid shipping address');
  END IF;

  v_order_number := generate_order_number();

  IF v_is_listing THEN
    INSERT INTO orders (
      order_number, auction_id, listing_id, buyer_id, seller_id,
      payment_method_id, stripe_payment_intent_id,
      shipping_address_id, shipping_full_name, shipping_address_line1,
      shipping_address_line2, shipping_city, shipping_state,
      shipping_postal_code, shipping_country, shipping_phone,
      item_price, shipping_cost, tax, total, purchase_type, status
    ) VALUES (
      v_order_number, NULL, p_auction_id, p_buyer_id, v_seller_id,
      p_payment_method_id, p_stripe_payment_intent_id,
      p_shipping_address_id, v_shipping_address.full_name, v_shipping_address.address_line1,
      v_shipping_address.address_line2, v_shipping_address.city, v_shipping_address.state,
      v_shipping_address.postal_code, v_shipping_address.country, v_shipping_address.phone,
      p_item_price, p_shipping_cost, p_tax, v_total, p_purchase_type, 'processing'
    ) RETURNING id INTO v_order_id;

    UPDATE listings SET status = 'sold' WHERE id = p_auction_id;
  ELSE
    INSERT INTO orders (
      order_number, auction_id, listing_id, buyer_id, seller_id,
      payment_method_id, stripe_payment_intent_id,
      shipping_address_id, shipping_full_name, shipping_address_line1,
      shipping_address_line2, shipping_city, shipping_state,
      shipping_postal_code, shipping_country, shipping_phone,
      item_price, shipping_cost, tax, total, purchase_type, status
    ) VALUES (
      v_order_number, p_auction_id, NULL, p_buyer_id, v_seller_id,
      p_payment_method_id, p_stripe_payment_intent_id,
      p_shipping_address_id, v_shipping_address.full_name, v_shipping_address.address_line1,
      v_shipping_address.address_line2, v_shipping_address.city, v_shipping_address.state,
      v_shipping_address.postal_code, v_shipping_address.country, v_shipping_address.phone,
      p_item_price, p_shipping_cost, p_tax, v_total, p_purchase_type, 'processing'
    ) RETURNING id INTO v_order_id;

    UPDATE auctions SET status = 'sold', sold_at = NOW() WHERE id = p_auction_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$function$
;


