-- Make event-media bucket public so photos/videos display immediately without signed URLs
UPDATE storage.buckets 
SET public = true 
WHERE name = 'event-media';