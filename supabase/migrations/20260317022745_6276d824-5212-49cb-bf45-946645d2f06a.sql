ALTER TABLE public.invitation_card_settings
ADD COLUMN qr_config jsonb DEFAULT '{"enabled": false, "x_percent": 50, "y_percent": 90, "size_percent": 15, "event_id": null}'::jsonb;