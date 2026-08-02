
-- New authoritative bulk delete for general gallery media (shared photos/videos + photo booth).
CREATE OR REPLACE FUNCTION public.delete_event_media_items(_item_ids uuid[])
RETURNS TABLE(id uuid, storage_path text, event_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT i.id, i.storage_path, i.event_id
    FROM public.event_media_items i
    WHERE i.id = ANY(_item_ids)
      AND public.can_access_event(_uid, i.event_id)
      AND COALESCE(i.source_category, 'guest_upload') IN ('guest_upload', 'photo_booth')
  ), deleted AS (
    DELETE FROM public.event_media_items d
    USING candidates c
    WHERE d.id = c.id
    RETURNING d.id, d.storage_path, d.event_id
  )
  SELECT deleted.id, deleted.storage_path, deleted.event_id FROM deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_event_media_items(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_event_media_items(uuid[]) FROM anon;

-- Fix the legacy single-item delete: never touch storage.objects directly
-- (a BEFORE DELETE trigger raises 42501 and aborted the whole transaction).
CREATE OR REPLACE FUNCTION public.delete_event_media_item(_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
        _deleted int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.event_media_items i
  WHERE i.id = _item_id
    AND public.can_access_event(_uid, i.event_id);

  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted > 0;
END;
$$;
