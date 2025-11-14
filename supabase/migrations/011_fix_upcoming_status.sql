-- Fix the auction status issue
-- Problem: All auctions have status='upcoming' but the constraint doesn't allow it
-- Solution: Update 'upcoming' to 'active' and add proper constraint

-- Step 1: Update all 'upcoming' status to 'active'
-- (since 'upcoming' is not in the allowed values)
UPDATE auctions SET status = 'active' WHERE status = 'upcoming';

-- Step 2: Drop the old constraint
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;

-- Step 3: Add new constraint that includes both 'upcoming' and 'sold'
-- This way future auctions can use either status
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'upcoming', 'sold', 'ended', 'cancelled', 'draft'));

-- Step 4: Ensure sold_at column exists
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Step 5: Create index
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
