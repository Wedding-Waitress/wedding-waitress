-- Close unintended Data API entry points reported by the Supabase security
-- advisor. Public guest-token RPCs remain deliberately available.

-- Trigger functions are invoked by PostgreSQL, not by browser clients.
REVOKE ALL ON FUNCTION public.ensure_event_slug() FROM PUBLIC, anon, authenticated;

-- Slug generation is an internal trigger helper. Direct execution can leak
-- whether a proposed event name collides with an existing private event slug.
REVOKE ALL ON FUNCTION public.generate_slug(text) FROM PUBLIC, anon, authenticated;

-- This organiser report already scopes rows to auth.uid(); anonymous callers
-- have no legitimate use for it.
REVOKE ALL ON FUNCTION public.get_events_with_guest_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_events_with_guest_count() TO authenticated;

