-- Guest verification capabilities are separate from personal invitation links.
create schema if not exists private;
create table private.qr_guest_challenges (
 id uuid primary key, event_id uuid not null references public.events(id) on delete cascade,
 guest_id uuid not null references public.guests(id) on delete cascade,
 ip_hash text not null, phone_hash text not null, family_group text,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes',
 state text not null default 'reserved' check(state in ('reserved','pending','unknown','failed','approved')),
 provider_reference text, attempts integer not null default 0 check(attempts between 0 and 5),
 check_lease uuid, check_started_at timestamptz, refunded_at timestamptz
);
create index qr_guest_challenges_event_time on private.qr_guest_challenges(event_id,created_at);
create index qr_guest_challenges_ip_time on private.qr_guest_challenges(ip_hash,created_at);
create index qr_guest_challenges_guest_time on private.qr_guest_challenges(guest_id,created_at);
create table private.qr_guest_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 event_id uuid not null references public.events(id) on delete cascade,
 guest_id uuid not null references public.guests(id) on delete cascade,
 phone_hash text not null, family_group text,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 revoked_at timestamptz,
 check(expires_at>created_at and expires_at<=created_at+interval '2 hours')
);
alter table private.qr_guest_challenges enable row level security;
alter table private.qr_guest_sessions enable row level security;
revoke all on private.qr_guest_challenges, private.qr_guest_sessions from public,anon,authenticated;

create function private.qr_recorded_mobile(value text) returns text language plpgsql immutable set search_path='' as $$
declare p text;
begin
 if value is null or length(value)>80 then return null; end if;
 p:=regexp_replace(value,'[[:space:]().-]','','g');
 if p ~ '^04[0-9]{8}$' then p:='+61'||substr(p,2);
 elsif p ~ '^614[0-9]{8}$' then p:='+'||p; end if;
 if p ~ '^\+[1-9][0-9]{7,14}$' then return p; end if;
 return null;
end $$;

create function private.qr_invitation_phase(e public.events) returns boolean language plpgsql stable set search_path='' as $$
begin
 if e.date is null or nullif(e.event_timezone,'') is null or e.qr_apply_to_live_view is not true then return false; end if;
 return e.date-(now() at time zone e.event_timezone)::date>7;
exception when invalid_parameter_value then return false;
end $$;

create function public.qr_guest_app_clock(_event_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e public.events%rowtype; cutoff timestamptz;
begin
 select * into e from public.events where id=_event_id and qr_apply_to_live_view=true;
 if e.id is null then return null; end if;
 if e.date is not null and exists(select 1 from pg_timezone_names where name=e.event_timezone) then
  cutoff:=(e.date-7)::timestamp at time zone e.event_timezone;
 end if;
 return jsonb_build_object('phase',case when private.qr_invitation_phase(e) then 'invitation' else 'seating' end,
 'event_timezone',e.event_timezone,'server_now',now(),
 'cutoff',cutoff);
end $$;
revoke all on function public.qr_guest_app_clock(uuid) from public;
grant execute on function public.qr_guest_app_clock(uuid) to anon,authenticated,service_role;

create function private.qr_session_anchor(_event_id uuid,_token text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare anchor uuid;
begin
 if _token is null or _token !~ '^[a-f0-9]{64}$' then return null; end if;
 select g.id into anchor from private.qr_guest_sessions s
 join public.guests g on g.id=s.guest_id and g.event_id=s.event_id
 join public.events e on e.id=s.event_id
 where s.token_hash=encode(extensions.digest(_token,'sha256'),'hex') and s.event_id=_event_id
 and s.revoked_at is null and s.created_at<=now() and s.expires_at>now()
 and s.expires_at<=s.created_at+interval '2 hours' and private.qr_invitation_phase(e)
 and s.family_group is not distinct from nullif(btrim(g.family_group),'')
 and s.phone_hash=encode(extensions.digest(private.qr_recorded_mobile(g.mobile),'sha256'),'hex');
 return anchor;
end $$;

create function private.qr_session_allows(_event_id uuid,_guest_id uuid,_token text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.guests anchor join public.guests target on target.event_id=anchor.event_id
 where anchor.id=private.qr_session_anchor(_event_id,_token) and target.id=_guest_id
 and (target.id=anchor.id or (nullif(btrim(anchor.family_group),'') is not null and target.family_group=anchor.family_group)));
$$;

-- Service-only. Serializes event and IP reservations with invitation credit consumption.
create function public.qr_guest_reserve(_event_id uuid,_guest_id uuid,_full_name text,_request_id uuid,_ip_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.events%rowtype; g public.guests%rowtype; c private.qr_guest_challenges%rowtype; p text; affected int;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 if _ip_hash !~ '^[a-f0-9]{64}$' or length(_full_name)>220 then return null; end if;
 perform pg_advisory_xact_lock(hashtextextended('qr-ip:'||_ip_hash,0));
 select * into e from public.events where id=_event_id for update;
 if not coalesce(private.qr_invitation_phase(e),false) then return null; end if;
 if public.is_account_operational(e.user_id) is not true then return null; end if;
 select * into c from private.qr_guest_challenges where id=_request_id;
 if c.id is not null then return jsonb_build_object('duplicate',true); end if;
 select * into g from public.guests where id=_guest_id and event_id=_event_id;
 if g.id is null or lower(regexp_replace(btrim(_full_name),'[[:space:]]+',' ','g'))
 is distinct from lower(regexp_replace(btrim(g.first_name||' '||g.last_name),'[[:space:]]+',' ','g')) then return null; end if;
 p:=private.qr_recorded_mobile(g.mobile); if p is null then return null; end if;
 if exists(select 1 from private.qr_guest_challenges where guest_id=g.id and created_at>now()-interval '60 seconds')
 or (select count(*) from private.qr_guest_challenges where guest_id=g.id and created_at>now()-interval '1 hour')>=5
 or (select count(*) from private.qr_guest_challenges where ip_hash=_ip_hash and created_at>now()-interval '1 hour')>=30
 or (select count(*) from private.qr_guest_challenges where event_id=e.id and created_at>now()-interval '1 hour')>=300 then return null; end if;
 update public.sms_credits set used=used+1,updated_at=now() where user_id=e.user_id and event_id=e.id and remaining>0;
 get diagnostics affected=row_count;
 if affected<>1 then return null; end if;
 insert into private.qr_guest_challenges(id,event_id,guest_id,ip_hash,phone_hash,family_group)
 values(_request_id,e.id,g.id,_ip_hash,encode(extensions.digest(p,'sha256'),'hex'),nullif(btrim(g.family_group),''));
 return jsonb_build_object('id',_request_id,'mobile',p);
end $$;

create function public.qr_guest_send_result(_id uuid,_reference text,_outcome text) returns boolean
language plpgsql security definer set search_path='' as $$
declare c private.qr_guest_challenges%rowtype;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 select * into c from private.qr_guest_challenges where id=_id for update;
 if c.state is distinct from 'reserved' then return false; end if;
 if _outcome='pending' and _reference ~ '^VE[a-fA-F0-9]{32}$' then
  update private.qr_guest_challenges set state='pending',provider_reference=_reference where id=_id;
 elsif _outcome='rejected' then
  update public.sms_credits sc set used=greatest(sc.used-1,0),updated_at=now()
   from public.events e where e.id=c.event_id and sc.event_id=e.id and sc.user_id=e.user_id;
  update private.qr_guest_challenges set state='failed',refunded_at=now() where id=_id;
 else
  -- Unknown acceptance retains the reservation. Never retry or blindly refund a possibly billable send.
  update private.qr_guest_challenges set state='unknown' where id=_id;
 end if;
 return true;
end $$;

create function public.qr_guest_claim_check(_id uuid,_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.qr_guest_challenges%rowtype; g public.guests%rowtype; e public.events%rowtype; p text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 select * into c from private.qr_guest_challenges where id=_id for update;
 if c.id is null or c.state<>'pending' or c.expires_at<=now() or c.attempts>=5
 or c.check_started_at>now()-interval '20 seconds' then return null; end if;
 select * into e from public.events where id=c.event_id;
 select * into g from public.guests where id=c.guest_id and event_id=c.event_id;
 p:=private.qr_recorded_mobile(g.mobile);
 if not private.qr_invitation_phase(e) or p is null or c.phone_hash<>encode(extensions.digest(p,'sha256'),'hex')
 or c.family_group is distinct from nullif(btrim(g.family_group),'') then return null; end if;
 update private.qr_guest_challenges set attempts=attempts+1,check_lease=_lease,check_started_at=now() where id=_id;
 return jsonb_build_object('reference',c.provider_reference,'mobile',p,'event_id',c.event_id);
end $$;

create function public.qr_guest_complete_check(_id uuid,_lease uuid,_approved boolean,_token_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.qr_guest_challenges%rowtype; e public.events%rowtype; g public.guests%rowtype; expiry timestamptz;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 select * into c from private.qr_guest_challenges where id=_id for update;
 if c.id is null or c.state<>'pending' or c.check_lease is distinct from _lease then return null; end if;
 update private.qr_guest_challenges set check_lease=null,check_started_at=null where id=_id;
 if not coalesce(_approved,false) or _token_hash !~ '^[a-f0-9]{64}$' or c.expires_at<=now() then return null; end if;
 select * into e from public.events where id=c.event_id;
 select * into g from public.guests where id=c.guest_id and event_id=c.event_id;
 if not private.qr_invitation_phase(e) or c.phone_hash is distinct from encode(extensions.digest(private.qr_recorded_mobile(g.mobile),'sha256'),'hex')
 or c.family_group is distinct from nullif(btrim(g.family_group),'') then return null; end if;
 expiry:=least(now()+interval '2 hours',(e.date-7)::timestamp at time zone e.event_timezone);
 insert into private.qr_guest_sessions(token_hash,event_id,guest_id,phone_hash,family_group,expires_at)
 values(_token_hash,c.event_id,c.guest_id,c.phone_hash,c.family_group,expiry);
 update private.qr_guest_challenges set state='approved' where id=_id;
 return jsonb_build_object('expires_at',expiry,'guest_id',g.id);
end $$;

create function public.qr_guest_verified_party(_event_id uuid,_session text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare anchor uuid; result jsonb;
begin
 anchor:=private.qr_session_anchor(_event_id,_session);
 if anchor is null then raise exception 'Verification required' using errcode='42501'; end if;
 select jsonb_agg(jsonb_build_object('id',g.id,'event_id',g.event_id,'first_name',g.first_name,'last_name',g.last_name,
 'table_id',g.table_id,'table_no',g.table_no,'seat_no',g.seat_no,'rsvp',g.rsvp,'dietary',g.dietary,
 'mobile',g.mobile,'email',g.email,'notes',g.notes,'family_group',g.family_group,
 'relation_display',g.relation_display,'allow_plus_one',g.allow_plus_one,'added_by_guest_id',g.added_by_guest_id,
 'mailing_address',g.mailing_address,'mailing_suburb',g.mailing_suburb,'mailing_state',g.mailing_state,'mailing_postcode',g.mailing_postcode)
 order by g.created_at,g.id) into result from public.guests g where g.event_id=_event_id and private.qr_session_allows(_event_id,g.id,_session);
 return jsonb_build_object('guest_id',anchor,'guests',coalesce(result,'[]'::jsonb));
end $$;
revoke all on function public.qr_guest_verified_party(uuid,text) from public;
grant execute on function public.qr_guest_verified_party(uuid,text) to anon,authenticated,service_role;

revoke all on function public.qr_guest_reserve(uuid,uuid,text,uuid,text),public.qr_guest_send_result(uuid,text,text),
public.qr_guest_claim_check(uuid,uuid),public.qr_guest_complete_check(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.qr_guest_reserve(uuid,uuid,text,uuid,text),public.qr_guest_send_result(uuid,text,text),
public.qr_guest_claim_check(uuid,uuid),public.qr_guest_complete_check(uuid,uuid,boolean,text) to service_role;
revoke all on function private.qr_recorded_mobile(text),private.qr_invitation_phase(public.events),
private.qr_session_anchor(uuid,text),private.qr_session_allows(uuid,uuid,text) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.qr_guest_details(_event_id uuid, _guest_id uuid, _access_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare e events%rowtype; g guests%rowtype; m live_view_module_settings%rowtype; locked boolean; editable boolean; manager boolean;
begin
 manager := false;
 IF NOT manager AND NOT private.qr_session_allows(_event_id,_guest_id,_access_token) THEN
 RAISE EXCEPTION 'Verification required' USING ERRCODE='42501'; END IF;
 select * into e from events where id=_event_id and (qr_apply_to_live_view=true or manager);
 select * into g from guests where id=_guest_id and event_id=_event_id;
 if e.id is null or g.id is null then raise exception 'Guest invitation unavailable'; end if;
 select * into m from live_view_module_settings where event_id=e.id;
 locked := NOT private.qr_invitation_phase(e);
 editable := e.rsvp_deadline is null or (now() at time zone coalesce(e.event_timezone,'Australia/Sydney'))::date <= (e.rsvp_deadline at time zone coalesce(e.event_timezone,'Australia/Sydney'))::date;
 return jsonb_build_object(
  'guest', jsonb_build_object('first_name',g.first_name,'last_name',g.last_name,'email',g.email,'mobile',g.mobile,'dietary',g.dietary,'notes',g.notes,'rsvp',g.rsvp,'table_no',g.table_no,'seat_no',g.seat_no,'family_group',g.family_group,'relation_partner',g.relation_partner,'relation_role',g.relation_role,'relation_display',g.relation_display,'mailing_address',g.mailing_address,'mailing_suburb',g.mailing_suburb,'mailing_state',g.mailing_state,'mailing_postcode',g.mailing_postcode),
  'partner1_name',coalesce(nullif(e.partner1_name,''),'Bride'),'partner2_name',coalesce(nullif(e.partner2_name,''),'Groom'),
  'relation_mode',coalesce(e.relation_mode,'two'),'custom_roles',coalesce(e.custom_roles,'[]'::jsonb),'allow_custom',coalesce(e.relation_allow_custom_role,false),
  'is_manager',manager,
  'can_edit',manager or editable and not locked,
  'can_rsvp',manager or editable and not locked,
  'can_add',editable and coalesce(e.allow_guest_plus_ones,false) and coalesce(g.allow_plus_one,true) and not locked,
  'allow_name_edit',manager or coalesce((m.update_details_config->>'allow_name_edit')::boolean,false));
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_save_details(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb DEFAULT '[]'::jsonb, _access_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare anchor guests%rowtype; ctx jsonb; e events%rowtype; g guests%rowtype; item jsonb; new_id uuid; group_name text; group_id uuid; group_ids uuid[]; n int; p text; r text; display text; roles jsonb; custom_name text;
begin
 ctx := public.qr_guest_details(_event_id,_guest_id,_access_token);
 select * into e from events where id=_event_id for update;
 select * into g from guests where id=_guest_id and event_id=_event_id for update;
 ctx := public.qr_guest_details(_event_id,_guest_id,_access_token);
 if not (ctx->>'can_edit')::boolean then raise exception 'Guest updates are currently closed'; end if;
 if jsonb_typeof(_details) is distinct from 'object' or jsonb_typeof(_additional) is distinct from 'array' then raise exception 'Invalid guest details'; end if;
 if _details ?| array['table_id','table_no','seat_no','assigned','user_id','family_group'] then raise exception 'Only the organiser can assign tables and seats'; end if;
 if nullif(_details->>'rsvp','') is not null and _details->>'rsvp' not in ('Pending','Attending','Not Attending') then raise exception 'Invalid RSVP'; end if;
 if coalesce(_details->>'rsvp',g.rsvp) is distinct from g.rsvp and not (ctx->>'can_rsvp')::boolean then raise exception 'RSVP changes are currently closed'; end if;
 anchor := g;
 if (ctx->>'is_manager')::boolean and nullif(_details->>'_invitation_guest_id','') is not null then
  select * into anchor from guests where id=(_details->>'_invitation_guest_id')::uuid and event_id=_event_id
    and (id=g.id or (nullif(btrim(g.family_group),'') is not null and family_group=g.family_group));
  if anchor.id is null then raise exception 'Guest invitation unavailable' using errcode='42501'; end if;
 end if;
 if nullif(_access_token,'') is not null then
  select * into anchor from guests where id=private.qr_session_anchor(_event_id,_access_token) and event_id=_event_id;
  if anchor.id is null then raise exception 'Verification required' using errcode='42501'; end if;
 end if;
 n := jsonb_array_length(_additional);
 if n>0 and not (public.qr_guest_details(_event_id,anchor.id,_access_token)->>'can_add')::boolean then raise exception 'Additional guests are not permitted'; end if;
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
 update guests set relation_partner=coalesce(p,''),relation_role=coalesce(r,''),relation_display=coalesce(display,''), first_name=case when (ctx->>'allow_name_edit')::boolean then btrim(coalesce(_details->>'first_name',g.first_name)) else first_name end,last_name=case when (ctx->>'allow_name_edit')::boolean then btrim(coalesce(_details->>'last_name',g.last_name)) else last_name end where id=_guest_id;
 if roles is distinct from e.custom_roles then update events set custom_roles=roles where id=_event_id; end if;
 group_name:=nullif(anchor.family_group,'');
 select array_agg(id) into group_ids from guests where event_id=_event_id and (id=anchor.id or (group_name is not null and family_group=group_name));
 for item in select value from jsonb_array_elements(_additional) loop
  if item ?| array['table_id','table_no','seat_no','assigned','user_id'] then raise exception 'Only the organiser can assign tables and seats'; end if;
  if nullif(btrim(item->>'first_name'),'') is null or nullif(btrim(item->>'last_name'),'') is null or length(item->>'first_name')>100 or length(item->>'last_name')>100 then raise exception 'Every additional guest needs a first and last name'; end if;
  if coalesce(item->>'group_choice','') not in ('separate','group') then raise exception 'Choose whether each guest is separate or part of your group'; end if;
  insert into guests(event_id,user_id,first_name,last_name,mobile,email,dietary,notes,rsvp,added_by_guest_id)
   values(_event_id,e.user_id,btrim(item->>'first_name'),btrim(item->>'last_name'),nullif(item->>'mobile',''),nullif(item->>'email',''),coalesce(item->>'dietary','NA'),nullif(item->>'notes',''),'Pending',anchor.id) returning id into new_id;
  if item->>'group_choice'='group' then group_ids:=array_append(group_ids,new_id); end if;
  insert into guest_update_logs(event_id,guest_id,payload,changed_by) values(_event_id,new_id,jsonb_build_object('action','add_guest','added_by_guest_id',anchor.id,'group_choice',item->>'group_choice'),'public_live_view');
 end loop;
 if cardinality(group_ids)>(select count(*) from guests where event_id=_event_id and (id=anchor.id or (group_name is not null and family_group=group_name))) then
  select id into group_id from family_groups where event_id=_event_id and name=group_name limit 1;
  if group_name is null then group_name:=anchor.last_name||' '||case when cardinality(group_ids)=2 then 'Couple' else 'Family' end||' ('||left(anchor.id::text,8)||')';
  elsif cardinality(group_ids)>2 then group_name:=regexp_replace(group_name,'Couple','Family','gi'); end if;
  if group_id is null then insert into family_groups(event_id,name) values(_event_id,group_name) returning id into group_id;
  else update family_groups set name=group_name where id=group_id; end if;
  update guests set family_group=group_name where id=any(group_ids) and event_id=_event_id;
  insert into family_group_members(group_id,guest_id) select group_id,unnest(group_ids) on conflict do nothing;
 end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_save_rsvps(_access_token text, _responses jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $function$
declare session_event uuid; response jsonb; target uuid; ctx jsonb;
begin
 if jsonb_typeof(_responses) is distinct from 'array' or jsonb_array_length(_responses)>20 then raise exception 'Invalid RSVP response list'; end if;
 select s.event_id into session_event from private.qr_guest_sessions s where s.token_hash=encode(extensions.digest(_access_token,'sha256'),'hex');
 if session_event is null then raise exception 'Verification required' using errcode='42501'; end if;
 -- Serialize the policy check and writes with event changes.
 perform 1 from public.events where id=session_event for update;
 for response in select value from jsonb_array_elements(_responses) loop
  target:=nullif(response->>'guest_id','')::uuid;
  ctx:=public.qr_guest_details(session_event,target,_access_token);
  if not coalesce((ctx->>'can_rsvp')::boolean,false) or response->>'rsvp' not in ('Pending','Attending','Not Attending') then raise exception 'RSVP changes are currently closed'; end if;
  update public.guests set rsvp=response->>'rsvp',rsvp_date=current_date where id=target and event_id=session_event;
 end loop;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_public_event(event_slug text, access_token text DEFAULT NULL::text)
 RETURNS TABLE(event_id uuid, event_name text, event_date text, event_venue text, event_start_time text, event_finish_time text, partner1_name text, partner2_name text, ceremony_venue text, ceremony_start_time text, ceremony_finish_time text, guest_id uuid, guest_first_name text, guest_last_name text, guest_table_no integer, guest_table_id uuid, guest_seat_no integer, guest_rsvp text, guest_dietary text, show_rsvp_invite boolean, show_welcome_video boolean, rsvp_invite_config jsonb, welcome_video_config jsonb, show_floor_plan boolean, show_menu boolean, floor_plan_config jsonb, menu_config jsonb, hero_image_config jsonb, guest_added_by_guest_id uuid, show_reception_floor_plan boolean, reception_floor_plan_config jsonb, guest_family_group text, guest_allow_plus_one boolean, event_venue_address text, ceremony_venue_address text, kiosk_show_rsvp_status boolean, kiosk_show_dietary boolean, event_allow_guest_plus_ones boolean, event_collect_guest_addresses boolean, guest_mailing_address text, guest_mailing_suburb text, guest_mailing_state text, guest_mailing_postcode text, guest_address_received boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH recipient AS (
    SELECT gat.event_id, gat.guest_id, rg.family_group
    FROM public.guest_access_tokens gat
    JOIN public.guests rg ON rg.id = gat.guest_id AND rg.event_id = gat.event_id
    WHERE gat.access_token = qr_guest_public_event.access_token AND gat.expires_at > now()
  )
  SELECT
    e.id, e.name,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.date::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.venue ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.start_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.finish_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_partner_names, true) THEN e.partner1_name ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_partner_names, true) THEN e.partner2_name ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.ceremony_venue ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.ceremony_start_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.ceremony_finish_time::text ELSE NULL END,
    g.id, g.first_name, g.last_name, CASE WHEN private.qr_invitation_phase(e) THEN NULL ELSE g.table_no END, CASE WHEN private.qr_invitation_phase(e) THEN NULL ELSE g.table_id END, CASE WHEN private.qr_invitation_phase(e) THEN NULL ELSE g.seat_no END, CASE WHEN private.qr_invitation_phase(e) THEN NULL ELSE g.rsvp END, CASE WHEN private.qr_invitation_phase(e) THEN NULL ELSE g.dietary END,
    COALESCE(lvs.show_rsvp_invite, false), COALESCE(lvs.show_welcome_video, false),
    lvms.rsvp_invite_config, lvms.welcome_video_config, COALESCE(lvs.show_floor_plan, false),
    COALESCE(lvs.show_menu, false), lvms.floor_plan_config, lvms.menu_config, lvms.hero_image_config,
    NULL::uuid, COALESCE(lvs.show_reception_floor_plan, false), lvms.reception_floor_plan_config,
    NULL::text, NULL::boolean,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.venue_address ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.ceremony_venue_address ELSE NULL END,
    COALESCE(lvs.kiosk_show_rsvp_status, true), COALESCE(lvs.kiosk_show_dietary, true),
    COALESCE(e.allow_guest_plus_ones, false), COALESCE(e.collect_guest_addresses, false),
    -- Postal addresses are private invitation data, never public QR seating data.
    NULL::text,
    NULL::text,
    NULL::text,
    NULL::text,
    false
  FROM public.events e
  LEFT JOIN LATERAL (
    SELECT ordered_guest.*, row_number() OVER () AS invitation_order
    FROM (
      SELECT event_guest.*
      FROM public.guests event_guest
      WHERE event_guest.event_id = e.id
      ORDER BY event_guest.created_at
    ) ordered_guest
  ) g ON true
  LEFT JOIN public.live_view_settings lvs ON lvs.event_id = e.id
  LEFT JOIN public.live_view_module_settings lvms ON lvms.event_id = e.id
  WHERE e.slug = qr_guest_public_event.event_slug
    AND e.qr_apply_to_live_view = true
  ORDER BY g.invitation_order;
$function$;

CREATE OR REPLACE FUNCTION public.qr_guest_invite_recipient(_access_token text)
 RETURNS TABLE(guest_id uuid, first_name text, last_name text, table_no integer, seat_no integer, rsvp text, dietary text, event_name text, event_date date, event_venue text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT g.id,g.first_name,g.last_name,case when private.qr_invitation_phase(e) then null else g.table_no end,case when private.qr_invitation_phase(e) then null else g.seat_no end,case when private.qr_invitation_phase(e) then null else g.rsvp end,case when private.qr_invitation_phase(e) then null else g.dietary end,e.name,e.date,e.venue
 FROM public.guest_access_tokens gat
 JOIN public.guests g ON g.id=gat.guest_id AND g.event_id=gat.event_id
 JOIN public.events e ON e.id=gat.event_id
 WHERE gat.access_token=_access_token AND gat.expires_at>now() AND e.qr_apply_to_live_view=true;
$function$;
revoke all on function public.qr_guest_details(uuid,uuid,text),public.qr_guest_save_details(uuid,uuid,jsonb,jsonb,text),public.qr_guest_save_rsvps(text,jsonb),public.qr_guest_public_event(text,text),public.qr_guest_invite_recipient(text) from public;
grant execute on function public.qr_guest_details(uuid,uuid,text),public.qr_guest_save_details(uuid,uuid,jsonb,jsonb,text),public.qr_guest_save_rsvps(text,jsonb),public.qr_guest_public_event(text,text),public.qr_guest_invite_recipient(text) to anon,authenticated,service_role;

