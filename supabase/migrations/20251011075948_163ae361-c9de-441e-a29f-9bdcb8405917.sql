-- Add columns to events table for setup wizard
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('wedding', 'party', 'conference', 'birthday', 'other')),
ADD COLUMN IF NOT EXISTS event_display_name TEXT,
ADD COLUMN IF NOT EXISTS event_date_override DATE,
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Add columns to media_uploads table for text posts
ALTER TABLE public.media_uploads
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'photo' CHECK (post_type IN ('photo', 'video', 'text')),
ADD COLUMN IF NOT EXISTS text_content TEXT,
ADD COLUMN IF NOT EXISTS theme_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_setup_completed ON public.events(user_id, setup_completed);
CREATE INDEX IF NOT EXISTS idx_media_uploads_post_type ON public.media_uploads(event_id, post_type);

-- Add comment for documentation
COMMENT ON COLUMN public.events.event_type IS 'Type of event: wedding, party, conference, birthday, or other';
COMMENT ON COLUMN public.events.event_display_name IS 'Custom display name for the event (e.g., Dan and Rachel Wedding)';
COMMENT ON COLUMN public.events.event_date_override IS 'Optional date override for media gallery display';
COMMENT ON COLUMN public.events.setup_completed IS 'Tracks if the setup wizard has been completed';
COMMENT ON COLUMN public.media_uploads.post_type IS 'Type of post: photo, video, or text';
COMMENT ON COLUMN public.media_uploads.text_content IS 'Content for text posts';
COMMENT ON COLUMN public.media_uploads.theme_id IS 'Theme identifier for text posts';