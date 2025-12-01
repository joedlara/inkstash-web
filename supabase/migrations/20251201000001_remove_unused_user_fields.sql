-- Remove unused fields from users table
-- These fields are being replaced by an AI-driven algorithm that uses
-- user behavior (watches, likes, saves, purchases) to personalize content

ALTER TABLE public.users
  DROP COLUMN IF EXISTS price_range,
  DROP COLUMN IF EXISTS preferences,
  DROP COLUMN IF EXISTS favorite_characters,
  DROP COLUMN IF EXISTS collection_focus;
