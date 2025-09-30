-- Create live_view_settings table
CREATE TABLE public.live_view_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  show_rsvp_invite BOOLEAN NOT NULL DEFAULT false,
  show_search_update BOOLEAN NOT NULL DEFAULT true,
  show_ceremony BOOLEAN NOT NULL DEFAULT false,
  show_reception BOOLEAN NOT NULL DEFAULT false,
  show_video_message BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.live_view_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: owners of the event can select/update their row
CREATE POLICY "Event owners can view live view settings"
  ON public.live_view_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = live_view_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update live view settings"
  ON public.live_view_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = live_view_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can insert live view settings"
  ON public.live_view_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = live_view_settings.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Allow public to read settings when qr_apply_to_live_view is true
CREATE POLICY "Public can read settings for live view events"
  ON public.live_view_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = live_view_settings.event_id
      AND events.qr_apply_to_live_view = true
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_live_view_settings_updated_at
  BEFORE UPDATE ON public.live_view_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();