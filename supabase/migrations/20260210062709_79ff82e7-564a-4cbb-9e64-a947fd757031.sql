-- Delete all 25 corrupted files from place-card-gallery bucket
DELETE FROM storage.objects WHERE bucket_id = 'place-card-gallery';