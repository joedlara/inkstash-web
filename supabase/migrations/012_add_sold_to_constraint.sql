-- Add 'sold' status to the existing auction status constraint
-- Current constraint: CHECK (status = ANY (ARRAY['upcoming'::text, 'live'::text, 'ended'::text]))
-- We need to add 'sold' so that create_order() can mark auctions as sold

-- Step 1: Drop the existing constraint
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;

-- Step 2: Add new constraint that includes 'sold' plus your existing statuses
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('upcoming', 'live', 'ended', 'sold', 'cancelled', 'draft', 'active'));

-- Step 3: Ensure sold_at column exists for tracking when item was sold
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
