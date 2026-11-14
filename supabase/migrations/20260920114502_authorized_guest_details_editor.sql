-- Personal capabilities authorize only their recipient's details.
-- Signed-in managers are checked against server-owned roles and event ownership.
-- Keep legacy signatures, but remove raw-ID editing access from everyone else.
CREATE OR REPLACE FUNCTION public.can_manage_guest_details(_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.events e WHERE e.id = _event_id AND (
   public.has_role(auth.uid(), 'admin'::public.app_role)
   OR (e.user_id = auth.uid() AND public.is_account_operational(auth.uid()))
  )
 );
$$;
REVOKE ALL ON FUNCTION public.can_manage_guest_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_guest_details(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _access_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare e events%rowtype; g guests%rowtype; m live_view_module_settings%rowtype; locked boolean; editable boolean; manager boolean;
begin
 manager := public.can_manage_guest_details(_event_id);
 IF NOT manager AND NOT EXISTS (
   SELECT 1 FROM public.guest_access_tokens t
   JOIN public.guests recipient ON recipient.id=t.guest_id AND recipient.event_id=t.event_id
   WHERE t.event_id=_event_id AND t.guest_id=_guest_id
     AND t.access_token=_access_token AND t.expires_at>now()
 ) THEN RAISE EXCEPTION 'Guest invitation unavailable' USING ERRCODE='42501'; END IF;
 select * into e from events where id=_event_id and (qr_apply_to_live_view=true or manager);
 select * into g from guests where id=_guest_id and event_id=_event_id;
 if e.id is null or g.id is null then raise exception 'Guest invitation unavailable'; end if;
 select * into m from live_view_module_settings where event_id=e.id;
 locked := e.date - (now() at time zone coalesce(e.event_timezone,'Australia/Sydney'))::date between 0 and 7;
 editable := e.rsvp_deadline is null or (now() at time zone coalesce(e.event_timezone,'Australia/Sydney'))::date <= (e.rsvp_deadline at time zone coalesce(e.event_timezone,'Australia/Sydney'))::date;
 return jsonb_build_object(
  'guest', jsonb_build_object('first_name',g.first_name,'last_name',g.last_name,'email',g.email,'mobile',g.mobile,'dietary',g.dietary,'notes',g.notes,'rsvp',g.rsvp,'table_no',g.table_no,'seat_no',g.seat_no,'family_group',g.family_group,'relation_partner',g.relation_partner,'relation_role',g.relation_role,'relation_display',g.relation_display,'mailing_address',g.mailing_address,'mailing_suburb',g.mailing_suburb,'mailing_state',g.mailing_state,'mailing_postcode',g.mailing_postcode),
  'partner1_name',coalesce(nullif(e.partner1_name,''),'Bride'),'partner2_name',coalesce(nullif(e.partner2_name,''),'Groom'),
  'relation_mode',coalesce(e.relation_mode,'two'),'custom_roles',coalesce(e.custom_roles,'[]'::jsonb),'allow_custom',coalesce(e.relation_allow_custom_role,false),
  'is_manager',manager,
  'can_edit',manager or editable and (not coalesce(locked,false) or coalesce((m.rsvp_invite_config->>'update_details_override_auto_lock')::boolean,false)),
  'can_rsvp',manager or editable and (not coalesce(locked,false) or coalesce((m.rsvp_invite_config->>'rsvp_override_auto_lock')::boolean,false)),
  'can_add',editable and coalesce(e.allow_guest_plus_ones,false) and coalesce(g.allow_plus_one,true) and (not coalesce(locked,false) or coalesce((m.rsvp_invite_config->>'plus_one_override_auto_lock')::boolean,false)),
  'allow_name_edit',manager or coalesce((m.update_details_config->>'allow_name_edit')::boolean,false));
end $function$;

REVOKE ALL ON FUNCTION public.get_guest_details_form_authorized(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_details_form_authorized(uuid,uuid,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION private.update_authorized_guest_details_fields(_guest_id uuid, _event_id uuid, _rsvp text DEFAULT NULL::text, _dietary text DEFAULT NULL::text, _mobile text DEFAULT NULL::text, _email text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _mailing_address text DEFAULT NULL::text, _mailing_suburb text DEFAULT NULL::text, _mailing_state text DEFAULT NULL::text, _mailing_postcode text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_exists BOOLEAN;
  _collect_addresses BOOLEAN;
BEGIN
  -- Validate: event must exist and have QR live view enabled
  SELECT EXISTS(
    SELECT 1 FROM events
    WHERE id = _event_id
    AND (qr_apply_to_live_view = true OR public.can_manage_guest_details(_event_id))
  ) INTO _event_exists;

  IF NOT _event_exists THEN
    RETURN false;
  END IF;

  -- Validate: guest must belong to this event
  IF NOT EXISTS(
    SELECT 1 FROM guests
    WHERE id = _guest_id
    AND event_id = _event_id
  ) THEN
    RETURN false;
  END IF;

  -- Only allow address writes when event has the toggle on; otherwise ignore them
  SELECT COALESCE(collect_guest_addresses, false) INTO _collect_addresses
  FROM events WHERE id = _event_id;

  IF NOT _collect_addresses THEN
    _mailing_address := NULL;
    _mailing_suburb := NULL;
    _mailing_state := NULL;
    _mailing_postcode := NULL;
  END IF;

  -- Perform the update (only non-null values), and recompute address_received
  UPDATE guests SET
    rsvp = COALESCE(_rsvp, rsvp),
    dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile),
    email = COALESCE(_email, email),
    notes = COALESCE(_notes, notes),
    mailing_address = COALESCE(_mailing_address, mailing_address),
    mailing_suburb = COALESCE(_mailing_suburb, mailing_suburb),
    mailing_state = COALESCE(_mailing_state, mailing_state),
    mailing_postcode = COALESCE(_mailing_postcode, mailing_postcode),
    address_received = CASE
      WHEN _collect_addresses THEN (
        COALESCE(NULLIF(btrim(COALESCE(_mailing_address, mailing_address)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_suburb, mailing_suburb)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_state, mailing_state)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_postcode, mailing_postcode)), ''), '') <> ''
      )
      ELSE address_received
    END,
    rsvp_date = CASE WHEN _rsvp IS NOT NULL THEN CURRENT_DATE ELSE rsvp_date END
  WHERE id = _guest_id AND event_id = _event_id;

  -- Log the change
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _guest_id, jsonb_build_object(
    'rsvp', _rsvp,
    'dietary', _dietary,
    'mobile', _mobile,
    'email', _email,
    'notes', _notes,
    'mailing_address', _mailing_address,
    'mailing_suburb', _mailing_suburb,
    'mailing_state', _mailing_state,
    'mailing_postcode', _mailing_postcode
  ), 'public_live_view');

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION private.update_authorized_guest_details_fields(uuid,uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.save_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb DEFAULT '[]'::jsonb, _access_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare ctx jsonb; e events%rowtype; g guests%rowtype; item jsonb; new_id uuid; group_name text; group_id uuid; group_ids uuid[]; n int; p text; r text; display text; roles jsonb; custom_name text;
begin
 ctx := public.get_guest_details_form_authorized(_event_id,_guest_id,_access_token);
 select * into e from events where id=_event_id for update;
 select * into g from guests where id=_guest_id and event_id=_event_id for update;
 if not (ctx->>'can_edit')::boolean then raise exception 'Guest updates are currently closed'; end if;
 if jsonb_typeof(_details) is distinct from 'object' or jsonb_typeof(_additional) is distinct from 'array' then raise exception 'Invalid guest details'; end if;
 if _details ?| array['table_id','table_no','seat_no','assigned','user_id','family_group'] then raise exception 'Only the organiser can assign tables and seats'; end if;
 if nullif(_details->>'rsvp','') is not null and _details->>'rsvp' not in ('Pending','Attending','Not Attending') then raise exception 'Invalid RSVP'; end if;
 if coalesce(_details->>'rsvp',g.rsvp) is distinct from g.rsvp and not (ctx->>'can_rsvp')::boolean then raise exception 'RSVP changes are currently closed'; end if;
 n := jsonb_array_length(_additional);
 if n>0 and not (ctx->>'can_add')::boolean then raise exception 'Additional guests are not permitted'; end if;
 if n>20 then raise exception 'Please add no more than 20 guests at once'; end if;
 if n>0 and e.guest_limit>0 and (select count(*) from guests where event_id=_event_id)+n>e.guest_limit then raise exception 'The event guest limit has been reached'; end if;
 roles := coalesce(e.custom_roles,'[]'::jsonb);
 -- Validate the selected relation against the organiser's labels and allowed roles.
 p := coalesce(_details->>'relation_partner',g.relation_partner,''); r := coalesce(_details->>'relation_role',g.relation_role,'');
 custom_name := nullif(btrim(_details->>'custom_relation'),'');
 if custom_name is not null then
  if not coalesce(e.relation_allow_custom_role,false) or length(custom_name)>80 then raise exception 'Custom relations are not permitted or too long'; end if;
  r := 'custom_' || regexp_replace(lower(custom_name),'\s+','_','g');
  if not roles @> jsonb_build_array(custom_name) then roles:=roles||jsonb_build_array(custom_name); end if;
 end if;
 if p is distinct from coalesce(g.relation_partner,'') or r is distinct from coalesce(g.relation_role,'') then
  if coalesce(e.relation_mode,'two')='off' then raise exception 'Relations are disabled'; end if;
  if p not in ('partner_one','partner_two') or (e.relation_mode='single' and p='partner_two') then raise exception 'Choose a relationship partner'; end if;
  if r not in ('bridal_party','father','mother','brother','sister','cousin','uncle','aunty','guest','vendor') and not exists(select 1 from jsonb_array_elements_text(roles) x where 'custom_'||regexp_replace(lower(x),'\s+','_','g')=r) then raise exception 'Choose a valid relation'; end if;
 end if;
 display := coalesce(g.relation_display,'');
 if p<>'' and r<>'' then
  display := case p when 'partner_one' then ctx->>'partner1_name' else ctx->>'partner2_name' end || ' / ' || coalesce((select x from jsonb_array_elements_text(roles) x where 'custom_'||regexp_replace(lower(x),'\s+','_','g')=r limit 1),initcap(replace(r,'_',' ')));
 end if;
 if (ctx->>'allow_name_edit')::boolean and (nullif(btrim(coalesce(_details->>'first_name',g.first_name)),'') is null or nullif(btrim(coalesce(_details->>'last_name',g.last_name)),'') is null) then raise exception 'First and last name are required'; end if;
 perform private.update_authorized_guest_details_fields(_guest_id,_event_id,case when _details->>'rsvp' is distinct from g.rsvp then _details->>'rsvp' else null end,_details->>'dietary',_details->>'mobile',_details->>'email',_details->>'notes',_details->>'mailing_address',_details->>'mailing_suburb',_details->>'mailing_state',_details->>'mailing_postcode');
 update guests set relation_partner=nullif(p,''),relation_role=nullif(r,''),relation_display=nullif(display,''), first_name=case when (ctx->>'allow_name_edit')::boolean then btrim(coalesce(_details->>'first_name',g.first_name)) else first_name end,last_name=case when (ctx->>'allow_name_edit')::boolean then btrim(coalesce(_details->>'last_name',g.last_name)) else last_name end where id=_guest_id;
 if roles is distinct from e.custom_roles then update events set custom_roles=roles where id=_event_id; end if;
 group_name:=nullif(g.family_group,'');
 select array_agg(id) into group_ids from guests where event_id=_event_id and (id=_guest_id or (group_name is not null and family_group=group_name));
 for item in select value from jsonb_array_elements(_additional) loop
  if item ?| array['table_id','table_no','seat_no','assigned','user_id'] then raise exception 'Only the organiser can assign tables and seats'; end if;
  if nullif(btrim(item->>'first_name'),'') is null or nullif(btrim(item->>'last_name'),'') is null or length(item->>'first_name')>100 or length(item->>'last_name')>100 then raise exception 'Every additional guest needs a first and last name'; end if;
  if coalesce(item->>'group_choice','') not in ('separate','group') then raise exception 'Choose whether each guest is separate or part of your group'; end if;
  insert into guests(event_id,user_id,first_name,last_name,mobile,email,dietary,notes,rsvp,added_by_guest_id)
   values(_event_id,e.user_id,btrim(item->>'first_name'),btrim(item->>'last_name'),nullif(item->>'mobile',''),nullif(item->>'email',''),coalesce(item->>'dietary','NA'),nullif(item->>'notes',''),'Pending',_guest_id) returning id into new_id;
  if item->>'group_choice'='group' then group_ids:=array_append(group_ids,new_id); end if;
  insert into guest_update_logs(event_id,guest_id,payload,changed_by) values(_event_id,new_id,jsonb_build_object('action','add_guest','added_by_guest_id',_guest_id,'group_choice',item->>'group_choice'),'public_live_view');
 end loop;
 if cardinality(group_ids)>(select count(*) from guests where event_id=_event_id and (id=_guest_id or (group_name is not null and family_group=group_name))) then
  select id into group_id from family_groups where event_id=_event_id and name=group_name limit 1;
  if group_name is null then group_name:=g.last_name||' '||case when cardinality(group_ids)=2 then 'Couple' else 'Family' end||' ('||left(_guest_id::text,8)||')';
  elsif cardinality(group_ids)>2 then group_name:=regexp_replace(group_name,'Couple','Family','gi'); end if;
  if group_id is null then insert into family_groups(event_id,name) values(_event_id,group_name) returning id into group_id;
  else update family_groups set name=group_name where id=group_id; end if;
  update guests set family_group=group_name where id=any(group_ids) and event_id=_event_id;
  insert into family_group_members(group_id,guest_id) select group_id,unnest(group_ids) on conflict do nothing;
 end if;
 return true;
end $function$;

REVOKE ALL ON FUNCTION public.save_guest_details_form_authorized(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_guest_details_form_authorized(uuid,uuid,jsonb,jsonb,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_guest_details_form(_event_id uuid,_guest_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT public.get_guest_details_form_authorized(_event_id,_guest_id,NULL);
$$;
CREATE OR REPLACE FUNCTION public.save_guest_details_form(_event_id uuid,_guest_id uuid,_details jsonb,_additional jsonb DEFAULT '[]'::jsonb)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT public.save_guest_details_form_authorized(_event_id,_guest_id,_details,_additional,NULL);
$$;
REVOKE ALL ON FUNCTION public.get_guest_details_form(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_guest_details_form(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_guest_details_form(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_guest_details_form(uuid,uuid,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_guest_rsvp_public(_guest_id uuid, _event_id uuid, _rsvp text DEFAULT NULL::text, _dietary text DEFAULT NULL::text, _mobile text DEFAULT NULL::text, _email text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _mailing_address text DEFAULT NULL::text, _mailing_suburb text DEFAULT NULL::text, _mailing_state text DEFAULT NULL::text, _mailing_postcode text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_exists BOOLEAN;
  _collect_addresses BOOLEAN;
BEGIN
  IF NOT public.can_manage_guest_details(_event_id) THEN
    RAISE EXCEPTION 'Guest invitation unavailable' USING ERRCODE='42501';
  END IF;
  -- Validate: event must exist and have QR live view enabled
  SELECT EXISTS(
    SELECT 1 FROM events
    WHERE id = _event_id
    AND (qr_apply_to_live_view = true OR public.can_manage_guest_details(_event_id))
  ) INTO _event_exists;

  IF NOT _event_exists THEN
    RETURN false;
  END IF;

  -- Validate: guest must belong to this event
  IF NOT EXISTS(
    SELECT 1 FROM guests
    WHERE id = _guest_id
    AND event_id = _event_id
  ) THEN
    RETURN false;
  END IF;

  -- Only allow address writes when event has the toggle on; otherwise ignore them
  SELECT COALESCE(collect_guest_addresses, false) INTO _collect_addresses
  FROM events WHERE id = _event_id;

  IF NOT _collect_addresses THEN
    _mailing_address := NULL;
    _mailing_suburb := NULL;
    _mailing_state := NULL;
    _mailing_postcode := NULL;
  END IF;

  -- Perform the update (only non-null values), and recompute address_received
  UPDATE guests SET
    rsvp = COALESCE(_rsvp, rsvp),
    dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile),
    email = COALESCE(_email, email),
    notes = COALESCE(_notes, notes),
    mailing_address = COALESCE(_mailing_address, mailing_address),
    mailing_suburb = COALESCE(_mailing_suburb, mailing_suburb),
    mailing_state = COALESCE(_mailing_state, mailing_state),
    mailing_postcode = COALESCE(_mailing_postcode, mailing_postcode),
    address_received = CASE
      WHEN _collect_addresses THEN (
        COALESCE(NULLIF(btrim(COALESCE(_mailing_address, mailing_address)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_suburb, mailing_suburb)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_state, mailing_state)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_postcode, mailing_postcode)), ''), '') <> ''
      )
      ELSE address_received
    END,
    rsvp_date = CASE WHEN _rsvp IS NOT NULL THEN CURRENT_DATE ELSE rsvp_date END
  WHERE id = _guest_id AND event_id = _event_id;

  -- Log the change
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _guest_id, jsonb_build_object(
    'rsvp', _rsvp,
    'dietary', _dietary,
    'mobile', _mobile,
    'email', _email,
    'notes', _notes,
    'mailing_address', _mailing_address,
    'mailing_suburb', _mailing_suburb,
    'mailing_state', _mailing_state,
    'mailing_postcode', _mailing_postcode
  ), 'public_live_view');

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_guest_rsvp_public(uuid,uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_guest_rsvp_public(uuid,uuid,text,text,text,text,text,text,text,text,text) TO authenticated;
