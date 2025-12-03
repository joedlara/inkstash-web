-- Fix RLS policies on users table
-- Remove duplicate/conflicting policies and create clean ones

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can insert users" ON "public"."users";
DROP POLICY IF EXISTS "Anyone can read user profiles" ON "public"."users";
DROP POLICY IF EXISTS "Anyone can update users" ON "public"."users";
DROP POLICY IF EXISTS "Anyone can view user profiles" ON "public"."users";
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."users";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";

-- Create clean, non-conflicting policies

-- SELECT: Anyone can view user profiles (public data)
CREATE POLICY "users_select_public"
  ON "public"."users"
  FOR SELECT
  USING (true);

-- INSERT: Users can only insert their own profile (id must match auth.uid())
CREATE POLICY "users_insert_own"
  ON "public"."users"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "users_update_own"
  ON "public"."users"
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile (optional, add if needed)
CREATE POLICY "users_delete_own"
  ON "public"."users"
  FOR DELETE
  USING (auth.uid() = id);
