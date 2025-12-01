-- Fix auction_views table - add created_at column as alias for viewed_at
-- The RPC function references created_at but the table has viewed_at

-- Add created_at column that mirrors viewed_at
ALTER TABLE public.auction_views
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Update existing rows to copy viewed_at to created_at
UPDATE public.auction_views
SET created_at = viewed_at
WHERE created_at IS NULL;

-- Create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_auction_views_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := NEW.viewed_at;
  ELSIF TG_OP = 'UPDATE' AND NEW.viewed_at IS DISTINCT FROM OLD.viewed_at THEN
    NEW.created_at := NEW.viewed_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_auction_views_timestamps_trigger ON public.auction_views;
CREATE TRIGGER sync_auction_views_timestamps_trigger
BEFORE INSERT OR UPDATE ON public.auction_views
FOR EACH ROW
EXECUTE FUNCTION sync_auction_views_timestamps();
