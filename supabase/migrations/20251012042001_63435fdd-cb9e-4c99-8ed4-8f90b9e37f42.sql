-- Create gallery_exports table to track export jobs
CREATE TABLE IF NOT EXISTS public.gallery_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('approved', 'all')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'ready', 'error')) DEFAULT 'queued',
  file_path TEXT,
  download_url TEXT,
  file_size_bytes BIGINT,
  items_count INTEGER,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gallery_exports_gallery_id ON public.gallery_exports(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_exports_status ON public.gallery_exports(status);
CREATE INDEX IF NOT EXISTS idx_gallery_exports_created_by ON public.gallery_exports(created_by);

-- Enable RLS
ALTER TABLE public.gallery_exports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Gallery owners can view their exports
CREATE POLICY "Gallery owners can view their exports"
ON public.gallery_exports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries
    WHERE galleries.id = gallery_exports.gallery_id
    AND galleries.owner_id = auth.uid()
  )
);

-- RLS Policy: Gallery owners can create exports
CREATE POLICY "Gallery owners can create exports"
ON public.gallery_exports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.galleries
    WHERE galleries.id = gallery_exports.gallery_id
    AND galleries.owner_id = auth.uid()
  )
);

-- RLS Policy: Only service role can update exports
CREATE POLICY "Service role can update exports"
ON public.gallery_exports
FOR UPDATE
TO service_role
USING (true);

-- Add comments
COMMENT ON TABLE public.gallery_exports IS 'Tracks ZIP export jobs for photo/video galleries';
COMMENT ON COLUMN public.gallery_exports.scope IS 'Export scope: approved (approved items only) or all (including pending)';
COMMENT ON COLUMN public.gallery_exports.status IS 'Export status: queued, running, ready, error';
COMMENT ON COLUMN public.gallery_exports.expires_at IS 'When the download URL expires (typically 7 days after creation)';

-- Create exports bucket for storing ZIP files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  1073741824,
  ARRAY['application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Gallery owners can read their exports
CREATE POLICY "Gallery owners can read their exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exports'
  AND (storage.foldername(name))[1] IN (
    SELECT galleries.id::text
    FROM public.galleries
    WHERE galleries.owner_id = auth.uid()
  )
);

-- RLS Policy: Service role can write exports
CREATE POLICY "Service role can write exports"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'exports');

-- RLS Policy: Service role can delete old exports
CREATE POLICY "Service role can delete exports"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'exports');