-- Unconfirmed sends are never automatically resent. Keep private credentials in Vault.
CREATE OR REPLACE FUNCTION public.hold_access_expiry_reminder(_id bigint,_provider text DEFAULT NULL,_provider_id text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF _provider IS NOT NULL AND _provider NOT IN ('resend','twilio') THEN RAISE EXCEPTION 'Unknown provider'; END IF;
 UPDATE public.access_expiry_reminders SET status='unavailable',locked_at=NULL,updated_at=now(),
  provider=coalesce(_provider,provider),provider_id=coalesce(left(_provider_id,255),provider_id),
  last_error='Provider outcome or acceptance record requires manual review; automatic resend is disabled'
 WHERE id=_id AND status='processing';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.hold_access_expiry_reminder(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_access_expiry_reminder(bigint,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.hold_stale_access_expiry_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE affected integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 UPDATE public.access_expiry_reminders SET status='unavailable',locked_at=NULL,updated_at=now(),
  last_error='Interrupted send requires manual review; automatic resend is disabled'
 WHERE status='processing' AND locked_at<now()-interval '15 minutes';
 SELECT count(*) INTO affected FROM public.access_expiry_reminders WHERE status='unavailable' AND last_error LIKE '%manual review%';RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.hold_stale_access_expiry_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hold_stale_access_expiry_reminders() TO service_role;

-- scheduler-definitions: separate from the queue safeguards for isolated SQL tests.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='access_expiry_scheduler_secret') THEN
  PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'access_expiry_scheduler_secret','Dedicated paid-access reminder scheduler credential');
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS private.access_expiry_worker_requests(
 request_id bigint PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.access_expiry_worker_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.access_expiry_worker_requests FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.enqueue_access_expiry_reminders()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
DECLARE credential text;gateway text;request_id bigint;
BEGIN
 SELECT decrypted_secret INTO STRICT credential FROM vault.decrypted_secrets WHERE name='access_expiry_scheduler_secret';
 SELECT decrypted_secret INTO STRICT gateway FROM vault.decrypted_secrets WHERE name='guest_addition_processor_gateway_key';
 IF length(credential)<32 OR gateway IS NULL THEN RAISE EXCEPTION 'Reminder scheduler configuration unavailable'; END IF;
 SELECT net.http_post(url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/process-access-expiry-reminders',
  headers:=jsonb_build_object('Content-Type','application/json','apikey',gateway,'Authorization','Bearer '||gateway,'x-access-expiry-processor-secret',credential),
  body:='{}'::jsonb,timeout_milliseconds:=30000) INTO request_id;
 INSERT INTO private.access_expiry_worker_requests(request_id) VALUES(request_id);
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION private.enqueue_access_expiry_reminders() FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE scheduler_id bigint; BEGIN
 IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='process-access-expiry-reminders') THEN
  RAISE EXCEPTION 'Existing reminder schedule requires review'; END IF;
 SELECT cron.schedule('process-access-expiry-reminders','*/15 * * * *','SELECT private.enqueue_access_expiry_reminders();') INTO scheduler_id;
 PERFORM cron.alter_job(scheduler_id,active:=false);
END $$;
