-- Migration: Auto-unfeatured auctions when sold or ended
-- This trigger automatically sets is_featured to false when an auction's status changes to 'sold' or 'ended'

-- Create the trigger function
CREATE OR REPLACE FUNCTION auto_unfeatured_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing to 'sold' or 'ended', set is_featured to false
  IF (NEW.status IN ('sold', 'ended')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.is_featured = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_unfeatured ON auctions;
CREATE TRIGGER trigger_auto_unfeatured
  BEFORE UPDATE ON auctions
  FOR EACH ROW
  EXECUTE FUNCTION auto_unfeatured_on_status_change();

-- Update existing sold or ended auctions to be unfeatured
UPDATE auctions
SET is_featured = false
WHERE status IN ('sold', 'ended') AND is_featured = true;
