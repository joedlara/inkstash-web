-- Clean up orphaned auth users that don't have corresponding public.users records
-- This can happen when the trigger fails or wasn't properly set up

-- First, let's see which auth users don't have public.users records
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Count orphaned auth users
  SELECT COUNT(*)
  INTO orphan_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;

  RAISE NOTICE 'Found % orphaned auth users', orphan_count;

  -- Delete orphaned auth users (this is safe because they have no data in public.users)
  DELETE FROM auth.users
  WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  );

  RAISE NOTICE 'Deleted % orphaned auth users', orphan_count;
END $$;

-- Verify the trigger exists and is properly configured
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created does not exist!';
  END IF;

  RAISE NOTICE 'Trigger on_auth_user_created exists and is active';
END $$;
