-- ============================================
-- AI ENHANCEMENT FEATURES - SCHEMA (FIXED)
-- ============================================

-- Drop existing policies before recreating
DO $$ 
BEGIN
  -- RSVP Notification Settings
  DROP POLICY IF EXISTS "Users can manage their own notification settings" ON rsvp_notification_settings;
  
  -- RSVP Reminder Campaigns
  DROP POLICY IF EXISTS "Users can manage their own campaigns" ON rsvp_reminder_campaigns;
  
  -- Reminder Deliveries
  DROP POLICY IF EXISTS "Users can view deliveries for their campaigns" ON reminder_deliveries;
  
  -- Guest Communication Preferences
  DROP POLICY IF EXISTS "Users can manage preferences for their event guests" ON guest_communication_preferences;
  
  -- AI Seating Suggestions
  DROP POLICY IF EXISTS "Users can manage suggestions for their events" ON ai_seating_suggestions;
  
  -- AI Conversations
  DROP POLICY IF EXISTS "Anyone can create conversations" ON ai_conversations;
  DROP POLICY IF EXISTS "Event owners can view conversations" ON ai_conversations;
  
  -- AI Messages
  DROP POLICY IF EXISTS "Anyone can create messages in their conversations" ON ai_messages;
  DROP POLICY IF EXISTS "Users can view messages in their conversations" ON ai_messages;
  
  -- AI Knowledge Base
  DROP POLICY IF EXISTS "Users can manage knowledge base for their events" ON ai_knowledge_base;
  DROP POLICY IF EXISTS "Public can read active knowledge base" ON ai_knowledge_base;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS rsvp_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,
  notify_on_accept BOOLEAN DEFAULT true,
  notify_on_decline BOOLEAN DEFAULT true,
  notify_on_update BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rsvp_reminder_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  target_status TEXT[] DEFAULT ARRAY['Pending'],
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES rsvp_reminder_campaigns NOT NULL,
  guest_id UUID REFERENCES guests NOT NULL,
  delivery_method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guest_communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests NOT NULL UNIQUE,
  prefers_whatsapp BOOLEAN DEFAULT true,
  prefers_sms BOOLEAN DEFAULT true,
  prefers_email BOOLEAN DEFAULT true,
  whatsapp_number TEXT,
  has_whatsapp BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_seating_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events NOT NULL,
  guest_id UUID REFERENCES guests NOT NULL,
  suggested_table_id UUID REFERENCES tables NOT NULL,
  confidence_score DECIMAL(3,2),
  reasoning TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events,
  session_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events NOT NULL,
  category TEXT NOT NULL,
  question TEXT,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE rsvp_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_reminder_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_seating_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notification settings"
  ON rsvp_notification_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own campaigns"
  ON rsvp_reminder_campaigns FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view deliveries for their campaigns"
  ON reminder_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rsvp_reminder_campaigns
    WHERE rsvp_reminder_campaigns.id = reminder_deliveries.campaign_id
    AND rsvp_reminder_campaigns.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage preferences for their event guests"
  ON guest_communication_preferences FOR ALL
  USING (EXISTS (
    SELECT 1 FROM guests
    WHERE guests.id = guest_communication_preferences.guest_id
    AND guests.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage suggestions for their events"
  ON ai_seating_suggestions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = ai_seating_suggestions.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can create conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Event owners can view conversations"
  ON ai_conversations FOR SELECT
  USING (
    event_id IS NULL OR
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ai_conversations.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create messages in their conversations"
  ON ai_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view messages in their conversations"
  ON ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
  ));

CREATE POLICY "Users can manage knowledge base for their events"
  ON ai_knowledge_base FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = ai_knowledge_base.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Public can read active knowledge base"
  ON ai_knowledge_base FOR SELECT
  USING (is_active = true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rsvp_campaigns_event ON rsvp_reminder_campaigns(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_campaigns_user ON rsvp_reminder_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_campaign ON reminder_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_reminder_deliveries_guest ON reminder_deliveries(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_comm_prefs_guest ON guest_communication_preferences(guest_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_event ON ai_seating_suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_guest ON ai_seating_suggestions(guest_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_event ON ai_conversations(event_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_event ON ai_knowledge_base(event_id);