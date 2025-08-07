-- src/database/schema.sql
-- Enhanced schema for InkStash creator dashboard

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  favorite_characters TEXT[] DEFAULT '{}',
  collection_focus TEXT[] DEFAULT '{}',
  price_range JSONB DEFAULT '{"min": 10, "max": 500}',
  seller_rating DECIMAL(3,2) DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User collections table
CREATE TABLE IF NOT EXISTS user_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  estimated_value DECIMAL(10,2),
  purchase_price DECIMAL(10,2),
  year INTEGER,
  image_url TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_for_sale BOOLEAN DEFAULT FALSE,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auctions table
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  starting_bid DECIMAL(10,2) NOT NULL,
  current_bid DECIMAL(10,2) DEFAULT 0,
  buy_now_price DECIMAL(10,2),
  reserve_price DECIMAL(10,2),
  bid_count INTEGER DEFAULT 0,
  image_url TEXT,
  additional_images TEXT[] DEFAULT '{}',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended', 'cancelled')),
  is_featured BOOLEAN DEFAULT FALSE,
  is_live BOOLEAN DEFAULT FALSE,
  buy_now BOOLEAN DEFAULT FALSE,
  make_offer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  is_winning BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress for gamification
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_purchases DECIMAL(10,2) DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  items_purchased INTEGER DEFAULT 0,
  collections_created INTEGER DEFAULT 0,
  forum_posts INTEGER DEFAULT 0,
  livestream_attendance INTEGER DEFAULT 0,
  referral_count INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  daily_login_streak INTEGER DEFAULT 0,
  bidding_streak INTEGER DEFAULT 0,
  selling_streak INTEGER DEFAULT 0,
  forum_activity_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_category ON user_collections(category);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_collections_updated_at BEFORE UPDATE ON user_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stat(user_id UUID, stat_name VARCHAR, increment_value INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  INSERT INTO user_progress (user_id) 
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  CASE stat_name
    WHEN 'total_sales' THEN
      UPDATE user_progress SET total_sales = total_sales + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'total_purchases' THEN
      UPDATE user_progress SET total_purchases = total_purchases + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'items_sold' THEN
      UPDATE user_progress SET items_sold = items_sold + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'items_purchased' THEN
      UPDATE user_progress SET items_purchased = items_purchased + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'forum_posts' THEN
      UPDATE user_progress SET forum_posts = forum_posts + increment_value WHERE user_progress.user_id = update_user_stat.user_id;
    WHEN 'daily_login_streak' THEN
      UPDATE user_progress SET daily_login_streak = increment_value WHERE user_progress.user_id = update_user_stat.user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to add points to user
CREATE OR REPLACE FUNCTION add_user_points(user_id UUID, points INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO user_progress (user_id, total_points) 
  VALUES (user_id, points)
  ON CONFLICT (user_id) 
  DO UPDATE SET total_points = user_progress.total_points + points;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read all public user data, but only update their own
CREATE POLICY "Users can read all user profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can only access their own collections
CREATE POLICY "Users can manage own collections" ON user_collections FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own progress and badges
CREATE POLICY "Users can read own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);

-- Users can only access their own notifications
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);