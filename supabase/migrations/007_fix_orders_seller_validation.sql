-- Fix the seller_id validation issue in orders
-- The problem: auctions may have seller_ids that don't exist in auth.users table (from seed/test data)
-- Solution: Make orders.seller_id nullable and update the create_order function

-- Step 1: Make seller_id nullable in orders table
ALTER TABLE orders
  ALTER COLUMN seller_id DROP NOT NULL;

-- Step 2: Drop and recreate the foreign key constraint with ON DELETE SET NULL
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_seller_id_fkey
  FOREIGN KEY (seller_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Step 3: Update the create_order function to handle missing sellers gracefully
CREATE OR REPLACE FUNCTION create_order(
  p_auction_id UUID,
  p_buyer_id UUID,
  p_payment_method_id UUID,
  p_shipping_address_id UUID,
  p_item_price DECIMAL(10, 2),
  p_shipping_cost DECIMAL(10, 2),
  p_tax DECIMAL(10, 2),
  p_purchase_type TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_auction RECORD;
  v_shipping_address RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_total DECIMAL(10, 2);
  v_seller_id UUID;
  v_seller_exists BOOLEAN;
BEGIN
  -- Calculate total
  v_total := p_item_price + p_shipping_cost + p_tax;

  -- Get auction details
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Get the seller_id from auction
  v_seller_id := v_auction.seller_id;

  -- Check if seller exists in auth.users (for data integrity)
  -- If seller doesn't exist, we'll still create the order but with NULL seller_id
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_seller_id) INTO v_seller_exists;

  IF NOT v_seller_exists THEN
    -- Log a warning (in production, you'd want to alert on this)
    RAISE WARNING 'Seller ID % does not exist in auth.users table for auction %', v_seller_id, p_auction_id;
    v_seller_id := NULL;
  END IF;

  -- Prevent buyer from being the seller (if seller exists)
  IF v_seller_id IS NOT NULL AND v_seller_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot purchase your own item');
  END IF;

  -- Get shipping address details (to store a snapshot)
  SELECT * INTO v_shipping_address FROM shipping_addresses WHERE id = p_shipping_address_id AND user_id = p_buyer_id;

  IF v_shipping_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid shipping address');
  END IF;

  -- Generate order number
  v_order_number := generate_order_number();

  -- Create the order
  INSERT INTO orders (
    order_number,
    auction_id,
    buyer_id,
    seller_id,
    payment_method_id,
    stripe_payment_intent_id,
    shipping_address_id,
    shipping_full_name,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    shipping_country,
    shipping_phone,
    item_price,
    shipping_cost,
    tax,
    total,
    purchase_type,
    status
  ) VALUES (
    v_order_number,
    p_auction_id,
    p_buyer_id,
    v_seller_id, -- This can now be NULL if seller doesn't exist
    p_payment_method_id,
    p_stripe_payment_intent_id,
    p_shipping_address_id,
    v_shipping_address.full_name,
    v_shipping_address.address_line1,
    v_shipping_address.address_line2,
    v_shipping_address.city,
    v_shipping_address.state,
    v_shipping_address.postal_code,
    v_shipping_address.country,
    v_shipping_address.phone,
    p_item_price,
    p_shipping_cost,
    p_tax,
    v_total,
    p_purchase_type,
    'processing'
  ) RETURNING id INTO v_order_id;

  -- Mark the auction as sold
  UPDATE auctions
  SET status = 'sold',
      sold_at = NOW()
  WHERE id = p_auction_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
