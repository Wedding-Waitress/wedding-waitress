-- Replay repair: the original creation was recorded after this ALTER.
-- Create live_view_settings table
CREATE TABLE IF NOT EXISTS public.live_view_settings (
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

-- Add missing columns to live_view_settings table
ALTER TABLE live_view_settings 
  ADD COLUMN IF NOT EXISTS show_update_details boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_invite_video boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_welcome_video boolean NOT NULL DEFAULT false;

-- Rename show_search_update to show_search if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_view_settings' 
    AND column_name = 'show_search_update'
  ) THEN
    ALTER TABLE live_view_settings 
      RENAME COLUMN show_search_update TO show_search;
  END IF;
END $$;

-- Rename show_video_message to show_invite_video if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_view_settings' 
    AND column_name = 'show_video_message'
  ) THEN
    ALTER TABLE live_view_settings 
      DROP COLUMN show_video_message;
  END IF;
END $$;

-- Ensure show_search has proper default
ALTER TABLE live_view_settings 
  ALTER COLUMN show_search SET DEFAULT true;
