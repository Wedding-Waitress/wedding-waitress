BEGIN;

-- Reporting only. Do not create profiles or infer paid/trial entitlements.
CREATE FUNCTION private.admin_reconcile_signup_report(p_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,private,auth AS $$
DECLARE customers jsonb; missing_profiles integer; unmatched_profiles integer;
BEGIN
 IF private.is_platform_owner(auth.uid()) IS DISTINCT FROM true OR public.is_owner_admin() IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Owner required' USING ERRCODE='42501';
 END IF;
 WITH existing AS (
  SELECT value AS entry FROM jsonb_array_elements(coalesce(p_snapshot->'customers','[]'::jsonb))
 ), missing AS (
  SELECT u.id,u.email,u.phone AS mobile,u.created_at AS signup_date,u.email_confirmed_at,u.last_sign_in_at,
   'Sign-up awaiting profile'::text AS full_name,'unknown'::text AS customer_type,
   coalesce(l.status,c.status,CASE WHEN u.email_confirmed_at IS NULL THEN 'pending_verification' ELSE 'profile_incomplete' END) AS account_status,
   sp.name AS plan_name,us.status AS plan_status,us.started_at AS plan_started_at,us.expires_at AS plan_expires_at,
   (SELECT count(*) FROM public.events e WHERE e.user_id=u.id) AS event_count,
   NULL::text AS account_id,NULL::text AS country_code,l.admin_deleted_at
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
  LEFT JOIN public.account_lifecycle l ON l.account_owner_id=u.id
  LEFT JOIN public.admin_account_controls c ON c.account_owner_id=u.id
  LEFT JOIN LATERAL (SELECT s.* FROM public.user_subscriptions s WHERE s.user_id=u.id ORDER BY s.updated_at DESC LIMIT 1) us ON true
  LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
  WHERE p.id IS NULL AND u.deleted_at IS NULL AND coalesce(u.is_anonymous,false)=false
   AND NOT EXISTS(SELECT 1 FROM existing x WHERE x.entry->>'id'=u.id::text)
  UNION ALL
  SELECT p.id,p.email,p.mobile,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,
   coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Unmatched profile'),
   'unknown','unmatched_profile',NULL,NULL,NULL,NULL,
   (SELECT count(*) FROM public.events e WHERE e.user_id=p.id),p.account_id,p.country_code,l.admin_deleted_at
  FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id
  LEFT JOIN public.account_lifecycle l ON l.account_owner_id=p.id
  WHERE u.id IS NULL AND NOT EXISTS(SELECT 1 FROM existing x WHERE x.entry->>'id'=p.id::text)
 ), all_records AS (
  SELECT entry FROM existing UNION ALL SELECT to_jsonb(m) FROM missing m
 ), decorated AS (
  SELECT entry || jsonb_build_object(
   'identity_state',CASE WHEN u.id IS NULL THEN 'missing_auth' WHEN p.id IS NULL THEN 'missing_profile' ELSE 'complete' END,
   'auth_record_exists',u.id IS NOT NULL,'profile_record_exists',p.id IS NOT NULL,
   'account_status',CASE WHEN u.id IS NULL THEN 'unmatched_profile' ELSE entry->>'account_status' END
  ) AS entry
  FROM all_records r LEFT JOIN auth.users u ON u.id::text=r.entry->>'id'
  LEFT JOIN public.profiles p ON p.id::text=r.entry->>'id'
 )
 SELECT coalesce(jsonb_agg(entry ORDER BY entry->>'signup_date' DESC NULLS LAST),'[]'::jsonb),
  count(*) FILTER(WHERE entry->>'identity_state'='missing_profile'),
  count(*) FILTER(WHERE entry->>'identity_state'='missing_auth')
 INTO customers,missing_profiles,unmatched_profiles FROM decorated;
 RETURN jsonb_set(p_snapshot,'{customers}',customers)||jsonb_build_object('signup_reconciliation',
  jsonb_build_object('missing_profiles',missing_profiles,'unmatched_profiles',unmatched_profiles));
END $$;
REVOKE ALL ON FUNCTION private.admin_reconcile_signup_report(jsonb) FROM PUBLIC,anon,authenticated,service_role;

ALTER FUNCTION public.get_admin_platform_snapshot() RENAME TO get_admin_platform_snapshot_before_signup_reconciliation;
ALTER FUNCTION public.get_admin_platform_snapshot_before_signup_reconciliation() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_admin_platform_snapshot_before_signup_reconciliation() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.get_admin_platform_snapshot() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
BEGIN
 IF private.is_platform_owner(auth.uid()) IS DISTINCT FROM true OR public.is_owner_admin() IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Owner required' USING ERRCODE='42501';
 END IF;
 PERFORM private.require_recent_admin_verification();
 RETURN private.admin_reconcile_signup_report(private.get_admin_platform_snapshot_before_signup_reconciliation());
END $$;
REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
