-- Fix the auction status constraint to include 'sold' status
-- This migration addresses the error: "new row for relation 'auctions' violates check constraint 'auctions_status_check'"

-- Step 1: Ensure the status column exists
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'auctions'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE auctions ADD COLUMN status TEXT DEFAULT 'active';
    END IF;

    -- Add sold_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'auctions'
        AND column_name = 'sold_at'
    ) THEN
        ALTER TABLE auctions ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Step 2: Fix any invalid status values in existing rows
-- Update NULL values to 'active'
UPDATE auctions SET status = 'active' WHERE status IS NULL;

-- Update any invalid status values to 'active'
-- This handles cases where status might be something unexpected
UPDATE auctions
SET status = 'active'
WHERE status NOT IN ('active', 'sold', 'ended', 'cancelled', 'draft');

-- Step 3: Drop the old constraint
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;

-- Step 4: Add the new constraint with 'sold' included
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'sold', 'ended', 'cancelled', 'draft'));

-- Step 5: Create index on auction status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);

-- Step 6: Set NOT NULL and default after cleaning data
ALTER TABLE auctions ALTER COLUMN status SET NOT NULL;
ALTER TABLE auctions ALTER COLUMN status SET DEFAULT 'active';
