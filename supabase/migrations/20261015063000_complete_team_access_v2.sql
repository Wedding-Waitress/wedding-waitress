-- LOCAL/PENDING. Preserve every membership, invitation, event and stored file.
BEGIN;
-- Never silently remove people or revoke invitations to repair a legacy excess.
DO $$ BEGIN
 IF EXISTS(SELECT account_owner_id FROM (
  SELECT account_owner_id FROM public.account_members WHERE accepted_at IS NOT NULL AND access_disabled_at IS NULL
  UNION ALL
  SELECT account_owner_id FROM public.account_invitations WHERE status='pending' AND expires_at>now()
 ) seats GROUP BY account_owner_id HAVING count(*)>5) THEN
  RAISE EXCEPTION 'Existing team exceeds five occupied/reserved places; review before release';
 END IF;
END $$;
-- Plan limits are metadata; reservation functions already atomically lock owner seats.
UPDATE public.subscription_plans SET max_users=5,team_members=4
WHERE max_users IS DISTINCT FROM 5 OR team_members IS DISTINCT FROM 4;

CREATE FUNCTION private.team_account_owner(p_user uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT m.account_owner_id FROM public.account_members m
 WHERE m.member_user_id=p_user AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL
 ORDER BY (m.role='master') DESC,m.invited_at LIMIT 1),p_user)
$$;
REVOKE ALL ON FUNCTION private.team_account_owner(uuid) FROM PUBLIC,anon,authenticated;

-- A former account's closure must not follow a removed member into a new team.
CREATE OR REPLACE FUNCTION private.closed_account_planning_blocked(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user
 AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR EXISTS(SELECT 1 FROM public.account_members m JOIN public.account_lifecycle l ON l.account_owner_id=m.account_owner_id
 WHERE m.member_user_id=p_user AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL
 AND l.status IN ('scheduled_for_deletion','permanently_deleted'))
$$;

-- Preserve the existing entitlement/launch implementations, including renewals,
-- immutable trial dates and platform-owner exceptions. Only resolve their subject.
DO $copy$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('private.prelaunch_access_allowed(uuid)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.prelaunch_access_allowed(', 'FUNCTION private.individual_prelaunch_access_allowed(');
 EXECUTE definition;
 definition:=pg_get_functiondef('private.customer_entitlement_state(uuid)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.customer_entitlement_state(', 'FUNCTION private.individual_customer_entitlement_state(');
 EXECUTE definition;
END $copy$;
REVOKE ALL ON FUNCTION private.individual_prelaunch_access_allowed(uuid),private.individual_customer_entitlement_state(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.prelaunch_access_allowed(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.individual_prelaunch_access_allowed(private.team_account_owner(p_user))
$$;
CREATE OR REPLACE FUNCTION private.customer_entitlement_state(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.individual_customer_entitlement_state(private.team_account_owner(p_user))
$$;

-- A pending invitation confers no planning access. It permits only creation of
-- its invited identity while the inviting owner's launch access is valid.
DO $signup$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('private.guard_prelaunch_auth_insert()'::regprocedure);
 IF definition !~* '\mBEGIN\M' THEN RAISE EXCEPTION 'Unrecognised signup guard'; END IF;
 definition:=regexp_replace(definition,'\mBEGIN\M', $inject$BEGIN
 IF EXISTS(SELECT 1 FROM public.account_invitations ai
 WHERE lower(ai.email)=lower(NEW.email) AND ai.status='pending' AND ai.expires_at>now()
 AND private.prelaunch_access_allowed(ai.account_owner_id)
 AND public.is_account_operational(ai.account_owner_id)
 AND NOT private.customer_entitlement_blocked(ai.account_owner_id)) THEN RETURN NEW; END IF;
 $inject$,'i');
 EXECUTE definition;
END $signup$;

CREATE FUNCTION private.team_planning_owner(caller uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid;
BEGIN
 IF caller IS NULL THEN RETURN NULL; END IF;
 SELECT m.account_owner_id INTO owner_id FROM public.account_members m
 WHERE m.member_user_id=caller AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL
 ORDER BY (m.role='master') DESC,m.invited_at LIMIT 1;
 IF owner_id IS NULL OR NOT public.is_account_operational(caller)
 OR NOT public.is_account_operational(owner_id)
 OR private.account_planning_blocked(caller) OR private.admin_deleted_planning_blocked(caller)
 OR private.closed_account_planning_blocked(caller)
 OR private.customer_entitlement_blocked(caller) OR private.customer_entitlement_blocked(owner_id)
 OR NOT coalesce(private.prelaunch_access_allowed(caller),false) THEN RETURN NULL; END IF;
 RETURN owner_id;
END $$;
REVOKE ALL ON FUNCTION private.team_planning_owner(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.current_planning_account_owner() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.team_planning_owner(auth.uid())
$$;
REVOKE ALL ON FUNCTION public.current_planning_account_owner() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_planning_account_owner() TO authenticated;

CREATE FUNCTION public.internal_team_event_owner(p_actor uuid,p_event uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT e.user_id FROM public.events e WHERE e.id=p_event AND e.user_id=private.team_planning_owner(p_actor)
$$;
REVOKE ALL ON FUNCTION public.internal_team_event_owner(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_event_owner(uuid,uuid) TO service_role;

CREATE FUNCTION public.internal_pending_team_owner(p_actor uuid,p_email text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT ai.account_owner_id FROM public.account_invitations ai
 WHERE lower(ai.email)=lower(p_email) AND ai.status='pending' AND ai.expires_at>now()
 AND public.is_account_operational(ai.account_owner_id)
 AND NOT private.customer_entitlement_blocked(ai.account_owner_id)
 AND NOT EXISTS(SELECT 1 FROM public.account_members m WHERE m.member_user_id=p_actor
 AND m.access_disabled_at IS NULL AND (m.role='master' OR m.account_owner_id<>ai.account_owner_id))
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.internal_pending_team_owner(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.internal_pending_team_owner(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.can_access_event(_user_id uuid,_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT _user_id IS NOT NULL AND _user_id=(SELECT auth.uid()) AND (
 public.has_role(_user_id,'admin'::public.app_role)
 OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=_event_id
 AND e.user_id=public.current_planning_account_owner()))
$$;
CREATE OR REPLACE FUNCTION public.can_manage_guest_details(_event_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.can_access_event(auth.uid(),_event_id)
$$;

-- Only these account planning RPCs change. Billing, paid purchases, team actions,
-- event creation/deletion, public feeds and retired Guestbook sharing are excluded.
-- Existing signatures, grants, validation, limits, template/rendering and guest
-- edit-link branches are retained by replacing only their owner identity checks.
DO $planning$
DECLARE target record; definition text;
BEGIN
 FOR target IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
 'convert_event_budget_currency','ensure_event_media_gallery',
 'generate_dj_mc_share_token','generate_guest_access_token','generate_media_upload_token',
 'generate_running_sheet_share_token','generate_seating_chart_share_token',
 'get_event_media_gallery_host','get_event_media_items_host',
 'restore_dj_mc_questionnaire_snapshot','set_event_media_album','set_event_media_albums',
 'set_event_media_gallery_open','set_event_media_guest_feature','set_event_media_moderation',
 'set_event_media_password','set_event_media_photo_booth','set_event_media_photo_booth_mode',
 'set_event_media_slideshow','set_event_media_video_guestbook','update_event_media_branding',
 'update_event_media_display_settings','update_event_media_limits',
 'update_event_media_photo_booth_template','update_event_media_slideshow_settings']) LOOP
  definition:=pg_get_functiondef(target.oid);
  IF definition !~ 'auth.uid\(\)' THEN RAISE EXCEPTION 'Unrecognised owner check in %',target.proname; END IF;
  definition:=replace(definition,'auth.uid()','public.current_planning_account_owner()');
  -- Restore keeps the independently authorised public edit-link path unchanged.
  IF target.proname<>'restore_dj_mc_questionnaire_snapshot' AND definition ~* '\mBEGIN\M' THEN
   definition:=regexp_replace(definition,'\mBEGIN\M', $guard$BEGIN
    IF public.current_planning_account_owner() IS NULL THEN
     RAISE EXCEPTION 'Active account planning access required' USING ERRCODE='42501'; END IF;
   $guard$,'i');
  END IF;
  EXECUTE definition;
 END LOOP;
END $planning$;

-- Recheck entitlement inside the seat transaction, not only in the HTTP guard.
DO $invitations$
DECLARE target regprocedure; definition text; subject text;
BEGIN
 FOREACH target IN ARRAY ARRAY[
  'public.internal_create_account_invitation(uuid,text,text,text,text,text)'::regprocedure,
  'public.internal_accept_account_invitation(uuid,text)'::regprocedure
 ] LOOP
  definition:=pg_get_functiondef(target);
  IF target::text LIKE '%internal_create_account_invitation%' THEN
   subject:='p_owner_id';
   definition:=regexp_replace(definition,'\mBEGIN\M',
    'BEGIN IF private.team_planning_owner('||subject||') IS DISTINCT FROM '||subject||' THEN RAISE EXCEPTION ''Active owner account access required'' USING ERRCODE=''42501''; END IF;', 'i');
  ELSE
   -- The invitation row and owner seat lock must precede this validation.
   definition:=replace(definition,'IF occupied_seats > 5 THEN',
    'IF private.team_planning_owner(invitation.account_owner_id) IS DISTINCT FROM invitation.account_owner_id THEN RAISE EXCEPTION ''Active owner account access required'' USING ERRCODE=''42501''; END IF; IF occupied_seats > 5 THEN');
  END IF;
  EXECUTE definition;
 END LOOP;
END $invitations$;

-- Shared invitation credits belong to the account owner. This is a planning
-- balance/consumption path, not permission to purchase credits or view billing.
DO $credits$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.get_sms_credits(uuid,uuid)'::regprocedure);
 definition:=replace(definition,'auth.uid()','public.current_planning_account_owner()');
 definition:=regexp_replace(definition,'\mBEGIN\M', $guard$BEGIN
  IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
   IF _user_id IS DISTINCT FROM auth.uid() AND _user_id IS DISTINCT FROM public.current_planning_account_owner() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
   _user_id:=public.current_planning_account_owner();
   IF _user_id IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  END IF;
 $guard$,'i');
 EXECUTE definition;
END $credits$;

-- Event-linked QR codes must not retain a former member as their raw owner.
CREATE FUNCTION public.canonicalize_team_event_qr_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.current_event_id IS NOT NULL THEN
  SELECT e.user_id INTO NEW.user_id FROM public.events e WHERE e.id=NEW.current_event_id;
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'Event not found' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.canonicalize_team_event_qr_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER canonicalize_team_event_qr_owner BEFORE INSERT OR UPDATE OF current_event_id,user_id
ON public.dynamic_qr_codes FOR EACH ROW EXECUTE FUNCTION public.canonicalize_team_event_qr_owner();
UPDATE public.dynamic_qr_codes q SET user_id=e.user_id FROM public.events e
WHERE q.current_event_id=e.id AND q.user_id IS DISTINCT FROM e.user_id;

-- A member sees the owner's plan/expiry, never raw billing records. Keep the
-- existing return signature and all other plan fields unchanged.
DO $plan$
DECLARE definition text;
BEGIN
 definition:=pg_get_functiondef('public.get_user_plan(uuid)'::regprocedure);
 IF position('WHERE us.user_id = _user_id' in definition)=0 THEN RAISE EXCEPTION 'Unrecognised plan reader'; END IF;
 definition:=replace(definition,'WHERE us.user_id = _user_id',
 'WHERE us.user_id = private.team_account_owner(_user_id) AND (_user_id=auth.uid() OR auth.role()=''service_role'')');
 EXECUTE definition;
END $plan$;

-- Readiness is enabled only after every change above commits successfully.
CREATE FUNCTION public.internal_team_access_version() RETURNS integer
LANGUAGE sql STABLE SET search_path='' AS $$ SELECT 2 $$;
REVOKE ALL ON FUNCTION public.internal_team_access_version() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.internal_team_access_version() TO service_role;
COMMIT;
