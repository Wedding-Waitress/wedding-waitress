-- Enable QR code live view by default for all events
-- This ensures QR codes work immediately for all events

-- Update all existing events to have qr_apply_to_live_view = true
UPDATE public.events SET qr_apply_to_live_view = true WHERE qr_apply_to_live_view = false OR qr_apply_to_live_view IS NULL;

-- Change the default value for the column so new events are enabled by default
ALTER TABLE public.events ALTER COLUMN qr_apply_to_live_view SET DEFAULT true;