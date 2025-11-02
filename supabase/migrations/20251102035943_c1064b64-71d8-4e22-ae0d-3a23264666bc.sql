-- Update default photo/video limits to 25MB/1GB/10min
-- Update defaults for future events
ALTER TABLE media_gallery_settings
ALTER COLUMN max_photo_size_mb SET DEFAULT 25;

ALTER TABLE media_gallery_settings
ALTER COLUMN max_video_size_mb SET DEFAULT 1000;

ALTER TABLE media_gallery_settings
ALTER COLUMN max_video_duration_seconds SET DEFAULT 600;

-- Upgrade all existing events to new limits
UPDATE media_gallery_settings
SET 
  max_photo_size_mb = 25,
  max_video_size_mb = 1000,
  max_video_duration_seconds = 600;