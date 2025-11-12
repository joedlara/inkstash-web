-- Create auction_views table to track individual views
CREATE TABLE IF NOT EXISTS auction_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Allow anonymous views (user_id can be null)
  -- Track unique views per user per auction using combination
  UNIQUE(user_id, auction_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_auction_views_auction_id ON auction_views(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_views_user_id ON auction_views(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_views_viewed_at ON auction_views(viewed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE auction_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auction_views
-- Anyone can view the views count
CREATE POLICY "Anyone can view auction views" ON auction_views
  FOR SELECT USING (true);

-- Anyone can insert views (including anonymous users)
CREATE POLICY "Anyone can insert views" ON auction_views
  FOR INSERT WITH CHECK (true);

-- Users can only update their own views (to update viewed_at timestamp)
CREATE POLICY "Users can update their own views" ON auction_views
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Function to increment or update view
CREATE OR REPLACE FUNCTION record_auction_view(
  p_auction_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert or update the view record
  INSERT INTO auction_views (auction_id, user_id, viewed_at)
  VALUES (p_auction_id, p_user_id, NOW())
  ON CONFLICT (user_id, auction_id)
  DO UPDATE SET viewed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
