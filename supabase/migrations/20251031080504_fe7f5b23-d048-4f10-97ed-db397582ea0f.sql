-- Update default video limits to 500MB / 5 minutes for future events
ALTER TABLE media_gallery_settings
ALTER COLUMN max_video_size_mb SET DEFAULT 500;

ALTER TABLE media_gallery_settings
ALTER COLUMN max_video_duration_seconds SET DEFAULT 300;

-- Update existing events to the new defaults
UPDATE media_gallery_settings
SET 
  max_video_size_mb = 500,
  max_video_duration_seconds = 300
WHERE max_video_size_mb <= 100;