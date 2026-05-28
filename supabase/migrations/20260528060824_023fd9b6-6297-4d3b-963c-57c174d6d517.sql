ALTER TABLE public.event_media_limits ALTER COLUMN max_video_bytes SET DEFAULT 262144000;
UPDATE public.event_media_limits SET max_video_bytes = 262144000 WHERE max_video_bytes < 262144000;