-- Approved by Nader and applied as welcome_video_upload_history on 2026-09-05. No records deleted or modified.
-- Track both the current video and its replacement until publication/cleanup succeeds.
ALTER TABLE public.welcome_video_uploads
  DROP CONSTRAINT IF EXISTS welcome_video_uploads_event_id_key;
CREATE INDEX IF NOT EXISTS welcome_video_uploads_event_created_idx
  ON public.welcome_video_uploads(event_id, created_at DESC);
