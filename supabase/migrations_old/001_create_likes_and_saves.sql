-- Create auction_likes table
CREATE TABLE IF NOT EXISTS auction_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, auction_id)
);

-- Create auction_saves table (bookmarks/watchlist)
CREATE TABLE IF NOT EXISTS auction_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, auction_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_auction_likes_user_id ON auction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_likes_auction_id ON auction_likes(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_saves_user_id ON auction_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_saves_auction_id ON auction_saves(auction_id);

-- Enable Row Level Security (RLS)
ALTER TABLE auction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_saves ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auction_likes
-- Users can view all likes
CREATE POLICY "Anyone can view likes" ON auction_likes
  FOR SELECT USING (true);

-- Users can only insert their own likes
CREATE POLICY "Users can insert their own likes" ON auction_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete their own likes" ON auction_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for auction_saves
-- Users can view all saves
CREATE POLICY "Anyone can view saves" ON auction_saves
  FOR SELECT USING (true);

-- Users can only insert their own saves
CREATE POLICY "Users can insert their own saves" ON auction_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own saves
CREATE POLICY "Users can delete their own saves" ON auction_saves
  FOR DELETE USING (auth.uid() = user_id);
