-- Create audio_guestbook table
CREATE TABLE IF NOT EXISTS public.audio_guestbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID REFERENCES public.galleries(id) ON DELETE CASCADE,
  uploader_token TEXT NOT NULL,
  file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_guestbook ENABLE ROW LEVEL SECURITY;

-- Gallery owners can view their audio messages
CREATE POLICY "Gallery owners can view audio"
  ON public.audio_guestbook
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = audio_guestbook.gallery_id
      AND galleries.owner_id = auth.uid()
    )
  );

-- Gallery owners can delete audio messages
CREATE POLICY "Gallery owners can delete audio"
  ON public.audio_guestbook
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = audio_guestbook.gallery_id
      AND galleries.owner_id = auth.uid()
    )
  );

-- Public guests can insert audio for active galleries
CREATE POLICY "Guests can insert audio for active galleries"
  ON public.audio_guestbook
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = audio_guestbook.gallery_id
      AND g.is_active = true
      AND g.show_public_gallery = true
    )
  );

-- Public can read approved audio for active galleries
CREATE POLICY "Public can read audio for active galleries"
  ON public.audio_guestbook
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = audio_guestbook.gallery_id
      AND g.is_active = true
      AND g.show_public_gallery = true
    )
  );

-- Create storage bucket for audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for audio uploads
CREATE POLICY "Gallery owners can view audio files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'audio-uploads' AND
    EXISTS (
      SELECT 1 FROM public.audio_guestbook ag
      JOIN public.galleries g ON g.id = ag.gallery_id
      WHERE ag.file_url = storage.objects.name
      AND g.owner_id = auth.uid()
    )
  );

CREATE POLICY "Guests can upload audio files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'audio-uploads'
  );

CREATE POLICY "Public can view audio files for active galleries"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'audio-uploads' AND
    EXISTS (
      SELECT 1 FROM public.audio_guestbook ag
      JOIN public.galleries g ON g.id = ag.gallery_id
      WHERE ag.file_url = storage.objects.name
      AND g.is_active = true
      AND g.show_public_gallery = true
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_audio_guestbook_gallery_id ON public.audio_guestbook(gallery_id);
CREATE INDEX IF NOT EXISTS idx_audio_guestbook_created_at ON public.audio_guestbook(created_at DESC);