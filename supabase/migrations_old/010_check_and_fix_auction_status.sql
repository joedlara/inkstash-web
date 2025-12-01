-- First, let's see what status values currently exist
-- Run this query first to see what we're dealing with:
-- SELECT status, COUNT(*) FROM auctions GROUP BY status;

-- Step 1: Fix any rows with invalid status values BEFORE dropping constraint
-- Set any NULL or invalid status to 'active'
UPDATE auctions
SET status = 'active'
WHERE status IS NULL
   OR status = ''
   OR TRIM(status) = '';

-- Step 2: Now drop the constraint (this should work after fixing data)
ALTER TABLE auctions DROP CONSTRAINT auctions_status_check;

-- Step 3: Add the new constraint with 'sold' included
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'sold', 'ended', 'cancelled', 'draft'));

-- Step 4: Ensure sold_at column exists
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Step 5: Create index
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
