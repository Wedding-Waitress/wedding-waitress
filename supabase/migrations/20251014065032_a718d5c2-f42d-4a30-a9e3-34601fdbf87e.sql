-- Update function to set search_path for security
DROP FUNCTION IF EXISTS public.get_next_media_seq_number(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_next_media_seq_number(
  _gallery_id UUID,
  _table_name TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next_seq INTEGER;
  _lock_id BIGINT;
BEGIN
  -- Use advisory lock based on gallery_id hash (prevents race conditions)
  _lock_id := ('x' || substring(md5(_gallery_id::text) from 1 for 15))::bit(60)::bigint;
  
  -- Acquire advisory lock (blocks until available, auto-released at transaction end)
  PERFORM pg_advisory_xact_lock(_lock_id);
  
  -- Get max seq_number from specified table
  IF _table_name = 'media_uploads' THEN
    SELECT COALESCE(MAX(seq_number), 0) + 1 INTO _next_seq
    FROM media_uploads
    WHERE gallery_id = _gallery_id;
  ELSIF _table_name = 'audio_guestbook' THEN
    SELECT COALESCE(MAX(seq_number), 0) + 1 INTO _next_seq
    FROM audio_guestbook
    WHERE gallery_id = _gallery_id;
  ELSE
    RAISE EXCEPTION 'Invalid table name: %', _table_name;
  END IF;
  
  RETURN _next_seq;
END;
$$;

-- Grant execute permissions to all relevant roles
GRANT EXECUTE ON FUNCTION public.get_next_media_seq_number(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_media_seq_number(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_media_seq_number(UUID, TEXT) TO anon;