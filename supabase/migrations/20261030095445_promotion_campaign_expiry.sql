-- Existing campaigns remain No expiry. No campaign or redemption row is updated.
BEGIN;
ALTER TABLE public.promotion_campaigns ADD COLUMN expiry_date date, ADD COLUMN expires_at timestamptz,
 ADD CONSTRAINT promotion_expiry_boundary CHECK ((expiry_date IS NULL AND expires_at IS NULL) OR
  (expiry_date IS NOT NULL AND expires_at IS NOT NULL AND expires_at=((expiry_date+1)::timestamp AT TIME ZONE 'Australia/Sydney')));
CREATE OR REPLACE FUNCTION private.promotion_campaign_unexpired(p_expires_at timestamptz,p_at timestamptz)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $function$
 SELECT p_expires_at IS NULL OR p_at<p_expires_at
$function$;
REVOKE ALL ON FUNCTION private.promotion_campaign_unexpired(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.promotion_campaign_details(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
 SELECT to_jsonb(c) || jsonb_build_object(
  'expiry_version',1,'audience_version',2,'legacy_unlimited',c.usage_limit IS NULL,
  'bound_account_name',nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),
  'bound_account_email',u.email,'used',counts.used,'reserved',counts.reserved,
  'remaining',CASE WHEN c.usage_limit IS NULL THEN NULL ELSE greatest(0,c.usage_limit-counts.used-counts.reserved) END)
 FROM public.promotion_campaigns c
 LEFT JOIN public.profiles p ON p.id=c.bound_account_id
 LEFT JOIN auth.users u ON u.id=c.bound_account_id
 CROSS JOIN LATERAL (SELECT count(*) FILTER(WHERE state='completed') used,
  count(*) FILTER(WHERE state='reserved') reserved FROM private.promotion_redemptions r WHERE r.campaign_id=c.id) counts
 WHERE c.id=p_id
$function$;
REVOKE ALL ON FUNCTION private.promotion_campaign_details(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_manage_promotion(p_actor uuid, p_action text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE campaign public.promotion_campaigns; result jsonb; audience text; cap integer; bound uuid; search_email text; expiry date; old_limit integer; used_count integer; reserved_count integer; minimum_limit integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role'
 OR p_actor IS NULL OR private.is_platform_owner(p_actor) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified platform owner required' USING ERRCODE='42501'; END IF;
 IF p_action='search_accounts' THEN
  search_email:=lower(btrim(p_payload->>'email'));
  IF search_email IS NULL OR length(search_email)>254 OR search_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter the complete account email'; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'account_id',p.account_id,'name',btrim(concat_ws(' ',p.first_name,p.last_name)),'email',u.email)),'[]'::jsonb)
  INTO result FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE lower(btrim(u.email))=search_email AND EXISTS(SELECT 1 FROM public.account_members m WHERE m.account_owner_id=p.id AND m.member_user_id=p.id
   AND m.role='master' AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL)
  AND NOT EXISTS(SELECT 1 FROM public.account_lifecycle l WHERE l.account_owner_id=p.id AND l.status IN ('scheduled_for_deletion','permanently_deleted'))
  AND NOT private.admin_deleted_planning_blocked(p.id);
  RETURN result;
 ELSIF p_action='list' THEN
  SELECT coalesce(jsonb_agg(private.promotion_campaign_details(c.id) ORDER BY c.created_at DESC),'[]'::jsonb) INTO result FROM public.promotion_campaigns c WHERE c.deleted_at IS NULL;
  RETURN result;
 ELSIF p_action IN ('create','create_audience_campaign','create_expiring_campaign') THEN
  audience:=p_payload->>'audience';
  IF audience IS NULL OR audience NOT IN ('general','customer','venue_partner') THEN RAISE EXCEPTION 'Choose a promotion audience'; END IF;
  IF jsonb_typeof(p_payload->'usage_limit') IS DISTINCT FROM 'number' OR (p_payload->>'usage_limit') !~ '^(0|[1-9][0-9]?|100)$' THEN
   RAISE EXCEPTION 'Choose a whole usage limit from 0 to 100'; END IF;
  cap:=(p_payload->>'usage_limit')::integer;
  bound:=nullif(p_payload->>'bound_account_id','')::uuid;
  IF audience='general' AND bound IS NOT NULL THEN RAISE EXCEPTION 'General codes do not bind an account'; END IF;
  IF audience<>'general' AND (bound IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.id
   WHERE p.id=bound AND EXISTS(SELECT 1 FROM public.account_members m WHERE m.account_owner_id=p.id AND m.member_user_id=p.id AND m.role='master'
    AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL)
   AND NOT EXISTS(SELECT 1 FROM public.account_lifecycle l WHERE l.account_owner_id=p.id AND l.status IN ('scheduled_for_deletion','permanently_deleted'))
   AND NOT private.admin_deleted_planning_blocked(p.id))) THEN RAISE EXCEPTION 'Select an existing available account'; END IF;
  IF p_action='create_expiring_campaign' AND NOT (p_payload ? 'expiry_date') THEN RAISE EXCEPTION 'Choose No expiry or an expiry date'; END IF;
  expiry:=NULL;
  IF p_payload->'expiry_date' IS NOT NULL AND jsonb_typeof(p_payload->'expiry_date')<>'null' THEN
   IF jsonb_typeof(p_payload->'expiry_date')<>'string' OR (p_payload->>'expiry_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Choose a valid expiry date'; END IF;
   expiry:=(p_payload->>'expiry_date')::date;
   IF expiry<(clock_timestamp() AT TIME ZONE 'Australia/Sydney')::date THEN RAISE EXCEPTION 'Expiry date cannot be before today in Australia/Sydney'; END IF;
  END IF;
  INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by,audience,usage_limit,bound_account_id,expiry_date,expires_at)
  VALUES(upper(btrim(p_payload->>'code')),btrim(p_payload->>'campaign_name'),(p_payload->>'percent_off')::integer,p_actor,audience,cap,bound,expiry,CASE WHEN expiry IS NULL THEN NULL ELSE (expiry+1)::timestamp AT TIME ZONE 'Australia/Sydney' END) RETURNING * INTO campaign;
 ELSIF p_action='delete' THEN
  -- Shares the campaign row lock with reserve_first_purchase_promotion. A reservation
  -- committed before deletion remains valid; no reservation can start after deletion.
  SELECT * INTO campaign FROM public.promotion_campaigns WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
  IF campaign.deleted_at IS NOT NULL THEN RETURN private.promotion_campaign_details(campaign.id); END IF;
  UPDATE public.promotion_campaigns SET active=false,deleted_at=now(),deleted_by=p_actor,updated_at=now()
  WHERE id=campaign.id RETURNING * INTO campaign;
 ELSIF p_action='set_usage_limit' THEN
  IF jsonb_typeof(p_payload->'usage_limit') IS DISTINCT FROM 'number' OR (p_payload->>'usage_limit') !~ '^(0|[1-9][0-9]?|100)$' THEN RAISE EXCEPTION 'Choose a whole usage limit from 0 to 100'; END IF;
  cap:=(p_payload->>'usage_limit')::integer;
  SELECT * INTO campaign FROM public.promotion_campaigns WHERE id=(p_payload->>'id')::uuid AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found' USING ERRCODE='P0002'; END IF;
  SELECT count(*) FILTER(WHERE state='completed'),count(*) FILTER(WHERE state='reserved') INTO used_count,reserved_count FROM private.promotion_redemptions WHERE campaign_id=campaign.id;
  minimum_limit:=used_count+reserved_count;
  IF cap<minimum_limit THEN
   RAISE EXCEPTION 'Minimum allocation is %: % used and % reserved.',minimum_limit,used_count,reserved_count
    USING DETAIL=jsonb_build_object('minimum',minimum_limit,'used',used_count,'reserved',reserved_count,'campaign',private.promotion_campaign_details(campaign.id))::text;
  END IF;
  old_limit:=campaign.usage_limit;
  UPDATE public.promotion_campaigns SET usage_limit=cap,updated_at=clock_timestamp() WHERE id=campaign.id RETURNING * INTO campaign;
 ELSIF p_action='set_active' THEN
  IF jsonb_typeof(p_payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Active must be boolean'; END IF;
  SELECT * INTO campaign FROM public.promotion_campaigns WHERE id=(p_payload->>'id')::uuid AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
  IF (p_payload->>'active')::boolean AND NOT private.promotion_campaign_unexpired(campaign.expires_at,clock_timestamp()) THEN RAISE EXCEPTION 'Expired campaigns cannot be reactivated'; END IF;
  UPDATE public.promotion_campaigns SET active=(p_payload->>'active')::boolean,updated_at=now() WHERE id=(p_payload->>'id')::uuid AND deleted_at IS NULL RETURNING * INTO campaign;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported promotion action'; END IF;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(p_actor,p_actor,'promotion_'||CASE WHEN p_action IN ('create_audience_campaign','create_expiring_campaign') THEN 'create' ELSE p_action END,jsonb_build_object('campaign_id',campaign.id,'percent_off',campaign.percent_off,
  'campaign_name',campaign.campaign_name,'code',campaign.code,'deleted_at',campaign.deleted_at,'deleted_by',campaign.deleted_by,'expiry_date',campaign.expiry_date,'expires_at',campaign.expires_at,'previous_usage_limit',old_limit,'active',campaign.active,'audience',campaign.audience,'usage_limit',campaign.usage_limit,'bound_account_id',campaign.bound_account_id));
 RETURN private.promotion_campaign_details(campaign.id);
END $function$;
CREATE OR REPLACE FUNCTION public.quote_first_purchase_promotion(p_user uuid, p_code text, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth'
AS $function$
DECLARE campaign public.promotion_campaigns; email text; amount integer; credits integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Verified operational account master required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (normalized_email=email OR account_user_id=p_user) AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'First purchase only' USING ERRCODE='42501'; END IF;
 amount:=CASE p_plan WHEN 'essential' THEN 19900 WHEN 'premium' THEN 24900 WHEN 'unlimited' THEN 29900 END;
 credits:=CASE p_plan WHEN 'essential' THEN 150 WHEN 'premium' THEN 250 WHEN 'unlimited' THEN 450 END;
 IF amount IS NULL THEN RAISE EXCEPTION 'Approved package required'; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Code unavailable'; END IF;
 IF NOT private.promotion_campaign_unexpired(campaign.expires_at,clock_timestamp()) AND NOT EXISTS(
  SELECT 1 FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND account_user_id=p_user AND normalized_email=email
  AND plan_key=p_plan AND state='reserved' AND stripe_session_id IS NOT NULL AND attempt_started_at<campaign.expires_at) THEN RAISE EXCEPTION 'Promo code has expired'; END IF;
 IF campaign.audience='customer' AND campaign.bound_account_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'Code is restricted to its selected customer account' USING ERRCODE='42501'; END IF;
 IF campaign.usage_limit=0 THEN RAISE EXCEPTION 'This campaign allows no redemptions'; END IF;
 IF campaign.usage_limit IS NOT NULL AND (SELECT count(*) FROM private.promotion_redemptions r WHERE r.campaign_id=campaign.id AND r.state IN ('reserved','completed') AND NOT(r.state='reserved' AND r.account_user_id=p_user AND r.normalized_email=email AND r.plan_key=p_plan))>=campaign.usage_limit THEN
  RAISE EXCEPTION 'Campaign allocation is fully used or reserved'; END IF;
 RETURN jsonb_build_object('campaign_id',campaign.id,'code',campaign.code,'plan_key',p_plan,'percent_off',campaign.percent_off,
 'subtotal_cents',amount-round(amount::numeric*campaign.percent_off/100),'currency','AUD',
 'included_credits',CASE WHEN campaign.percent_off<=50 THEN credits ELSE 0 END);
END $function$;
CREATE OR REPLACE FUNCTION public.reserve_first_purchase_promotion(p_user uuid, p_code text, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth'
AS $function$
DECLARE campaign public.promotion_campaigns; email text; reservation private.promotion_redemptions;
 normal_credits integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL
 AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master'
 AND accepted_at IS NOT NULL AND access_disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Verified operational account master required' USING ERRCODE='42501'; END IF;
 normal_credits:=CASE p_plan WHEN 'essential' THEN 150 WHEN 'premium' THEN 250 WHEN 'unlimited' THEN 450 END;
 IF normal_credits IS NULL THEN RAISE EXCEPTION 'Approved first package required'; END IF;
 -- Same lock as original paid fulfillment prevents simultaneous first purchase paths.
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||p_user::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('promotion-email:'||email,0));
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (normalized_email=email OR account_user_id=p_user) AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'Promotions apply only to the first package purchase' USING ERRCODE='42501'; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Promo code is unavailable'; END IF;
 IF campaign.audience='customer' AND campaign.bound_account_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'Code is restricted to its selected customer account' USING ERRCODE='42501'; END IF;
 IF campaign.usage_limit=0 THEN RAISE EXCEPTION 'This campaign allows no redemptions'; END IF;
 SELECT * INTO reservation FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND normalized_email=email FOR UPDATE;
 -- A previously bound checkout is honored; an expired code cannot start a new
 -- reservation, renew an unbound hold, or create a replacement provider attempt.
 IF NOT private.promotion_campaign_unexpired(campaign.expires_at,clock_timestamp()) AND NOT (
  reservation.id IS NOT NULL AND reservation.state='reserved' AND reservation.account_user_id=p_user
  AND reservation.plan_key=p_plan AND reservation.stripe_session_id IS NOT NULL AND reservation.attempt_started_at<campaign.expires_at) THEN
  RAISE EXCEPTION 'Promo code has expired'; END IF;
 IF FOUND AND reservation.state='reserved' THEN
  IF reservation.account_user_id<>p_user OR reservation.plan_key<>p_plan THEN
   RAISE EXCEPTION 'Promotion already used or reserved for another checkout'; END IF;
  IF reservation.stripe_session_id IS NULL THEN
   UPDATE private.promotion_redemptions SET attempt_started_at=now() WHERE id=reservation.id RETURNING * INTO reservation;
  END IF;
 ELSE
  IF reservation.id IS NOT NULL AND (reservation.state<>'released' OR reservation.account_user_id<>p_user) THEN
   RAISE EXCEPTION 'Promotion already used or reserved for another checkout'; END IF;
  IF EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (normalized_email=email OR account_user_id=p_user) AND state='reserved') THEN
   RAISE EXCEPTION 'An earlier promotional checkout must be reconciled first'; END IF;
  -- The campaign row lock covers new and reactivated reservations alike.
  IF campaign.usage_limit IS NOT NULL AND (SELECT count(*) FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND state IN ('reserved','completed'))>=campaign.usage_limit THEN
   RAISE EXCEPTION 'Campaign allocation is fully used or reserved'; END IF;
  IF reservation.id IS NULL THEN
   INSERT INTO private.promotion_redemptions(campaign_id,normalized_email,account_user_id,plan_key,percent_off,included_credits)
   VALUES(campaign.id,email,p_user,p_plan,campaign.percent_off,CASE WHEN campaign.percent_off<=50 THEN normal_credits ELSE 0 END)
   RETURNING * INTO reservation;
  ELSE
   -- Only verified expiry or a stale, never-exposed unbound attempt can release.
   -- Keep the id and attempt archive; the next provider attempt has a new key.
   UPDATE private.promotion_redemptions SET state='reserved',attempt_started_at=now(),plan_key=p_plan,percent_off=campaign.percent_off,
    included_credits=CASE WHEN campaign.percent_off<=50 THEN normal_credits ELSE 0 END
   WHERE id=reservation.id RETURNING * INTO reservation;
  END IF;
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
  VALUES(p_user,p_user,'promotion_reserved',jsonb_build_object('campaign_id',campaign.id,'reservation_id',reservation.id,'attempt_number',reservation.attempt_number));
 END IF;
 RETURN jsonb_build_object('id',reservation.id,'campaign_id',campaign.id,'percent_off',reservation.percent_off,
  'included_credits',reservation.included_credits,'plan_key',reservation.plan_key,'stripe_session_id',reservation.stripe_session_id,'attempt_number',reservation.attempt_number);
END $function$;
CREATE OR REPLACE FUNCTION public.promotion_expiry_candidates(p_user uuid, p_code text, p_live boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE campaign public.promotion_campaigns; email text; result jsonb; at_capacity boolean:=false;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR p_live IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (account_user_id=p_user OR normalized_email=email) AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN RETURN '[]'::jsonb; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active AND deleted_at IS NULL AND private.promotion_campaign_unexpired(expires_at,clock_timestamp()) AND (audience<>'customer' OR bound_account_id=p_user);
 IF FOUND AND campaign.usage_limit IS NOT NULL AND campaign.usage_limit>0 THEN
  at_capacity:=(SELECT count(*) FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND state IN ('reserved','completed'))>=campaign.usage_limit;
 END IF;
 -- Recover the caller's own abandoned attempt even when they change codes or
 -- the original campaign was paused/deleted. Other accounts are inspected only
 -- when the requested campaign needs shared capacity.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'session_id',r.stripe_session_id,'started_at',r.attempt_started_at,'target_full',at_capacity,'campaign_hold',r.campaign_id=campaign.id)),'[]'::jsonb) INTO result
 FROM (SELECT id,campaign_id,stripe_session_id,attempt_started_at FROM private.promotion_redemptions WHERE state='reserved'
  AND (account_user_id=p_user OR (at_capacity AND campaign_id=campaign.id))
  AND ((stripe_session_id IS NOT NULL AND livemode=p_live) OR (stripe_session_id IS NULL AND attempt_started_at<now()-interval '10 minutes')) ORDER BY (account_user_id=p_user) DESC,created_at,id LIMIT 101) r;
 RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb),public.quote_first_purchase_promotion(uuid,text,text),public.reserve_first_purchase_promotion(uuid,text,text),public.promotion_expiry_candidates(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb),public.quote_first_purchase_promotion(uuid,text,text),public.reserve_first_purchase_promotion(uuid,text,text),public.promotion_expiry_candidates(uuid,text,boolean) TO service_role;
COMMIT;
