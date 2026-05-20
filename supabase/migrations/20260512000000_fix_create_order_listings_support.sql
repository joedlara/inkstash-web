-- Fix create_order to support items from the listings table, not just auctions

CREATE OR REPLACE FUNCTION "public"."create_order"(
  "p_auction_id" "uuid",
  "p_buyer_id" "uuid",
  "p_payment_method_id" "uuid",
  "p_shipping_address_id" "uuid",
  "p_item_price" numeric,
  "p_shipping_cost" numeric,
  "p_tax" numeric,
  "p_purchase_type" "text",
  "p_stripe_payment_intent_id" "text" DEFAULT NULL
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_shipping_address RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_total DECIMAL(10, 2);
  v_seller_id UUID;
  v_seller_exists BOOLEAN;
  v_source TEXT; -- 'auctions' or 'listings'
BEGIN
  v_total := p_item_price + p_shipping_cost + p_tax;

  -- Try auctions table first
  SELECT seller_id INTO v_seller_id FROM auctions WHERE id = p_auction_id;
  IF v_seller_id IS NOT NULL THEN
    v_source := 'auctions';
  ELSE
    -- Fall back to listings table
    SELECT user_id INTO v_seller_id FROM listings WHERE id = p_auction_id;
    IF v_seller_id IS NOT NULL THEN
      v_source := 'listings';
    ELSE
      RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;
  END IF;

  -- Check seller exists in auth.users
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

  INSERT INTO orders (
    order_number, auction_id, buyer_id, seller_id,
    payment_method_id, stripe_payment_intent_id,
    shipping_address_id, shipping_full_name, shipping_address_line1,
    shipping_address_line2, shipping_city, shipping_state,
    shipping_postal_code, shipping_country, shipping_phone,
    item_price, shipping_cost, tax, total, purchase_type, status
  ) VALUES (
    v_order_number, p_auction_id, p_buyer_id, v_seller_id,
    p_payment_method_id, p_stripe_payment_intent_id,
    p_shipping_address_id, v_shipping_address.full_name, v_shipping_address.address_line1,
    v_shipping_address.address_line2, v_shipping_address.city, v_shipping_address.state,
    v_shipping_address.postal_code, v_shipping_address.country, v_shipping_address.phone,
    p_item_price, p_shipping_cost, p_tax, v_total, p_purchase_type, 'processing'
  ) RETURNING id INTO v_order_id;

  -- Mark the item as sold in the correct table
  IF v_source = 'auctions' THEN
    UPDATE auctions SET status = 'sold', sold_at = NOW() WHERE id = p_auction_id;
  ELSE
    UPDATE listings SET status = 'sold' WHERE id = p_auction_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$$;
