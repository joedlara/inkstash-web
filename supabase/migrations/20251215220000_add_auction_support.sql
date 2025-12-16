-- Add auction support to listings table

-- Add auction-related columns
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS auction_start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS auction_end_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS auction_duration_days integer;

-- Add indexes for auctions
CREATE INDEX IF NOT EXISTS idx_listings_is_auction ON public.listings(is_auction) WHERE is_auction = true;
CREATE INDEX IF NOT EXISTS idx_listings_auction_end_time ON public.listings(auction_end_time) WHERE auction_end_time IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.listings.auction_start_time IS 'When the auction starts (defaults to creation time)';
COMMENT ON COLUMN public.listings.auction_end_time IS 'When the auction ends (required for auctions)';
COMMENT ON COLUMN public.listings.auction_duration_days IS 'Auction duration in days (1-14 days allowed)';

-- Add constraint to ensure auction duration is between 1 and 14 days
ALTER TABLE public.listings
ADD CONSTRAINT check_auction_duration
CHECK (auction_duration_days IS NULL OR (auction_duration_days >= 1 AND auction_duration_days <= 14));

-- Add constraint to ensure auction listings have end time
ALTER TABLE public.listings
ADD CONSTRAINT check_auction_end_time
CHECK (
  (is_auction = false OR auction_end_time IS NOT NULL)
);
