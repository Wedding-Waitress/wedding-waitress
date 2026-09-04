-- Emergency rollback for 20260904021242_fix_guest_song_prefill_ambiguity.sql.
-- Restores the immediately previous PL/pgSQL definition and execution grants,
-- including the prior implicit PUBLIC execution permission.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_guest_song_requests_for_guest(
  _event_id uuid,
  _guest_id uuid
)
RETURNS TABLE(
  id uuid,
  slot_index integer,
  song_title text,
  artist_name text,
  music_link text,
  note text,
  status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND qr_apply_to_live_view = true
  ) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM guests WHERE id = _guest_id AND event_id = _event_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.id, r.slot_index, r.song_title, r.artist_name, r.music_link, r.note, r.status
  FROM guest_song_requests r
  WHERE r.event_id = _event_id AND r.guest_id = _guest_id
  ORDER BY r.slot_index ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) TO anon, authenticated;

COMMIT;
