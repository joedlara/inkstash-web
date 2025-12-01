-- This migration fixes the seller_id foreign key constraint issue
-- The problem is likely that auctions.seller_id doesn't properly reference auth.users

-- First, let's make sure the seller_id column exists and has the right type
-- We'll drop the existing constraint if it exists and recreate it properly

-- Drop existing foreign key constraint on seller_id if it exists
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS fk_auctions_seller;

-- Ensure seller_id column exists and is UUID type
ALTER TABLE auctions
  ALTER COLUMN seller_id TYPE UUID USING seller_id::UUID,
  ALTER COLUMN seller_id SET NOT NULL;

-- Add the correct foreign key constraint referencing auth.users
ALTER TABLE auctions
  ADD CONSTRAINT auctions_seller_id_fkey
  FOREIGN KEY (seller_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Create index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
