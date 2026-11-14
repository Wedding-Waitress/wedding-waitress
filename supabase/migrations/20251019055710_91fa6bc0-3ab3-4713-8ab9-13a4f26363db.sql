-- Drop all photo/video sharing related tables and functions

-- Drop triggers first
DROP TRIGGER IF EXISTS update_galleries_updated_at ON galleries;

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS gallery_analytics CASCADE;
DROP TABLE IF EXISTS gallery_exports CASCADE;
DROP TABLE IF EXISTS gallery_shortlinks CASCADE;
DROP TABLE IF EXISTS audio_guestbook CASCADE;
DROP TABLE IF EXISTS media_uploads CASCADE;
DROP TABLE IF EXISTS upload_sessions CASCADE;
DROP TABLE IF EXISTS gallery_settings CASCADE;
DROP TABLE IF EXISTS media_upload_tokens CASCADE;
DROP TABLE IF EXISTS galleries CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_gallery_analytics_summary(uuid);
DROP FUNCTION IF EXISTS validate_media_token(uuid, text);
DROP FUNCTION IF EXISTS get_public_gallery_data(text);
DROP FUNCTION IF EXISTS generate_gallery_slug(text);
DROP FUNCTION IF EXISTS ensure_gallery_shortlink();
DROP FUNCTION IF EXISTS get_public_gallery_media(text);
DROP FUNCTION IF EXISTS get_next_media_seq_number(uuid, text);
DROP FUNCTION IF EXISTS get_all_gallery_analytics();
DROP FUNCTION IF EXISTS update_galleries_updated_at();
DROP FUNCTION IF EXISTS cleanup_expired_upload_sessions();

-- Remove all files from storage buckets first
DELETE FROM storage.objects WHERE bucket_id IN ('event-media', 'audio-uploads');

-- Now remove the buckets
DELETE FROM storage.buckets WHERE id IN ('event-media', 'audio-uploads');