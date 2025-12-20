-- Add bride/groom name columns to ceremony_floor_plans
ALTER TABLE public.ceremony_floor_plans
ADD COLUMN IF NOT EXISTS person_left_name text DEFAULT 'Groom',
ADD COLUMN IF NOT EXISTS person_right_name text DEFAULT 'Bride';