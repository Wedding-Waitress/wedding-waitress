CREATE UNIQUE INDEX IF NOT EXISTS event_media_items_event_photo_booth_seq_key
  ON public.event_media_items (event_id, photo_booth_seq)
  WHERE photo_booth_seq IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_media_items_event_guestbook_recording_seq_key
  ON public.event_media_items (event_id, guestbook_recording_seq)
  WHERE guestbook_recording_seq IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_guestbook_messages_event_guestbook_seq_key
  ON public.event_guestbook_messages (event_id, guestbook_seq)
  WHERE guestbook_seq IS NOT NULL;