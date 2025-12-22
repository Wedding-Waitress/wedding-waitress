-- Drop the existing check constraint
ALTER TABLE place_card_settings
DROP CONSTRAINT IF EXISTS place_card_settings_background_image_type_check;

-- Add the updated check constraint with new values
ALTER TABLE place_card_settings
ADD CONSTRAINT place_card_settings_background_image_type_check
CHECK (background_image_type IN ('none', 'decorative', 'full', 'full_front', 'full_back'));