-- Add display_countdown_event_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN display_countdown_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- RLS policy already exists for profiles table that allows users to update their own profile
-- No additional RLS policies needed as existing ones cover this column