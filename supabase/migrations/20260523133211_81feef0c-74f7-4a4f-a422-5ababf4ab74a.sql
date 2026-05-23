
-- ============ Tables ============
CREATE TABLE public.guest_song_request_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  max_requests_per_guest integer NOT NULL DEFAULT 2 CHECK (max_requests_per_guest BETWEEN 1 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guest_song_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  guest_name text NOT NULL DEFAULT '',
  slot_index integer NOT NULL DEFAULT 0,
  song_title text NOT NULL DEFAULT '',
  artist_name text NOT NULL DEFAULT '',
  music_link text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, slot_index)
);

CREATE INDEX idx_gsr_event ON public.guest_song_requests(event_id, created_at DESC);
CREATE INDEX idx_gsr_guest ON public.guest_song_requests(guest_id);

-- updated_at triggers
CREATE TRIGGER trg_gsr_settings_updated_at
  BEFORE UPDATE ON public.guest_song_request_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_gsr_updated_at
  BEFORE UPDATE ON public.guest_song_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.guest_song_request_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_song_requests ENABLE ROW LEVEL SECURITY;

-- Settings: only event owner / admin / collaborator
CREATE POLICY "gsr_settings_owner_select" ON public.guest_song_request_settings
  FOR SELECT USING (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_settings_owner_insert" ON public.guest_song_request_settings
  FOR INSERT WITH CHECK (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_settings_owner_update" ON public.guest_song_request_settings
  FOR UPDATE USING (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_settings_owner_delete" ON public.guest_song_request_settings
  FOR DELETE USING (public.can_access_event(auth.uid(), event_id));

-- Requests: only event owner / admin / collaborator
CREATE POLICY "gsr_owner_select" ON public.guest_song_requests
  FOR SELECT USING (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_owner_insert" ON public.guest_song_requests
  FOR INSERT WITH CHECK (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_owner_update" ON public.guest_song_requests
  FOR UPDATE USING (public.can_access_event(auth.uid(), event_id));
CREATE POLICY "gsr_owner_delete" ON public.guest_song_requests
  FOR DELETE USING (public.can_access_event(auth.uid(), event_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_song_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_song_request_settings;

-- ============ RPCs ============

-- Public: get settings (only if event has live view + song requests enabled)
CREATE OR REPLACE FUNCTION public.get_guest_song_request_settings_public(_event_id uuid)
RETURNS TABLE(enabled boolean, max_requests_per_guest integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND qr_apply_to_live_view = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT COALESCE(s.enabled, false), COALESCE(s.max_requests_per_guest, 2)
  FROM (SELECT 1) x
  LEFT JOIN guest_song_request_settings s ON s.event_id = _event_id;
END;
$$;

-- Public: get a guest's existing song requests (so the popup can pre-fill)
CREATE OR REPLACE FUNCTION public.get_guest_song_requests_for_guest(_event_id uuid, _guest_id uuid)
RETURNS TABLE(id uuid, slot_index integer, song_title text, artist_name text, music_link text, note text, status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
$$;

-- Public: replace/upsert this guest's song requests in slots [0..max-1]
-- _requests is a jsonb array of objects: { slot_index, song_title, artist_name, music_link, note }
-- Existing rows for the guest are kept (status preserved); empty entries are deleted; new entries default pending.
CREATE OR REPLACE FUNCTION public.submit_guest_song_requests(
  _event_id uuid,
  _guest_id uuid,
  _requests jsonb
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _settings RECORD;
  _guest RECORD;
  _max int;
  _entry jsonb;
  _slot int;
  _title text;
  _artist text;
  _link text;
  _note text;
  _guest_name text;
BEGIN
  -- Validate event allows live view
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND qr_apply_to_live_view = true
  ) THEN
    RETURN false;
  END IF;

  -- Validate guest belongs to event
  SELECT first_name, COALESCE(last_name,'') AS last_name INTO _guest
  FROM guests WHERE id = _guest_id AND event_id = _event_id;
  IF _guest IS NULL THEN
    RETURN false;
  END IF;
  _guest_name := trim(both ' ' from _guest.first_name || ' ' || _guest.last_name);

  -- Validate feature enabled
  SELECT enabled, max_requests_per_guest INTO _settings
  FROM guest_song_request_settings WHERE event_id = _event_id;
  IF _settings IS NULL OR _settings.enabled IS NOT TRUE THEN
    RETURN false;
  END IF;
  _max := _settings.max_requests_per_guest;

  -- Iterate provided entries
  FOR _entry IN SELECT * FROM jsonb_array_elements(COALESCE(_requests, '[]'::jsonb))
  LOOP
    _slot := COALESCE((_entry->>'slot_index')::int, 0);
    IF _slot < 0 OR _slot >= _max THEN
      CONTINUE;
    END IF;
    _title := trim(both ' ' from COALESCE(_entry->>'song_title',''));
    _artist := trim(both ' ' from COALESCE(_entry->>'artist_name',''));
    _link := NULLIF(trim(both ' ' from COALESCE(_entry->>'music_link','')), '');
    _note := NULLIF(trim(both ' ' from COALESCE(_entry->>'note','')), '');

    IF _title = '' AND _artist = '' AND _link IS NULL AND _note IS NULL THEN
      -- Empty slot: delete any existing entry
      DELETE FROM guest_song_requests
      WHERE guest_id = _guest_id AND slot_index = _slot;
    ELSE
      INSERT INTO guest_song_requests (
        event_id, guest_id, guest_name, slot_index,
        song_title, artist_name, music_link, note
      ) VALUES (
        _event_id, _guest_id, _guest_name, _slot,
        _title, _artist, _link, _note
      )
      ON CONFLICT (guest_id, slot_index) DO UPDATE
        SET song_title = EXCLUDED.song_title,
            artist_name = EXCLUDED.artist_name,
            music_link = EXCLUDED.music_link,
            note = EXCLUDED.note,
            guest_name = EXCLUDED.guest_name,
            updated_at = now();
      -- status preserved on update
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_song_request_settings_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_guest_song_requests_for_guest(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_song_requests(uuid, uuid, jsonb) TO anon, authenticated;
