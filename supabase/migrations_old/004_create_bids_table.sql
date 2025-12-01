-- Create bids table to track all bids placed on auctions
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Add index for faster lookups
  CONSTRAINT bids_amount_positive CHECK (amount > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON bids(auction_id, amount DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bids
-- Anyone can view all bids (for bid history)
CREATE POLICY "Anyone can view bids" ON bids
  FOR SELECT USING (true);

-- Only authenticated users can insert bids
CREATE POLICY "Authenticated users can insert bids" ON bids
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot update or delete bids (bids are immutable)
-- No UPDATE or DELETE policies needed

-- Function to get the highest bid for an auction
CREATE OR REPLACE FUNCTION get_highest_bid(p_auction_id UUID)
RETURNS TABLE (
  user_id UUID,
  amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.user_id, b.amount, b.created_at
  FROM bids b
  WHERE b.auction_id = p_auction_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to place a bid with validation
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_user_id UUID,
  p_amount DECIMAL(10, 2)
)
RETURNS JSON AS $$
DECLARE
  v_auction RECORD;
  v_highest_bid RECORD;
  v_new_bid_id UUID;
BEGIN
  -- Get auction details
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id;

  -- Check if auction exists
  IF v_auction IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Auction not found');
  END IF;

  -- Check if auction has ended
  IF v_auction.end_time < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Auction has ended');
  END IF;

  -- Check if user is the seller
  IF v_auction.seller_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You cannot bid on your own auction');
  END IF;

  -- Get the highest current bid
  SELECT * INTO v_highest_bid
  FROM get_highest_bid(p_auction_id);

  -- Check if user is already the highest bidder
  IF v_highest_bid.user_id = p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You are already the highest bidder');
  END IF;

  -- Validate bid amount is higher than current bid
  IF v_highest_bid.amount IS NOT NULL AND p_amount <= v_highest_bid.amount THEN
    RETURN json_build_object('success', false, 'error', 'Bid must be higher than current bid');
  END IF;

  -- Validate bid amount is at least the starting bid (current_bid)
  IF p_amount < v_auction.current_bid THEN
    RETURN json_build_object('success', false, 'error', 'Bid must be at least the starting bid');
  END IF;

  -- Insert the bid
  INSERT INTO bids (auction_id, user_id, amount)
  VALUES (p_auction_id, p_user_id, p_amount)
  RETURNING id INTO v_new_bid_id;

  -- Update the auction's current_bid and bid_count
  UPDATE auctions
  SET
    current_bid = p_amount,
    bid_count = COALESCE(bid_count, 0) + 1
  WHERE id = p_auction_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bid history for an auction
CREATE OR REPLACE FUNCTION get_bid_history(
  p_auction_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.user_id,
    u.username,
    b.amount,
    b.created_at
  FROM bids b
  LEFT JOIN users u ON b.user_id = u.id
  WHERE b.auction_id = p_auction_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate recommended bid increment based on current price
CREATE OR REPLACE FUNCTION calculate_bid_increment(current_price DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  -- Standard eBay-style increment algorithm
  IF current_price < 1 THEN
    RETURN 0.05;
  ELSIF current_price < 5 THEN
    RETURN 0.25;
  ELSIF current_price < 15 THEN
    RETURN 0.50;
  ELSIF current_price < 60 THEN
    RETURN 1.00;
  ELSIF current_price < 150 THEN
    RETURN 2.50;
  ELSIF current_price < 300 THEN
    RETURN 5.00;
  ELSIF current_price < 600 THEN
    RETURN 10.00;
  ELSIF current_price < 1500 THEN
    RETURN 25.00;
  ELSIF current_price < 3000 THEN
    RETURN 50.00;
  ELSE
    RETURN 100.00;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
