-- Add couple side arrangement column
ALTER TABLE ceremony_floor_plans
ADD COLUMN couple_side_arrangement text DEFAULT 'groom_left';

-- Add comment for clarity
COMMENT ON COLUMN ceremony_floor_plans.couple_side_arrangement IS 'Determines which side the groom/bride stand: groom_left or bride_left';