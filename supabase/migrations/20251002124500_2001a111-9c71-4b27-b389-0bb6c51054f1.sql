-- Add new columns to place_card_settings for enhanced customization
ALTER TABLE place_card_settings
ADD COLUMN guest_font_family text DEFAULT 'Inter',
ADD COLUMN info_font_family text DEFAULT 'Inter',
ADD COLUMN guest_name_bold boolean DEFAULT false,
ADD COLUMN guest_name_italic boolean DEFAULT false,
ADD COLUMN guest_name_underline boolean DEFAULT false,
ADD COLUMN guest_name_font_size integer DEFAULT 24,
ADD COLUMN info_font_size integer DEFAULT 12,
ADD COLUMN name_spacing integer DEFAULT 4;