-- Reception Floor Plan: Phase 1A schema
CREATE TABLE public.reception_floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  room_shape TEXT NOT NULL DEFAULT 'rectangle',
  room_width_m NUMERIC NOT NULL DEFAULT 15,
  room_length_m NUMERIC NOT NULL DEFAULT 20,
  grid_size_cm INTEGER NOT NULL DEFAULT 50,
  zoom NUMERIC NOT NULL DEFAULT 1,
  pan_x NUMERIC NOT NULL DEFAULT 0,
  pan_y NUMERIC NOT NULL DEFAULT 0,
  background_image_url TEXT,
  background_x NUMERIC NOT NULL DEFAULT 0,
  background_y NUMERIC NOT NULL DEFAULT 0,
  background_width NUMERIC,
  background_height NUMERIC,
  background_rotation NUMERIC NOT NULL DEFAULT 0,
  background_opacity NUMERIC NOT NULL DEFAULT 0.5,
  background_locked BOOLEAN NOT NULL DEFAULT false,
  table_positions JSONB NOT NULL DEFAULT '[]'::jsonb,
  fixtures JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reception_floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reception floor plans"
  ON public.reception_floor_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reception floor plans"
  ON public.reception_floor_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reception floor plans"
  ON public.reception_floor_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reception floor plans"
  ON public.reception_floor_plans FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_reception_floor_plans_updated_at
  BEFORE UPDATE ON public.reception_floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reception_floor_plans_event_id ON public.reception_floor_plans(event_id);
CREATE INDEX idx_reception_floor_plans_user_id ON public.reception_floor_plans(user_id);