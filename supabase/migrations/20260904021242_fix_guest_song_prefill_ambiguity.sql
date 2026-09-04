-- Fix guest-song prefill ambiguity without changing the established public
-- Live View contract: event UUID + guest UUID for a live, song-enabled event.

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    request.id,
    request.slot_index,
    request.song_title,
    request.artist_name,
    request.music_link,
    request.note,
    request.status
  FROM public.guest_song_requests AS request
  WHERE request.event_id = _event_id
    AND request.guest_id = _guest_id
    AND EXISTS (
      SELECT 1
      FROM public.events AS event_row
      JOIN public.guests AS guest_row
        ON guest_row.event_id = event_row.id
       AND guest_row.id = _guest_id
      JOIN public.guest_song_request_settings AS setting_row
        ON setting_row.event_id = event_row.id
       AND setting_row.enabled IS TRUE
      WHERE event_row.id = _event_id
        AND event_row.qr_apply_to_live_view IS TRUE
    )
  ORDER BY request.slot_index ASC;
$function$;

REVOKE ALL ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) TO anon, authenticated;

COMMIT;
