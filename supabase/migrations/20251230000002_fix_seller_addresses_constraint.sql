-- Fix the unique constraint for seller_ship_from_addresses
-- The previous constraint was blocking multiple addresses with is_default=false

-- Drop the old constraint
ALTER TABLE seller_ship_from_addresses
  DROP CONSTRAINT IF EXISTS unique_default_per_user;

-- Create a partial unique index that only enforces uniqueness when is_default = true
-- This allows multiple addresses with is_default = false, but only one with is_default = true
CREATE UNIQUE INDEX unique_default_per_user
  ON seller_ship_from_addresses(user_id)
  WHERE is_default = true;
