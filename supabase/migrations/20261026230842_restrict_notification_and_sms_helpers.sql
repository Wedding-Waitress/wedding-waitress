-- Preserve authenticated own-account settings; reject missing identities explicitly.
DO $migration$
DECLARE
  target regprocedure;
  definition text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.get_notification_settings(uuid)'::regprocedure,
    'public.upsert_notification_settings(uuid,text,text,boolean,text,text,text,text,boolean)'::regprocedure
  ] LOOP
    definition := pg_get_functiondef(target);
    IF position('IF auth.uid() != _user_id THEN' IN definition) = 0 THEN
      RAISE EXCEPTION 'Unexpected notification authorization definition: %', target;
    END IF;
    EXECUTE replace(definition,
      'IF auth.uid() != _user_id THEN',
      'IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM _user_id THEN');
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', target);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target);
  END LOOP;
END
$migration$;

-- Existing SMS Edge/webhook callers use the service-role client.
REVOKE EXECUTE ON FUNCTION public.update_sms_log_status(uuid,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_sms_delivery_status(text,text,text,text,text,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_sms_log_status(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_sms_delivery_status(text,text,text,text,text,jsonb) TO service_role;
