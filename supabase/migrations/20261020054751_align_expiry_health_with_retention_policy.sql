BEGIN;
-- Service-only, aggregate evidence. Never return scheduler SQL or provider payloads.
CREATE OR REPLACE FUNCTION public.admin_get_system_health() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE scheduler jsonb; delivery jsonb;
BEGIN
 IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF to_regclass('cron.job') IS NULL OR to_regclass('cron.job_run_details') IS NULL THEN
  scheduler:=jsonb_build_object('state','unavailable','jobs','[]'::jsonb);
 ELSE
  EXECUTE $query$
   WITH expected(name,label,max_age) AS (VALUES
    ('cleanup-media-password-rate-limits','Media rate-limit cleanup',interval '36 hours'),
    ('purge-closed-wedding-waitress-accounts','Closed account cleanup',interval '36 hours'),
    ('cleanup-organiser-phone-otp-challenges','Organiser verification cleanup',interval '36 hours'),
    ('process-guest-addition-notifications','Guest notification scheduler',interval '6 minutes'),
    ('video-wishes-cleanup','Video wishes cleanup',interval '3 hours'),
    ('process-access-expiry-reminders','Paid access expiry reminders',interval '3 hours'))
   SELECT jsonb_build_object('state','available','jobs',coalesce(jsonb_agg(jsonb_build_object(
    'name',e.name,'label',e.label,'registered',j.jobid IS NOT NULL,'active',coalesce(j.active,false),
    'schedule',j.schedule,'last_status',r.status,'last_started_at',r.start_time,'last_finished_at',r.end_time,
    'state',CASE WHEN j.jobid IS NULL THEN 'missing' WHEN NOT j.active THEN 'disabled'
     WHEN r.status IS NULL THEN 'unknown' WHEN r.status='failed' THEN 'failed'
     WHEN coalesce(r.end_time,r.start_time) IS NULL OR coalesce(r.end_time,r.start_time)<now()-e.max_age THEN 'stale'
     WHEN r.status='succeeded' THEN 'succeeded' ELSE 'running' END) ORDER BY e.name),'[]'::jsonb))
   FROM expected e LEFT JOIN cron.job j ON j.jobname=e.name
   LEFT JOIN LATERAL (SELECT status,start_time,end_time FROM cron.job_run_details d WHERE d.jobid=j.jobid
    ORDER BY coalesce(start_time,end_time) DESC NULLS LAST,runid DESC LIMIT 1) r ON true
  $query$ INTO scheduler;
 END IF;
 SELECT jsonb_build_object('delivered_records',count(*) FILTER(WHERE delivered_at IS NOT NULL),'last_delivery_at',max(delivered_at)) INTO delivery FROM public.email_send_log;
 RETURN jsonb_build_object('checked_at',now(),'scheduler',scheduler,'email_delivery_observations',delivery,
  'limitations',jsonb_build_array('Scheduler success confirms database execution, not successful provider processing.','Historical delivery records do not prove current webhook registration.','Automatic deletion after paid-access expiry is intentionally disabled; saved customer information is retained.'));
END $$;
REVOKE ALL ON FUNCTION public.admin_get_system_health() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_system_health() TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
