-- Remove price range fields from user_preferences table
ALTER TABLE public.user_preferences
  DROP COLUMN IF EXISTS min_price,
  DROP COLUMN IF EXISTS max_price;

-- Drop the price range constraint if it exists
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS valid_price_range;
