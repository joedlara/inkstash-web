-- Migration: Fix orphaned auctions with invalid seller_ids
-- This migration handles auctions that reference non-existent users

-- First, let's create a system user for orphaned auctions
DO $$
DECLARE
  v_system_user_id UUID;
  v_existing_user_id UUID;
BEGIN
  -- Check if we have any existing users
  SELECT id INTO v_existing_user_id FROM public.users LIMIT 1;

  -- If no users exist, we'll need to handle this differently
  -- For now, just log a notice
  IF v_existing_user_id IS NULL THEN
    RAISE NOTICE 'No users found in users table. Auctions may reference non-existent users.';
  ELSE
    -- Update all auctions with invalid seller_ids to point to the first existing user
    UPDATE public.auctions
    SET seller_id = v_existing_user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auctions.seller_id
    );

    RAISE NOTICE 'Updated orphaned auctions to use existing user: %', v_existing_user_id;
  END IF;
END $$;

-- Ensure all auctions have valid status
UPDATE public.auctions
SET status = 'active'
WHERE status IS NULL OR status NOT IN ('draft', 'upcoming', 'active', 'ended', 'sold', 'cancelled');

-- Ensure current_bid is not null and at least equal to starting_bid
UPDATE public.auctions
SET current_bid = COALESCE(current_bid, starting_bid, 0)
WHERE current_bid IS NULL OR current_bid < starting_bid;

-- Ensure bid_count is not null
UPDATE public.auctions
SET bid_count = COALESCE(bid_count, 0)
WHERE bid_count IS NULL;
