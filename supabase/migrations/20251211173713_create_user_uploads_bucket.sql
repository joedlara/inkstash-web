-- Create the user-uploads storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'listings'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read all files (for viewing listings)
CREATE POLICY "Anyone can view uploaded files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-uploads');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'listings'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-uploads'
  AND (storage.foldername(name))[1] = 'listings'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
