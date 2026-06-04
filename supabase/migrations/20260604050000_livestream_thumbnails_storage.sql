-- Allow authenticated hosts to upload livestream thumbnails to their own folder.
-- Mirrors the existing 'listings' folder policy but scoped to
-- 'livestream-thumbnails/{user_id}/...'.

CREATE POLICY "Users can upload livestream thumbnails to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'livestream-thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own livestream thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'livestream-thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can update their own livestream thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'livestream-thumbnails'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
