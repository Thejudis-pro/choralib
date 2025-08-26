-- Make partition-files bucket public for immediate previews
UPDATE storage.buckets 
SET public = true 
WHERE id = 'partition-files';

-- Create public access policy for partition files
CREATE POLICY "Public partition file access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'partition-files');

-- Drop the downloads table as it's no longer needed
DROP TABLE IF EXISTS public.downloads;