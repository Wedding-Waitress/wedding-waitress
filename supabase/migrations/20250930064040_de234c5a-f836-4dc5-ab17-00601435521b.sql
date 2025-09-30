-- Create table for Live View module configuration settings
CREATE TABLE public.live_view_module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  rsvp_invite_config JSONB DEFAULT '{}'::jsonb,
  search_update_config JSONB DEFAULT '{}'::jsonb,
  ceremony_config JSONB DEFAULT '{}'::jsonb,
  reception_config JSONB DEFAULT '{}'::jsonb,
  video_message_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.live_view_module_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Event owners can view their module settings
CREATE POLICY "Event owners can view module settings"
ON public.live_view_module_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_view_module_settings.event_id
    AND events.user_id = auth.uid()
  )
);

-- Policy: Event owners can insert their module settings
CREATE POLICY "Event owners can insert module settings"
ON public.live_view_module_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_view_module_settings.event_id
    AND events.user_id = auth.uid()
  )
);

-- Policy: Event owners can update their module settings
CREATE POLICY "Event owners can update module settings"
ON public.live_view_module_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = live_view_module_settings.event_id
    AND events.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_live_view_module_settings_updated_at
BEFORE UPDATE ON public.live_view_module_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();