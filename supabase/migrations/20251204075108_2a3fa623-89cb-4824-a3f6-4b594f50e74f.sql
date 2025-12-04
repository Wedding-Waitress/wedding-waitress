-- Fix ai_seating_suggestions foreign key constraint
ALTER TABLE public.ai_seating_suggestions 
DROP CONSTRAINT IF EXISTS ai_seating_suggestions_guest_id_fkey;

ALTER TABLE public.ai_seating_suggestions 
ADD CONSTRAINT ai_seating_suggestions_guest_id_fkey 
FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;

-- Fix guest_communication_preferences foreign key constraint
ALTER TABLE public.guest_communication_preferences 
DROP CONSTRAINT IF EXISTS guest_communication_preferences_guest_id_fkey;

ALTER TABLE public.guest_communication_preferences 
ADD CONSTRAINT guest_communication_preferences_guest_id_fkey 
FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;