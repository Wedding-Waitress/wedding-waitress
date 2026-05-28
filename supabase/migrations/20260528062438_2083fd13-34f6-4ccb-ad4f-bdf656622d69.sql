ALTER TABLE public.event_media_limits ALTER COLUMN max_video_bytes SET DEFAULT 524288000;
UPDATE public.event_media_limits SET max_video_bytes = 524288000 WHERE max_video_bytes < 524288000;