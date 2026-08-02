
CREATE TABLE IF NOT EXISTS public.event_media_seq_counters (
  event_id uuid NOT NULL,
  seq_kind text NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, seq_kind)
);

-- Internal bookkeeping only: no client role may touch it.
GRANT ALL ON public.event_media_seq_counters TO service_role;
ALTER TABLE public.event_media_seq_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.event_media_seq_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed high-water marks from what has already been issued.
INSERT INTO public.event_media_seq_counters (event_id, seq_kind, last_value)
SELECT event_id, 'share_photo', MAX(share_photo_seq) FROM public.event_media_items
WHERE share_photo_seq IS NOT NULL GROUP BY event_id
ON CONFLICT (event_id, seq_kind) DO NOTHING;

INSERT INTO public.event_media_seq_counters (event_id, seq_kind, last_value)
SELECT event_id, 'share_video', MAX(share_video_seq) FROM public.event_media_items
WHERE share_video_seq IS NOT NULL GROUP BY event_id
ON CONFLICT (event_id, seq_kind) DO NOTHING;

INSERT INTO public.event_media_seq_counters (event_id, seq_kind, last_value)
SELECT event_id, 'photo_booth', MAX(photo_booth_seq) FROM public.event_media_items
WHERE photo_booth_seq IS NOT NULL GROUP BY event_id
ON CONFLICT (event_id, seq_kind) DO NOTHING;

INSERT INTO public.event_media_seq_counters (event_id, seq_kind, last_value)
SELECT event_id, 'guestbook_recording', MAX(guestbook_recording_seq) FROM public.event_media_items
WHERE guestbook_recording_seq IS NOT NULL GROUP BY event_id
ON CONFLICT (event_id, seq_kind) DO NOTHING;

INSERT INTO public.event_media_seq_counters (event_id, seq_kind, last_value)
SELECT event_id, 'guestbook_message', MAX(guestbook_seq) FROM public.event_guestbook_messages
WHERE guestbook_seq IS NOT NULL GROUP BY event_id
ON CONFLICT (event_id, seq_kind) DO NOTHING;

-- Monotonic, never-reused allocator.
CREATE OR REPLACE FUNCTION public.next_event_media_seq(_event_id uuid, _seq_kind text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _next integer;
BEGIN
  INSERT INTO public.event_media_seq_counters AS c (event_id, seq_kind, last_value)
  VALUES (_event_id, _seq_kind, 1)
  ON CONFLICT (event_id, seq_kind)
  DO UPDATE SET last_value = c.last_value + 1, updated_at = now()
  RETURNING last_value INTO _next;
  RETURN _next;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.next_event_media_seq(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_share_photo_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.share_photo_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF NEW.kind <> 'photo' OR COALESCE(NEW.source_category, 'guest_upload') <> 'guest_upload' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 42));
  NEW.share_photo_seq := public.next_event_media_seq(NEW.event_id, 'share_photo');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_share_video_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.share_video_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF NEW.kind <> 'video' OR COALESCE(NEW.source_category, 'guest_upload') <> 'guest_upload' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 43));
  NEW.share_video_seq := public.next_event_media_seq(NEW.event_id, 'share_video');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_photo_booth_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.photo_booth_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.source_category, CASE WHEN COALESCE(NEW.is_guestbook, false) THEN 'guestbook_recording' WHEN COALESCE(NEW.is_photo_booth, false) THEN 'photo_booth' ELSE 'guest_upload' END) <> 'photo_booth' THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 73));
  NEW.photo_booth_seq := public.next_event_media_seq(NEW.event_id, 'photo_booth');
  RETURN NEW;
END;
$$;
