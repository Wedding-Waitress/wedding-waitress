
-- Phase 3: Public Venue Template Directory
CREATE TABLE IF NOT EXISTS public.venue_floor_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL,
  venue_name text NOT NULL,
  room_name text NOT NULL,
  city text,
  country text,
  capacity integer NOT NULL DEFAULT 0,
  room_shape text NOT NULL DEFAULT 'rect',
  room_width_m numeric NOT NULL DEFAULT 12,
  room_length_m numeric NOT NULL DEFAULT 15,
  grid_size_cm integer NOT NULL DEFAULT 50,
  room_polygon jsonb,
  fixtures jsonb NOT NULL DEFAULT '[]'::jsonb,
  table_positions jsonb NOT NULL DEFAULT '[]'::jsonb,
  background_image_path text,
  background_x numeric NOT NULL DEFAULT 0,
  background_y numeric NOT NULL DEFAULT 0,
  background_width numeric,
  background_height numeric,
  background_rotation numeric NOT NULL DEFAULT 0,
  background_opacity numeric NOT NULL DEFAULT 0.6,
  notes text,
  approved boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vftp_approved ON public.venue_floor_plan_templates (approved) WHERE approved = true;
CREATE INDEX IF NOT EXISTS idx_vftp_submitter ON public.venue_floor_plan_templates (submitted_by);
CREATE INDEX IF NOT EXISTS idx_vftp_city ON public.venue_floor_plan_templates (city);

ALTER TABLE public.venue_floor_plan_templates ENABLE ROW LEVEL SECURITY;

-- View: approved templates visible to any authenticated user
CREATE POLICY "Approved templates are viewable by authenticated"
ON public.venue_floor_plan_templates FOR SELECT
TO authenticated
USING (approved = true);

-- Submitters can view their own (any status)
CREATE POLICY "Submitter can view own templates"
ON public.venue_floor_plan_templates FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all templates"
ON public.venue_floor_plan_templates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert: any signed-in user; must be self and unapproved
CREATE POLICY "Users can submit templates"
ON public.venue_floor_plan_templates FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid() AND approved = false);

-- Update: submitter can update own while unapproved
CREATE POLICY "Submitter can update own unapproved"
ON public.venue_floor_plan_templates FOR UPDATE
TO authenticated
USING (submitted_by = auth.uid() AND approved = false)
WITH CHECK (submitted_by = auth.uid() AND approved = false);

-- Update: admins anything
CREATE POLICY "Admins can update any template"
ON public.venue_floor_plan_templates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Delete: submitter own unapproved, admins anything
CREATE POLICY "Submitter can delete own unapproved"
ON public.venue_floor_plan_templates FOR DELETE
TO authenticated
USING (submitted_by = auth.uid() AND approved = false);

CREATE POLICY "Admins can delete any template"
ON public.venue_floor_plan_templates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER trg_vftp_updated_at
BEFORE UPDATE ON public.venue_floor_plan_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (public read for backgrounds)
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-template-backgrounds', 'venue-template-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read venue template backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-template-backgrounds');

CREATE POLICY "Auth users upload to own folder venue templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venue-template-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth users update own venue template files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-template-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Auth users delete own venue template files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-template-backgrounds'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins manage venue template files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'venue-template-backgrounds' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'venue-template-backgrounds' AND public.has_role(auth.uid(), 'admin'));
