ALTER TABLE public.venue_floor_plan_templates
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS venue_contact_number text;
