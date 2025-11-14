-- Create orders table to track purchases
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Payment details
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,

  -- Shipping details
  shipping_address_id UUID REFERENCES shipping_addresses(id) ON DELETE SET NULL,
  shipping_full_name TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  shipping_phone TEXT,

  -- Pricing breakdown
  item_price DECIMAL(10, 2) NOT NULL CHECK (item_price >= 0),
  shipping_cost DECIMAL(10, 2) NOT NULL CHECK (shipping_cost >= 0),
  tax DECIMAL(10, 2) NOT NULL CHECK (tax >= 0),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),

  -- Order metadata
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('buy_now', 'bid_won')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),

  -- Tracking
  tracking_number TEXT,
  carrier TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure total is correct
  CONSTRAINT order_total_check CHECK (total = item_price + shipping_cost + tax)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_auction_id ON orders(auction_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
-- Buyers can view their own purchases
CREATE POLICY "Buyers can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = buyer_id);

-- Sellers can view orders for their items
CREATE POLICY "Sellers can view their sales" ON orders
  FOR SELECT USING (auth.uid() = seller_id);

-- Only authenticated users can insert orders (through application logic)
CREATE POLICY "Authenticated users can insert orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Buyers and sellers can update order status
CREATE POLICY "Buyers and sellers can update orders" ON orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20250113-A3F9K)
    order_num := 'ORD-' ||
                 TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                 UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 5));

    -- Check if this order number already exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = order_num) INTO exists_check;

    -- If it doesn't exist, we can use it
    IF NOT exists_check THEN
      RETURN order_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to create an order
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
BEGIN
  -- Calculate total
  v_total := p_item_price + p_shipping_cost + p_tax;

  -- Get auction details
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Verify seller exists
  IF v_auction.seller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction has no seller');
  END IF;

  -- Prevent seller from buying their own item
  IF v_auction.seller_id = p_buyer_id THEN
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
    v_auction.seller_id,
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

  -- Mark the auction as sold by updating a status field
  -- Note: We need to add a 'status' column to auctions table
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

-- Update updated_at timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add status and sold_at columns to auctions table
-- This migration assumes the auctions table exists
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'ended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Create index on auction status
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
