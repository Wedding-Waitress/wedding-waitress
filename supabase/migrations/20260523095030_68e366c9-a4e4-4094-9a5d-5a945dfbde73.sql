-- Add visibility toggle
ALTER TABLE public.reception_floor_plans
  ADD COLUMN IF NOT EXISTS background_visible boolean NOT NULL DEFAULT true;

-- Private bucket for venue background uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('reception-floor-plan-backgrounds', 'reception-floor-plan-backgrounds', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only the owner (first folder segment = auth.uid()) can read/write
DROP POLICY IF EXISTS "Reception bg owner select" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner insert" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner update" ON storage.objects;
DROP POLICY IF EXISTS "Reception bg owner delete" ON storage.objects;

CREATE POLICY "Reception bg owner select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Reception bg owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Reception bg owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Reception bg owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'reception-floor-plan-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);