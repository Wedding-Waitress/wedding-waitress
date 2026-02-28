
-- Create invitation_gallery_images table (identical to place_card_gallery_images)
CREATE TABLE public.invitation_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view invitation gallery images" ON public.invitation_gallery_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage invitation gallery images" ON public.invitation_gallery_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create invitation_card_settings table
CREATE TABLE public.invitation_card_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  background_color text NOT NULL DEFAULT '#ffffff',
  background_image_url text,
  background_image_type text NOT NULL DEFAULT 'none',
  background_image_x_position integer DEFAULT 50,
  background_image_y_position integer DEFAULT 50,
  background_image_opacity integer DEFAULT 100,
  text_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  font_color text NOT NULL DEFAULT '#000000',
  card_size text NOT NULL DEFAULT 'A5',
  orientation text NOT NULL DEFAULT 'portrait',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_card_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invitation card settings" ON public.invitation_card_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invitation card settings" ON public.invitation_card_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invitation card settings" ON public.invitation_card_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invitation card settings" ON public.invitation_card_settings FOR DELETE USING (auth.uid() = user_id);

-- Add unique constraint on event_id + user_id
CREATE UNIQUE INDEX invitation_card_settings_event_user_idx ON public.invitation_card_settings (event_id, user_id);
