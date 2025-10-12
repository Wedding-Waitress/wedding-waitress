-- Add RLS policies for gallery owners to access their media in event-media bucket
CREATE POLICY "Gallery owners can view their media (gallery)"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-media' AND
  EXISTS (
    SELECT 1
    FROM public.media_uploads mu
    JOIN public.galleries g ON g.id = mu.gallery_id
    WHERE mu.file_url = storage.objects.name
      AND g.owner_id = auth.uid()
  )
);

CREATE POLICY "Gallery owners can delete their media (gallery)"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-media' AND
  EXISTS (
    SELECT 1
    FROM public.media_uploads mu
    JOIN public.galleries g ON g.id = mu.gallery_id
    WHERE mu.file_url = storage.objects.name
      AND g.owner_id = auth.uid()
  )
);