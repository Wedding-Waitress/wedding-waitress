-- Internal media helpers and rate-limit state are server-only. PostgreSQL
-- triggers and service-role calls do not need browser EXECUTE/table access.

REVOKE ALL ON FUNCTION public.sync_event_media_like_count()
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.event_media_seq_counters
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.media_password_rate_limits
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "No direct access to media sequence counters"
ON public.event_media_seq_counters;
CREATE POLICY "No direct access to media sequence counters"
ON public.event_media_seq_counters
FOR ALL
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct access to media password rate limits"
ON public.media_password_rate_limits;
CREATE POLICY "No direct access to media password rate limits"
ON public.media_password_rate_limits
FOR ALL
USING (false)
WITH CHECK (false);
