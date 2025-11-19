-- Migration: Relax auction RLS policies for development
-- This allows viewing all auctions regardless of seller_id validity
-- WARNING: Review these policies before going to production!

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;

-- Create a more permissive policy for development
-- This allows anyone to view any auction
CREATE POLICY "Anyone can view all auctions" ON public.auctions
  FOR SELECT USING (true);

-- Optional: If you want to restrict to only certain statuses, use this instead:
-- CREATE POLICY "Anyone can view all auctions" ON public.auctions
--   FOR SELECT USING (
--     status IN ('draft', 'upcoming', 'active', 'ended', 'sold', 'cancelled')
--   );
