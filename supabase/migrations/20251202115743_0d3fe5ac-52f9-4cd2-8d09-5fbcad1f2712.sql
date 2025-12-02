-- Create table to track welcome video uploads
CREATE TABLE public.welcome_video_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cloudflare_uid TEXT NOT NULL,
  cloudflare_playback_url TEXT,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  duration_seconds INTEGER,
  file_name TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id)
);

-- Enable RLS
ALTER TABLE public.welcome_video_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own video uploads"
  ON public.welcome_video_uploads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update trigger
CREATE TRIGGER update_welcome_video_uploads_updated_at
  BEFORE UPDATE ON public.welcome_video_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();