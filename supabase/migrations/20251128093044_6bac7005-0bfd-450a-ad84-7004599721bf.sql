-- Fix overly permissive public access to events table
DROP POLICY IF EXISTS "Public can view events by slug" ON public.events;

CREATE POLICY "Public can view live-view enabled events by slug"
ON public.events
FOR SELECT
USING (
  slug IS NOT NULL 
  AND qr_apply_to_live_view = true
);

-- Fix overly permissive public access to event_shortlinks table
DROP POLICY IF EXISTS "Anonymous users can read active shortlinks" ON public.event_shortlinks;

CREATE POLICY "Anonymous can read shortlinks for live-view events"
ON public.event_shortlinks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_shortlinks.event_id
    AND e.qr_apply_to_live_view = true
  )
);