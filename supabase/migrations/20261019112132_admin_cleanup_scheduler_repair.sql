BEGIN;
-- Cron receives a dedicated worker credential, never the service-role key.
CREATE FUNCTION private.enqueue_closed_account_cleanup(p_dry_run boolean DEFAULT false) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
DECLARE credential text; gateway text; request_id bigint;
BEGIN
 SELECT decrypted_secret INTO STRICT credential FROM vault.decrypted_secrets WHERE name='account_cleanup_scheduler_secret';
 SELECT decrypted_secret INTO STRICT gateway FROM vault.decrypted_secrets WHERE name='guest_addition_processor_gateway_key';
 IF length(credential)<32 OR gateway IS NULL THEN RAISE EXCEPTION 'Cleanup scheduler configuration unavailable'; END IF;
 SELECT net.http_post(url:='https://xytxkidpourwdbzzwcdp.supabase.co/functions/v1/purge-closed-accounts',
  headers:=jsonb_build_object('Content-Type','application/json','apikey',gateway,'x-account-purge-secret',credential),
  body:=jsonb_build_object('source','scheduled','dry_run',p_dry_run),timeout_milliseconds:=30000) INTO request_id;
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION private.enqueue_closed_account_cleanup(boolean) FROM PUBLIC,anon,authenticated,service_role;
SELECT cron.schedule('purge-closed-wedding-waitress-accounts','30 3 * * *',$job$SELECT private.enqueue_closed_account_cleanup(false);$job$);
COMMIT;
