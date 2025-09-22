-- Update all events to be owned by the current authenticated user
-- Old user ID: a0dba7aa-b67a-4856-8e7e-4af91d43d3fa
-- New user ID: d43c88c4-f8d8-48e2-92c7-e6db6e818b41

UPDATE public.events 
SET user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41'::uuid
WHERE user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'::uuid;

-- Update all guests to be owned by the current authenticated user
UPDATE public.guests 
SET user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41'::uuid
WHERE user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'::uuid;

-- Update all tables to be owned by the current authenticated user
UPDATE public.tables 
SET user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41'::uuid
WHERE user_id = 'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'::uuid;

-- Set the display countdown event to the "Kimberly & Keneth" event
UPDATE public.profiles 
SET display_countdown_event_id = (
  SELECT id FROM public.events 
  WHERE name = 'Kimberly & Keneth' 
  AND user_id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41'::uuid
  LIMIT 1
)
WHERE id = 'd43c88c4-f8d8-48e2-92c7-e6db6e818b41'::uuid;