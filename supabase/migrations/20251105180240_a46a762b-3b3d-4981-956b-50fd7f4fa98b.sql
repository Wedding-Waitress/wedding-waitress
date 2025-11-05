-- Fix Adam Saad's RSVP status to match what was selected in the live view
-- This will trigger realtime sync to both Dashboard and Live View

UPDATE guests 
SET 
  rsvp = 'Attending',
  rsvp_date = CURRENT_DATE
WHERE 
  id = '93756fd7-3c2e-4bc9-a7a6-98dc28e49e3a'
  AND rsvp != 'Attending'; -- Only update if not already set

-- Log this manual correction
INSERT INTO guest_update_logs (event_id, guest_id, changed_by, payload)
SELECT 
  event_id,
  id as guest_id,
  'system_sync_fix',
  jsonb_build_object(
    'reason', 'Manual correction to fix dashboard/live view sync issue',
    'previous_rsvp', rsvp,
    'new_rsvp', 'Attending',
    'timestamp', NOW()
  )
FROM guests
WHERE id = '93756fd7-3c2e-4bc9-a7a6-98dc28e49e3a';