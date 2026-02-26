
-- Create invitation_templates table (admin-managed)
CREATE TABLE public.invitation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  width_mm NUMERIC NOT NULL DEFAULT 148,
  height_mm NUMERIC NOT NULL DEFAULT 210,
  background_url TEXT NOT NULL,
  thumbnail_url TEXT,
  text_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invitation_designs table (user's saved customisations)
CREATE TABLE public.invitation_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.invitation_templates(id) ON DELETE CASCADE,
  custom_text JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  include_guest_name BOOLEAN NOT NULL DEFAULT false,
  include_qr_code BOOLEAN NOT NULL DEFAULT false,
  qr_position JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for invitation_templates: public read, admin write
ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.invitation_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.invitation_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for invitation_designs: users manage their own
ALTER TABLE public.invitation_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own designs"
  ON public.invitation_designs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own designs"
  ON public.invitation_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs"
  ON public.invitation_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs"
  ON public.invitation_designs FOR DELETE
  USING (auth.uid() = user_id);
