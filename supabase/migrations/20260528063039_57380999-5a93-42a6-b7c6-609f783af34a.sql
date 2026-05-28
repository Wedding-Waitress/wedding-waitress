-- Update default max_video_bytes for new events to 600MB
ALTER TABLE public.event_media_limits ALTER COLUMN max_video_bytes SET DEFAULT 629145600;

-- Backfill existing rows still below 600MB
UPDATE public.event_media_limits SET max_video_bytes = 629145600 WHERE max_video_bytes < 629145600;