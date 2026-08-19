ALTER TABLE public.place_card_settings
  ADD COLUMN IF NOT EXISTS photo_video_qr_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_video_qr_x NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_video_qr_y NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_video_qr_size NUMERIC NOT NULL DEFAULT 22;

COMMENT ON COLUMN public.place_card_settings.photo_video_qr_enabled IS
  'Shows the existing event Photo & Video Sharing QR code on every place-card back.';
