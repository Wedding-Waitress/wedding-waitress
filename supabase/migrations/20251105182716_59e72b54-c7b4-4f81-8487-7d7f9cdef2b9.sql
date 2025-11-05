-- ============================================
-- AI ENHANCEMENT FEATURES - COMPLETE SCHEMA
-- ============================================

-- 1. RSVP Notification Settings
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

-- 2. Bulk RSVP Reminder Campaigns
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

-- 3. Guest Communication Preferences
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

-- 4. AI Seating Suggestions
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

-- 5. AI Chatbot Conversations
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

-- 6. AI Knowledge Base
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

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- RSVP Notification Settings
ALTER TABLE rsvp_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification settings"
  ON rsvp_notification_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- RSVP Reminder Campaigns
ALTER TABLE rsvp_reminder_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own campaigns"
  ON rsvp_reminder_campaigns
  FOR ALL
  USING (auth.uid() = user_id);

-- Reminder Deliveries
ALTER TABLE reminder_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries for their campaigns"
  ON reminder_deliveries
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM rsvp_reminder_campaigns
    WHERE rsvp_reminder_campaigns.id = reminder_deliveries.campaign_id
    AND rsvp_reminder_campaigns.user_id = auth.uid()
  ));

-- Guest Communication Preferences
ALTER TABLE guest_communication_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage preferences for their event guests"
  ON guest_communication_preferences
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM guests
    WHERE guests.id = guest_communication_preferences.guest_id
    AND guests.user_id = auth.uid()
  ));

-- AI Seating Suggestions
ALTER TABLE ai_seating_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage suggestions for their events"
  ON ai_seating_suggestions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = ai_seating_suggestions.event_id
    AND events.user_id = auth.uid()
  ));

-- AI Conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create conversations"
  ON ai_conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Event owners can view conversations"
  ON ai_conversations
  FOR SELECT
  USING (
    event_id IS NULL OR
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ai_conversations.event_id
      AND events.user_id = auth.uid()
    )
  );

-- AI Messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create messages in their conversations"
  ON ai_messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view messages in their conversations"
  ON ai_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
  ));

-- AI Knowledge Base
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage knowledge base for their events"
  ON ai_knowledge_base
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = ai_knowledge_base.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Public can read active knowledge base"
  ON ai_knowledge_base
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

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

-- ============================================
-- DATABASE TRIGGER FOR RSVP NOTIFICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION notify_rsvp_change()
RETURNS TRIGGER AS $$
DECLARE
  event_owner_id UUID;
  notification_settings RECORD;
BEGIN
  -- Only trigger if RSVP status actually changed
  IF NEW.rsvp IS DISTINCT FROM OLD.rsvp THEN
    -- Get event owner
    SELECT user_id INTO event_owner_id
    FROM events
    WHERE id = NEW.event_id;
    
    -- Check if user has notifications enabled
    SELECT * INTO notification_settings
    FROM rsvp_notification_settings
    WHERE user_id = event_owner_id
    AND email_notifications = true;
    
    IF FOUND THEN
      -- Check specific notification preferences
      IF (NEW.rsvp = 'Attending' AND notification_settings.notify_on_accept) OR
         (NEW.rsvp = 'Not Attending' AND notification_settings.notify_on_decline) OR
         (NEW.rsvp != 'Pending' AND OLD.rsvp != 'Pending' AND notification_settings.notify_on_update) THEN
        
        -- Call edge function to send notification
        PERFORM net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/send-rsvp-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
          ),
          body := jsonb_build_object(
            'guest_id', NEW.id,
            'event_id', NEW.event_id,
            'old_rsvp', OLD.rsvp,
            'new_rsvp', NEW.rsvp,
            'user_id', event_owner_id
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'rsvp_change_notification'
  ) THEN
    CREATE TRIGGER rsvp_change_notification
      AFTER UPDATE ON guests
      FOR EACH ROW
      EXECUTE FUNCTION notify_rsvp_change();
  END IF;
END $$;