CREATE OR REPLACE FUNCTION public.finalize_event_media_upload(_item_id uuid, _upload_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE _tok_id uuid;
BEGIN
  UPDATE public.event_media_items
  SET upload_status='uploaded', uploaded_at=now(), upload_token_used_at=now()
  WHERE id=_item_id
    AND upload_status='pending'
    AND upload_token_used_at IS NULL
    AND upload_token_expires_at>now()
    AND upload_token_hash=public._hash_upload_token(_upload_token)
  RETURNING upload_token_id INTO _tok_id;
  IF FOUND THEN
    IF _tok_id IS NOT NULL THEN
      UPDATE public.event_media_upload_tokens
      SET uploads_used=uploads_used+1 WHERE id=_tok_id;
    END IF;
    RETURN true;
  END IF;
  -- A lost response after commit must not force another upload or quota charge.
  -- Only the same still-valid item token can acknowledge an existing success.
  RETURN EXISTS (
    SELECT 1 FROM public.event_media_items
    WHERE id=_item_id AND upload_status='uploaded'
      AND upload_token_used_at IS NOT NULL
      AND upload_token_expires_at>now()
      AND upload_token_hash=public._hash_upload_token(_upload_token)
  );
END;
$function$;
-- CREATE OR REPLACE retains the existing EXECUTE grants and ownership.
