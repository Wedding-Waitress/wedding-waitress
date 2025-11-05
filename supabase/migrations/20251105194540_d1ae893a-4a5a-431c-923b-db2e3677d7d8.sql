-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Update the notify_rsvp_change function to properly call the edge function
CREATE OR REPLACE FUNCTION public.notify_rsvp_change()
RETURNS TRIGGER AS $$
DECLARE
  event_owner_id UUID;
  notification_settings RECORD;
  supabase_url TEXT;
  service_role_key TEXT;
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
        
        -- Get Supabase URL and service role key
        supabase_url := 'https://xytxkidpourwdbzzwcdp.supabase.co';
        
        -- Call edge function to send notification asynchronously
        PERFORM extensions.http_post(
          url := supabase_url || '/functions/v1/send-rsvp-notification',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
          ),
          body := jsonb_build_object(
            'guest_id', NEW.id,
            'event_id', NEW.event_id,
            'old_rsvp', OLD.rsvp,
            'new_rsvp', NEW.rsvp,
            'user_id', event_owner_id
          )::text
        );
        
        -- Log the notification attempt
        RAISE NOTICE 'RSVP notification triggered for guest % (% → %)', 
          NEW.id, OLD.rsvp, NEW.rsvp;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS rsvp_change_notification ON guests;
CREATE TRIGGER rsvp_change_notification
  AFTER UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION notify_rsvp_change();

-- Add comment for documentation
COMMENT ON TRIGGER rsvp_change_notification ON guests IS 
  'Sends real-time email notifications to event hosts when guest RSVP status changes';
