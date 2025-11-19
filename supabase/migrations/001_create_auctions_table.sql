-- Migration: Create auctions table for auction listings
-- This table stores all auction items and their details

-- Create auctions table
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Item details
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,

  -- Auction details
  starting_bid DECIMAL(10, 2) NOT NULL CHECK (starting_bid >= 0),
  current_bid DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (current_bid >= 0),
  buy_now_price DECIMAL(10, 2) CHECK (buy_now_price IS NULL OR buy_now_price > starting_bid),
  bid_count INTEGER DEFAULT 0 CHECK (bid_count >= 0),

  -- Timing
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'upcoming', 'active', 'ended', 'sold', 'cancelled')),
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON public.auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_category ON public.auctions(category);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_is_featured ON public.auctions(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_auctions_current_bid ON public.auctions(current_bid DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_created_at ON public.auctions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for auctions table
-- Anyone can view active auctions
CREATE POLICY "Anyone can view active auctions" ON public.auctions
  FOR SELECT USING (
    status IN ('active', 'ended', 'sold') OR seller_id = auth.uid()
  );

-- Only authenticated users can create auctions
CREATE POLICY "Authenticated users can create auctions" ON public.auctions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Users can update their own auctions
CREATE POLICY "Users can update own auctions" ON public.auctions
  FOR UPDATE USING (auth.uid() = seller_id);

-- Users can delete their own auctions (only if no bids)
CREATE POLICY "Users can delete own auctions with no bids" ON public.auctions
  FOR DELETE USING (auth.uid() = seller_id AND bid_count = 0);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_auction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on auction changes
DROP TRIGGER IF EXISTS update_auctions_updated_at ON public.auctions;
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_auction_updated_at();

-- Function to automatically update auction status based on time
CREATE OR REPLACE FUNCTION public.update_auction_status()
RETURNS void AS $$
BEGIN
  -- Set upcoming auctions to active when start time is reached
  UPDATE public.auctions
  SET status = 'active'
  WHERE status = 'upcoming'
    AND start_time <= NOW();

  -- Set active auctions to ended when end time is reached
  UPDATE public.auctions
  SET status = 'ended'
  WHERE status = 'active'
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
