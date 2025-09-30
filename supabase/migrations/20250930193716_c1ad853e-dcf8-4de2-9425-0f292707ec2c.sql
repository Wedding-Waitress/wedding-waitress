-- Add RLS policy to allow public updates for guests in live view events
CREATE POLICY "Public can update guests for live view events"
ON public.guests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = guests.event_id
    AND e.qr_apply_to_live_view = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM events e
    WHERE e.id = guests.event_id
    AND e.qr_apply_to_live_view = true
  )
);