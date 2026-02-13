
-- Phase 1: Add RSVP invite tracking columns to guests table
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS rsvp_invite_status text NOT NULL DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS rsvp_invite_sent_at timestamptz;

-- Create RSVP invite logs table
CREATE TABLE public.rsvp_invite_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL, -- 'email' or 'sms'
  status text NOT NULL DEFAULT 'sent', -- sent, failed, delivered, bounced
  error_message text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rsvp_invite_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own invite logs"
ON public.rsvp_invite_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invite logs"
ON public.rsvp_invite_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes for fast lookups
CREATE INDEX idx_rsvp_invite_logs_event_id ON public.rsvp_invite_logs(event_id);
CREATE INDEX idx_rsvp_invite_logs_guest_id ON public.rsvp_invite_logs(guest_id);
CREATE INDEX idx_guests_rsvp_invite_status ON public.guests(rsvp_invite_status);
