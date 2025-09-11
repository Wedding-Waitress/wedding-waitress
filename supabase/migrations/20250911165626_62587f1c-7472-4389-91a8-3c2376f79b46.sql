-- Add admin safety switches to events table
ALTER TABLE public.events 
ADD COLUMN who_is_required boolean DEFAULT true,
ADD COLUMN who_is_allow_custom_role boolean DEFAULT false,
ADD COLUMN who_is_allow_single_partner boolean DEFAULT true,
ADD COLUMN who_is_disable_first_guest_alert boolean DEFAULT false;