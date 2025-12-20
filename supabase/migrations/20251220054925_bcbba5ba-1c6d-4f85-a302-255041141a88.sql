-- Add bridal party role columns for editable role labels
ALTER TABLE public.ceremony_floor_plans
ADD COLUMN bridal_party_roles_left jsonb DEFAULT '[]'::jsonb,
ADD COLUMN bridal_party_roles_right jsonb DEFAULT '[]'::jsonb;