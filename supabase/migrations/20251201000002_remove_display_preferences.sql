-- Remove display preference fields from user_preferences table
-- These UI preferences (items per page, default sort) are not needed
-- as they can be handled client-side without database persistence

ALTER TABLE public.user_preferences
  DROP COLUMN IF EXISTS items_per_page,
  DROP COLUMN IF EXISTS default_sort;
