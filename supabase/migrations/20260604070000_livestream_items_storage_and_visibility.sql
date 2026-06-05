-- Per-lot composer photos + draft-listing visibility through livestream_items.
--
-- Part 1: Storage RLS for `user-uploads/livestream-items/{user_id}/...`.
--   Mirrors the livestream-thumbnails RLS shipped in Phase 1 so the
--   Creator Hub composer can upload a separate image per queued lot.
--
-- Part 2: Listings SELECT policy update.
--   Composer items insert as listings.status='draft' so they don't show
--   up in /marketplace. But the buyer-side stream Shop card joins
--   livestream_items -> listings and would be blocked by RLS for draft
--   rows. Add a viewer-side SELECT policy: any listing that has a row
--   in livestream_items for a stream is visible to anyone who can see
--   that stream (status in 'live' or 'preparing').

-- ── Part 1: storage policies for livestream-items path ──────────────

CREATE POLICY "Users can upload livestream item photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = 'livestream-items'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update their own livestream item photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = 'livestream-items'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own livestream item photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = 'livestream-items'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── Part 2: draft listings visible when featured in a live stream ──

CREATE POLICY "Anyone can view listings featured in a live stream"
  ON public.listings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.livestream_items li
      JOIN public.livestreams ls ON ls.id = li.livestream_id
      WHERE li.listing_id = public.listings.id
        AND ls.status IN ('live', 'preparing')
        AND li.status <> 'removed'
    )
  );
