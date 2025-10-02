-- Add image positioning and opacity controls to place_card_settings
ALTER TABLE place_card_settings
ADD COLUMN IF NOT EXISTS background_image_x_position INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS background_image_y_position INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS background_image_scale INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS background_image_opacity INTEGER DEFAULT 20;