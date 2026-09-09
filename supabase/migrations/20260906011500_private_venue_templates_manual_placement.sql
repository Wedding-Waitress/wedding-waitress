ALTER TABLE public.reception_floor_plans ADD COLUMN IF NOT EXISTS manual_placement boolean NOT NULL DEFAULT false;
CREATE TABLE public.saved_venue_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 meta jsonb NOT NULL, layout jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_venue_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_saved_templates ON public.saved_venue_templates FOR ALL TO authenticated USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_venue_templates TO authenticated;
