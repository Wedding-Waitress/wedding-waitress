-- Signage settings table: one row per event for QR Seating Sign Designer.
-- Mirrors invitation_card_settings structure (text zones + qr_config + background).
CREATE TABLE public.signage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  orientation text NOT NULL DEFAULT 'portrait',
  background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,
  background_image_type text NOT NULL DEFAULT 'none',
  background_image_x_position numeric NOT NULL DEFAULT 50,
  background_image_y_position numeric NOT NULL DEFAULT 50,
  background_image_opacity numeric NOT NULL DEFAULT 100,
  text_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  qr_config jsonb NOT NULL DEFAULT '{"enabled":false,"x_percent":50,"y_percent":85,"size_percent":22,"rotation":0,"event_id":null}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);

CREATE INDEX idx_signage_settings_event ON public.signage_settings(event_id);
CREATE INDEX idx_signage_settings_user ON public.signage_settings(user_id);

ALTER TABLE public.signage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signage settings"
  ON public.signage_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own signage settings"
  ON public.signage_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own signage settings"
  ON public.signage_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own signage settings"
  ON public.signage_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_signage_settings_updated_at
  BEFORE UPDATE ON public.signage_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();