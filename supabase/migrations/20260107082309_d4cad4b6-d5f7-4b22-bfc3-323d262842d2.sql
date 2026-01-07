-- Add enhanced QR code customization columns for finder patterns, dots, and center logo
ALTER TABLE qr_code_settings
ADD COLUMN IF NOT EXISTS dots_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS marker_border_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS marker_center_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS dots_shape text DEFAULT 'square',
ADD COLUMN IF NOT EXISTS marker_border_shape text DEFAULT 'square',
ADD COLUMN IF NOT EXISTS marker_center_shape text DEFAULT 'square';