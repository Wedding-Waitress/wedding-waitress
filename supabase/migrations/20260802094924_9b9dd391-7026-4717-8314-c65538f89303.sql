-- Forward migration: server-side rate limiting for public gallery password verification

CREATE TABLE IF NOT EXISTS public.media_password_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('device','ip')),
  event_id uuid,
  attempt_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.media_password_rate_limits TO service_role;

ALTER TABLE public.media_password_rate_limits ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: no anon/authenticated access whatsoever.

CREATE INDEX IF NOT EXISTS media_password_rate_limits_cleanup_idx
  ON public.media_password_rate_limits (last_attempt_at);

-- Returns retry_after seconds (0 = allowed) without mutating counters.
CREATE OR REPLACE FUNCTION public.check_media_password_rate_limit(
  _device_key text,
  _ip_key text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (blocked_until - now()))))::int), 0)
  FROM public.media_password_rate_limits
  WHERE key_hash IN (_device_key, _ip_key)
    AND blocked_until IS NOT NULL
    AND blocked_until > now();
$$;

-- Atomically records an attempt. On success, clears the device counter but
-- leaves the IP abuse counter intact. Returns retry_after seconds (0 = ok).
CREATE OR REPLACE FUNCTION public.record_media_password_attempt(
  _device_key text,
  _ip_key text,
  _event_id uuid,
  _success boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _window interval := interval '15 minutes';
  _block  interval := interval '15 minutes';
  _device_limit int := 5;
  _ip_limit int := 100;
  _retry int := 0;
  _blocked timestamptz;
BEGIN
  -- Opportunistic cleanup of expired records (~2% of calls).
  IF random() < 0.02 THEN
    DELETE FROM public.media_password_rate_limits
     WHERE last_attempt_at < now() - interval '1 hour'
       AND (blocked_until IS NULL OR blocked_until < now());
  END IF;

  IF _success THEN
    DELETE FROM public.media_password_rate_limits
     WHERE key_hash = _device_key
       AND (blocked_until IS NULL OR blocked_until <= now());
    RETURN 0;
  END IF;

  -- Device/browser scope
  INSERT INTO public.media_password_rate_limits AS r
    (key_hash, scope, event_id, attempt_count, window_start, last_attempt_at)
  VALUES (_device_key, 'device', _event_id, 1, now(), now())
  ON CONFLICT (key_hash) DO UPDATE
    SET attempt_count = CASE
          WHEN r.window_start < now() - _window THEN 1
          ELSE r.attempt_count + 1 END,
        window_start = CASE
          WHEN r.window_start < now() - _window THEN now()
          ELSE r.window_start END,
        last_attempt_at = now(),
        updated_at = now()
  RETURNING attempt_count INTO _retry;

  IF _retry >= _device_limit THEN
    UPDATE public.media_password_rate_limits
       SET blocked_until = GREATEST(COALESCE(blocked_until, now()), now() + _block),
           updated_at = now()
     WHERE key_hash = _device_key;
  END IF;

  -- IP scope (venue network)
  INSERT INTO public.media_password_rate_limits AS r
    (key_hash, scope, event_id, attempt_count, window_start, last_attempt_at)
  VALUES (_ip_key, 'ip', _event_id, 1, now(), now())
  ON CONFLICT (key_hash) DO UPDATE
    SET attempt_count = CASE
          WHEN r.window_start < now() - _window THEN 1
          ELSE r.attempt_count + 1 END,
        window_start = CASE
          WHEN r.window_start < now() - _window THEN now()
          ELSE r.window_start END,
        last_attempt_at = now(),
        updated_at = now()
  RETURNING attempt_count INTO _retry;

  IF _retry >= _ip_limit THEN
    UPDATE public.media_password_rate_limits
       SET blocked_until = GREATEST(COALESCE(blocked_until, now()), now() + _block),
           updated_at = now()
     WHERE key_hash = _ip_key;
  END IF;

  SELECT MAX(blocked_until) INTO _blocked
    FROM public.media_password_rate_limits
   WHERE key_hash IN (_device_key, _ip_key)
     AND blocked_until > now();

  IF _blocked IS NULL THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (_blocked - now()))))::int;
END;
$$;

REVOKE ALL ON FUNCTION public.check_media_password_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_media_password_rate_limit(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.record_media_password_attempt(text, text, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_media_password_attempt(text, text, uuid, boolean) TO service_role;

-- Lock the public password verification RPC to server-side callers only.
REVOKE ALL ON FUNCTION public.verify_event_media_password(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_event_media_password(text, text) TO service_role;

-- Helper for the edge function to resolve a token's event id (service-role only).
CREATE OR REPLACE FUNCTION public.get_event_id_for_media_token(_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.event_id
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  WHERE t.token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_event_id_for_media_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_id_for_media_token(text) TO service_role;