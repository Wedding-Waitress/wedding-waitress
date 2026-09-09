ALTER TABLE public.venue_floor_plan_templates ADD COLUMN IF NOT EXISTS auto_shared boolean NOT NULL DEFAULT false;
CREATE POLICY shared_venue_directory_read ON public.venue_floor_plan_templates FOR SELECT TO authenticated USING (auto_shared);
