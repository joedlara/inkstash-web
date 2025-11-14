# Auction Status Constraint Fix

## The Problem
The `auctions` table has a CHECK constraint `auctions_status_check` that doesn't include 'sold' as a valid status. When trying to complete a purchase, the `create_order` function fails because it tries to set `status = 'sold'`.

## Step-by-Step Fix

### Step 1: Check what status values currently exist
Run this query in Supabase SQL Editor to see what we're dealing with:

```sql
SELECT status, COUNT(*) as count
FROM auctions
GROUP BY status
ORDER BY count DESC;
```

This will show you all unique status values and how many rows have each value.

### Step 2: Check the current constraint definition
Run this to see what the current constraint allows:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'auctions_status_check'
  AND conrelid = 'auctions'::regclass;
```

### Step 3A: If the constraint shows status values NOT in ('active', 'sold', 'ended', 'cancelled', 'draft')

You need to update those rows first. For example, if you see status values like 'open', 'closed', etc:

```sql
-- Fix invalid status values (modify based on what Step 1 showed)
UPDATE auctions SET status = 'active' WHERE status = 'open';
UPDATE auctions SET status = 'ended' WHERE status = 'closed';
-- Add more as needed based on your data

-- Or if you want to set everything to 'active' (nuclear option):
-- UPDATE auctions SET status = 'active';
```

### Step 3B: After fixing data, update the constraint

```sql
-- Drop the old constraint
ALTER TABLE auctions DROP CONSTRAINT auctions_status_check;

-- Add new constraint with 'sold' included
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'sold', 'ended', 'cancelled', 'draft'));

-- Ensure sold_at column exists
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
```

## Alternative: Quick Nuclear Option

If you don't care about preserving the current status values and just want to fix it quickly:

```sql
-- Set all auctions to 'active' (this will allow us to drop the constraint)
UPDATE auctions SET status = 'active';

-- Drop the old constraint
ALTER TABLE auctions DROP CONSTRAINT auctions_status_check;

-- Add new constraint with 'sold' included
ALTER TABLE auctions
  ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('active', 'sold', 'ended', 'cancelled', 'draft'));

-- Ensure sold_at column exists
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
```

## After Running the Fix

1. Clear your browser cache (hard refresh: Cmd+Shift+R)
2. Try completing a purchase again
3. The order should now process successfully!
