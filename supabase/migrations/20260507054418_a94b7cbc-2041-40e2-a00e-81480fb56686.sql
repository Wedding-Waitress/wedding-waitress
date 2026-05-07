
ALTER TABLE public.live_view_settings
  ADD COLUMN IF NOT EXISTS kiosk_show_rsvp_status BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS kiosk_show_dietary BOOLEAN NOT NULL DEFAULT true;
