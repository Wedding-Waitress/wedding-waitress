-- Create guest_update_logs table to track changes made by guests
CREATE TABLE IF NOT EXISTS public.guest_update_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  changed_by text NOT NULL DEFAULT 'guest_live_view',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_update_logs ENABLE ROW LEVEL SECURITY;

-- Event owners can view logs for their events
CREATE POLICY "Event owners can view guest update logs"
ON public.guest_update_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guest_update_logs.event_id
    AND events.user_id = auth.uid()
  )
);

-- Public can insert logs for live view events
CREATE POLICY "Public can insert logs for live view events"
ON public.guest_update_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = guest_update_logs.event_id
    AND events.qr_apply_to_live_view = true
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_guest_update_logs_event_id ON public.guest_update_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_update_logs_guest_id ON public.guest_update_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_update_logs_created_at ON public.guest_update_logs(created_at DESC);