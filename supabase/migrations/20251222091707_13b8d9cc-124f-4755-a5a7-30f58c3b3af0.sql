-- Add front and back image URL columns to place_card_settings
ALTER TABLE place_card_settings
ADD COLUMN front_image_url TEXT,
ADD COLUMN back_image_url TEXT;