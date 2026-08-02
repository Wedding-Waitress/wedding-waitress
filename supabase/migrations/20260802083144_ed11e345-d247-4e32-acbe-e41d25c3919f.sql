ALTER TABLE public.event_guestbook_messages ADD COLUMN IF NOT EXISTS guestbook_seq integer;

CREATE OR REPLACE FUNCTION public.assign_guestbook_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq integer;
BEGIN
  IF NEW.guestbook_seq IS NOT NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('guestbook_seq:' || NEW.event_id::text));
  SELECT COALESCE(MAX(guestbook_seq), 0) + 1 INTO next_seq
  FROM public.event_guestbook_messages
  WHERE event_id = NEW.event_id;
  NEW.guestbook_seq := next_seq;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_guestbook_seq_ins ON public.event_guestbook_messages;
CREATE TRIGGER trg_assign_guestbook_seq_ins
BEFORE INSERT ON public.event_guestbook_messages
FOR EACH ROW EXECUTE FUNCTION public.assign_guestbook_seq();

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.event_guestbook_messages
  WHERE guestbook_seq IS NULL
)
UPDATE public.event_guestbook_messages m
SET guestbook_seq = ordered.rn
FROM ordered
WHERE m.id = ordered.id;