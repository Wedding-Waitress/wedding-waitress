-- Recipient-token equivalent of the existing public song-request endpoint.
-- It preserves dashboard settings and only permits the invitation's party.
CREATE OR REPLACE FUNCTION public.get_guest_invitation_song_requests(_access_token text, _guest_id uuid)
RETURNS TABLE(slot_index integer, song_title text, artist_name text, music_link text, note text)
LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$
  WITH scope AS (
    SELECT gat.event_id, gat.guest_id AS recipient_id, recipient.family_group
    FROM public.guest_access_tokens gat
    JOIN public.guests recipient ON recipient.id = gat.guest_id AND recipient.event_id = gat.event_id
    WHERE gat.access_token = _access_token AND gat.expires_at > now()
  )
  SELECT request.slot_index, request.song_title, request.artist_name, request.music_link, request.note
  FROM public.guest_song_requests request
  JOIN scope ON scope.event_id = request.event_id
  JOIN public.guests guest ON guest.id = request.guest_id
  WHERE request.guest_id = _guest_id
    AND (guest.id = scope.recipient_id OR (scope.family_group IS NOT NULL AND guest.family_group = scope.family_group))
  ORDER BY request.slot_index;
$$;

CREATE OR REPLACE FUNCTION public.save_guest_invitation_song_requests(_access_token text, _guest_id uuid, _requests jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE scope_event_id uuid; scope_recipient_id uuid; scope_family_group text; allowed_max integer;
BEGIN
  SELECT gat.event_id, gat.guest_id, recipient.family_group
    INTO scope_event_id, scope_recipient_id, scope_family_group
  FROM public.guest_access_tokens gat
  JOIN public.guests recipient ON recipient.id = gat.guest_id AND recipient.event_id = gat.event_id
  WHERE gat.access_token = _access_token AND gat.expires_at > now();
  IF scope_recipient_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.guests guest WHERE guest.id = _guest_id AND guest.event_id = scope_event_id
      AND (guest.id = scope_recipient_id OR (scope_family_group IS NOT NULL AND guest.family_group = scope_family_group))
  ) THEN RAISE EXCEPTION 'Invitation is not authorised for this guest'; END IF;
  SELECT max_requests_per_guest INTO allowed_max FROM public.guest_song_request_settings
    WHERE event_id = scope_event_id AND enabled = true;
  IF allowed_max IS NULL OR jsonb_typeof(_requests) <> 'array' OR jsonb_array_length(_requests) > allowed_max THEN
    RAISE EXCEPTION 'Song requests are unavailable';
  END IF;
  RETURN public.submit_guest_song_requests(scope_event_id, _guest_id, _requests);
END;
$$;

REVOKE ALL ON FUNCTION public.get_guest_invitation_song_requests(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_guest_invitation_song_requests(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_invitation_song_requests(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.save_guest_invitation_song_requests(text, uuid, jsonb) TO anon;
