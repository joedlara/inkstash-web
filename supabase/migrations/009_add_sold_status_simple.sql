-- Simple migration to add 'sold' status to the auctions_status_check constraint
-- This addresses: "new row for relation 'auctions' violates check constraint 'auctions_status_check'"

-- Step 1: Drop the existing constraint
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;

-- Step 2: Recreate the constraint with 'sold' added
-- Based on the error detail, we can see the table already has status column with 'active' value
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'sold', 'ended', 'cancelled', 'draft'));

-- Step 3: Ensure sold_at column exists for tracking when item was sold
ALTER TABLE auctions
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
