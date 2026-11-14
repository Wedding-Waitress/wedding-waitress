-- Retain campaign identities and all related financial/redemption history.
BEGIN;
ALTER TABLE public.promotion_campaigns
 ADD COLUMN deleted_at timestamptz,
 ADD COLUMN deleted_by uuid,
 ADD CONSTRAINT promotion_deleted_inactive CHECK (deleted_at IS NULL OR active=false),
 ADD CONSTRAINT promotion_deletion_actor CHECK ((deleted_at IS NULL) = (deleted_by IS NULL));
-- Existing quote/reservation functions require active=true. The constraint above
-- prevents deleted codes from becoming redeemable, even outside the admin API.
-- Do not release reservations or remove records: already issued checkouts must
-- remain reconcilable by the existing evidence-checked fulfillment functions.
-- Keep the unique code so old codes cannot accidentally identify a new campaign.
CREATE OR REPLACE FUNCTION public.admin_manage_promotion(p_actor uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE campaign public.promotion_campaigns; result jsonb; audience text; cap integer; bound uuid; search_email text;
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
 ELSIF p_action IN ('create','create_audience_campaign') THEN
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
  INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by,audience,usage_limit,bound_account_id)
  VALUES(upper(btrim(p_payload->>'code')),btrim(p_payload->>'campaign_name'),(p_payload->>'percent_off')::integer,p_actor,audience,cap,bound) RETURNING * INTO campaign;
 ELSIF p_action='delete' THEN
  -- Shares the campaign row lock with reserve_first_purchase_promotion. A reservation
  -- committed before deletion remains valid; no reservation can start after deletion.
  SELECT * INTO campaign FROM public.promotion_campaigns WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
  IF campaign.deleted_at IS NOT NULL THEN RETURN private.promotion_campaign_details(campaign.id); END IF;
  UPDATE public.promotion_campaigns SET active=false,deleted_at=now(),deleted_by=p_actor,updated_at=now()
  WHERE id=campaign.id RETURNING * INTO campaign;
 ELSIF p_action='set_active' THEN
  IF jsonb_typeof(p_payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Active must be boolean'; END IF;
  UPDATE public.promotion_campaigns SET active=(p_payload->>'active')::boolean,updated_at=now() WHERE id=(p_payload->>'id')::uuid AND deleted_at IS NULL RETURNING * INTO campaign;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported promotion action'; END IF;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(p_actor,p_actor,'promotion_'||CASE WHEN p_action='create_audience_campaign' THEN 'create' ELSE p_action END,jsonb_build_object('campaign_id',campaign.id,'percent_off',campaign.percent_off,
  'campaign_name',campaign.campaign_name,'code',campaign.code,'deleted_at',campaign.deleted_at,'deleted_by',campaign.deleted_by,'active',campaign.active,'audience',campaign.audience,'usage_limit',campaign.usage_limit,'bound_account_id',campaign.bound_account_id));
 RETURN private.promotion_campaign_details(campaign.id);
END $$;
REVOKE ALL ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb) TO service_role;


COMMIT;
