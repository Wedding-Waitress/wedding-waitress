
-- 1. Add columns to live_view_settings
ALTER TABLE public.live_view_settings
  ADD COLUMN show_floor_plan boolean NOT NULL DEFAULT false,
  ADD COLUMN show_menu boolean NOT NULL DEFAULT false;

-- 2. Add columns to live_view_module_settings
ALTER TABLE public.live_view_module_settings
  ADD COLUMN floor_plan_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN menu_config jsonb DEFAULT '{}'::jsonb;

-- 3. Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-view-uploads', 'live-view-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for live-view-uploads
CREATE POLICY "Authenticated users can upload to live-view-uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'live-view-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their uploads in live-view-uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'live-view-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their uploads in live-view-uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'live-view-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view live-view-uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'live-view-uploads');

-- 5. Drop old functions first
DROP FUNCTION IF EXISTS public.get_public_event_with_data_secure(text, text);
DROP FUNCTION IF EXISTS public.get_public_live_view_settings(text);
