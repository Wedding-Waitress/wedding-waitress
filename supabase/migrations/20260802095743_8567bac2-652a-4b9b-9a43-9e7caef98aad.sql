-- Daily housekeeping for gallery password rate-limit rows.
-- Deletes only rows older than 24h that are NOT actively blocking anyone,
-- so live rate-limit behaviour is unchanged.
CREATE OR REPLACE FUNCTION public.cleanup_media_password_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deleted integer;
BEGIN
  DELETE FROM public.media_password_rate_limits
   WHERE last_attempt_at < now() - interval '24 hours'
     AND (blocked_until IS NULL OR blocked_until <= now());
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

-- Server-side only: never callable by anon/authenticated.
REVOKE ALL ON FUNCTION public.cleanup_media_password_rate_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_media_password_rate_limits() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_media_password_rate_limits() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Idempotent (re)scheduling of the daily job.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-media-password-rate-limits');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'cleanup-media-password-rate-limits',
  '15 3 * * *',
  $$SELECT public.cleanup_media_password_rate_limits();$$
);