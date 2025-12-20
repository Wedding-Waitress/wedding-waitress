-- Add bridal party columns to ceremony_floor_plans
ALTER TABLE ceremony_floor_plans
ADD COLUMN bridal_party_left jsonb DEFAULT '[]'::jsonb,
ADD COLUMN bridal_party_right jsonb DEFAULT '[]'::jsonb,
ADD COLUMN bridal_party_count_left integer DEFAULT 3,
ADD COLUMN bridal_party_count_right integer DEFAULT 3;