-- Remove Email Templates and RSVP Notifications feature tables
-- This migration removes tables that are no longer needed after feature removal

-- Drop the trigger function first (if it exists)
DROP FUNCTION IF EXISTS public.notify_rsvp_change() CASCADE;

-- Drop the tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS public.reminder_deliveries CASCADE;
DROP TABLE IF EXISTS public.rsvp_reminder_campaigns CASCADE;
DROP TABLE IF EXISTS public.rsvp_notification_settings CASCADE;
DROP TABLE IF EXISTS public.email_templates CASCADE;
DROP TABLE IF EXISTS public.event_rsvp_automation_settings CASCADE;