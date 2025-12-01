-- Manual cleanup script for orphaned auth users
-- Run this in your Supabase SQL Editor

-- 1. First, check which auth users don't have public.users records
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE WHEN pu.id IS NULL THEN 'ORPHANED' ELSE 'OK' END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;

-- 2. Delete the orphaned auth user for the email that's causing issues
-- Replace 'oc.premieracademy@gmail.com' with your email if different
DELETE FROM auth.users
WHERE email = 'oc.premieracademy@gmail.com'
  AND id NOT IN (SELECT id FROM public.users);

-- 3. Verify the cleanup worked
SELECT COUNT(*) as orphaned_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
