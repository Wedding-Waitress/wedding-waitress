-- Fix venue-logos storage policy to restrict DELETE and UPDATE to file owners only
DROP POLICY IF EXISTS "Authenticated users can delete from venue-logos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update venue-logos" ON storage.objects;

CREATE POLICY "Users can delete their own venue logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'venue-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own venue logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'venue-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Remove orphaned storage policy for non-existent audio-uploads bucket
DROP POLICY IF EXISTS "Guests can upload audio files" ON storage.objects;