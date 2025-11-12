-- Phase 1.1: Add event_planner_email to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_planner_email TEXT;

-- Phase 1.2: Create event_rsvp_automation_settings table (event-scoped)
CREATE TABLE IF NOT EXISTS event_rsvp_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  
  -- Host Alerts (who receives RSVP notifications)
  notify_partner1 BOOLEAN DEFAULT true,
  notify_partner2 BOOLEAN DEFAULT false,
  notify_event_planner BOOLEAN DEFAULT false,
  notify_both_partners BOOLEAN DEFAULT false,
  
  -- Automation Rules
  auto_reminders_enabled BOOLEAN DEFAULT false,
  reminder_days_before INTEGER DEFAULT 7,
  reminder_only_no_reply BOOLEAN DEFAULT true,
  daily_summary_enabled BOOLEAN DEFAULT false,
  daily_summary_time TIME DEFAULT '08:00:00',
  
  -- Next scheduled reminder tracking
  next_reminder_scheduled_at TIMESTAMPTZ,
  last_reminder_sent_at TIMESTAMPTZ,
  last_daily_summary_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for event_rsvp_automation_settings
ALTER TABLE event_rsvp_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage automation for their events"
  ON event_rsvp_automation_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_rsvp_automation_settings.event_id 
    AND events.user_id = auth.uid()
  ));

-- Phase 1.3: Extend rsvp_notification_settings (add SMS/WhatsApp fields)
ALTER TABLE rsvp_notification_settings 
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS twilio_sender_id TEXT;

-- Phase 1.4: Extend reminder_deliveries (add type column)
ALTER TABLE reminder_deliveries 
  ADD COLUMN IF NOT EXISTS reminder_type TEXT DEFAULT 'bulk',
  ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id);