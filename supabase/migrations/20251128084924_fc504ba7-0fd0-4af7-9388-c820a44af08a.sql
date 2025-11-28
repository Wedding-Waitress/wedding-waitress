-- Drop Photo & Video Sharing tables
-- Drop in correct order to respect foreign key dependencies

DROP TABLE IF EXISTS upload_rate_limits CASCADE;
DROP TABLE IF EXISTS guestbook_messages CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
DROP TABLE IF EXISTS media_gallery_settings CASCADE;

-- Drop the RPC function for getting gallery media (no longer needed)
DROP FUNCTION IF EXISTS get_gallery_media(text);
DROP FUNCTION IF EXISTS get_guestbook_messages(text);