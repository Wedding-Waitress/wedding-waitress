-- Verification destinations are organiser-managed and separate from guest-submitted contact edits.
create table private.qr_guest_contact_destinations (
 guest_id uuid primary key references public.guests(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 mobile text, updated_at timestamptz not null default now()
);
alter table private.qr_guest_contact_destinations enable row level security;
revoke all on private.qr_guest_contact_destinations from public,anon,authenticated;
insert into private.qr_guest_contact_destinations(guest_id,event_id,mobile)
 select id,event_id,private.qr_recorded_mobile(mobile) from public.guests;

create function private.qr_guest_recorded_mobile(_guest_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select mobile from private.qr_guest_contact_destinations where guest_id=_guest_id;
$$;
revoke all on function private.qr_guest_recorded_mobile(uuid) from public,anon,authenticated;

create function private.qr_capture_organiser_mobile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('app.qr_guest_write',true),'')='true' then return new; end if;
 if coalesce(auth.jwt()->>'role','')='service_role'
 or (auth.uid() is not null and public.can_manage_guest_details(new.event_id)) then
  insert into private.qr_guest_contact_destinations(guest_id,event_id,mobile,updated_at)
  values(new.id,new.event_id,private.qr_recorded_mobile(new.mobile),now())
  on conflict(guest_id) do update set event_id=excluded.event_id,mobile=excluded.mobile,updated_at=excluded.updated_at;
 end if;
 return new;
end $$;
revoke all on function private.qr_capture_organiser_mobile() from public,anon,authenticated;
create trigger qr_capture_organiser_mobile after insert or update of mobile on public.guests
 for each row execute function private.qr_capture_organiser_mobile();


CREATE OR REPLACE FUNCTION public.qr_guest_reserve(_event_id uuid, _guest_id uuid, _full_name text, _request_id uuid, _ip_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 p:=private.qr_guest_recorded_mobile(g.id); if p is null then return null; end if;
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
end $function$;

CREATE OR REPLACE FUNCTION private.qr_session_anchor(_event_id uuid, _token text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 and s.phone_hash=encode(extensions.digest(private.qr_guest_recorded_mobile(g.id),'sha256'),'hex');
 return anchor;
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_claim_check(_id uuid, _lease uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c private.qr_guest_challenges%rowtype; g public.guests%rowtype; e public.events%rowtype; p text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 select * into c from private.qr_guest_challenges where id=_id for update;
 if c.id is null or c.state<>'pending' or c.expires_at<=now() or c.attempts>=5
 or c.check_started_at>now()-interval '20 seconds' then return null; end if;
 select * into e from public.events where id=c.event_id;
 select * into g from public.guests where id=c.guest_id and event_id=c.event_id;
 p:=private.qr_guest_recorded_mobile(g.id);
 if not private.qr_invitation_phase(e) or p is null or c.phone_hash<>encode(extensions.digest(p,'sha256'),'hex')
 or c.family_group is distinct from nullif(btrim(g.family_group),'') then return null; end if;
 update private.qr_guest_challenges set attempts=attempts+1,check_lease=_lease,check_started_at=now() where id=_id;
 return jsonb_build_object('reference',c.provider_reference,'mobile',p,'event_id',c.event_id);
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_save_details(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb DEFAULT '[]'::jsonb, _access_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare prior_guest_write text; anchor guests%rowtype; ctx jsonb; e events%rowtype; g guests%rowtype; item jsonb; new_id uuid; group_name text; group_id uuid; group_ids uuid[]; n int; p text; r text; display text; roles jsonb; custom_name text;
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
 prior_guest_write:=coalesce(current_setting('app.qr_guest_write',true),'');
 if nullif(_access_token,'') is not null then perform set_config('app.qr_guest_write','true',true); end if;
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
 perform set_config('app.qr_guest_write',prior_guest_write,true);
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.qr_guest_complete_check(_id uuid, _lease uuid, _approved boolean, _token_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c private.qr_guest_challenges%rowtype; e public.events%rowtype; g public.guests%rowtype; expiry timestamptz;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 select * into c from private.qr_guest_challenges where id=_id for update;
 if c.id is null or c.state<>'pending' or c.check_lease is distinct from _lease then return null; end if;
 update private.qr_guest_challenges set check_lease=null,check_started_at=null where id=_id;
 if not coalesce(_approved,false) or _token_hash !~ '^[a-f0-9]{64}$' or c.expires_at<=now() then return null; end if;
 select * into e from public.events where id=c.event_id;
 select * into g from public.guests where id=c.guest_id and event_id=c.event_id;
 if not private.qr_invitation_phase(e) or c.phone_hash is distinct from encode(extensions.digest(private.qr_guest_recorded_mobile(g.id),'sha256'),'hex')
 or c.family_group is distinct from nullif(btrim(g.family_group),'') then return null; end if;
 expiry:=least(now()+interval '2 hours',(e.date-7)::timestamp at time zone e.event_timezone);
 insert into private.qr_guest_sessions(token_hash,event_id,guest_id,phone_hash,family_group,expires_at)
 values(_token_hash,c.event_id,c.guest_id,c.phone_hash,c.family_group,expiry);
 update private.qr_guest_challenges set state='approved' where id=_id;
 return jsonb_build_object('expires_at',expiry,'guest_id',g.id);
end $function$;

CREATE OR REPLACE FUNCTION public.save_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb DEFAULT '[]'::jsonb, _access_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare prior_guest_write text; anchor guests%rowtype; ctx jsonb; e events%rowtype; g guests%rowtype; item jsonb; new_id uuid; group_name text; group_id uuid; group_ids uuid[]; n int; p text; r text; display text; roles jsonb; custom_name text;
begin
 ctx := public.get_guest_details_form_authorized(_event_id,_guest_id,_access_token);
 select * into e from events where id=_event_id for update;
 select * into g from guests where id=_guest_id and event_id=_event_id for update;
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
  select recipient.* into anchor from guest_access_tokens t
  join guests recipient on recipient.id=t.guest_id and recipient.event_id=t.event_id
  where t.event_id=_event_id and t.access_token=_access_token and t.expires_at>now();
  if anchor.id is null then raise exception 'Guest invitation unavailable' using errcode='42501'; end if;
 end if;
 n := jsonb_array_length(_additional);
 if n>0 and not (public.get_guest_details_form_authorized(_event_id,anchor.id,_access_token)->>'can_add')::boolean then raise exception 'Additional guests are not permitted'; end if;
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
 prior_guest_write:=coalesce(current_setting('app.qr_guest_write',true),'');
 if nullif(_access_token,'') is not null then perform set_config('app.qr_guest_write','true',true); end if;
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
 perform set_config('app.qr_guest_write',prior_guest_write,true);
 return true;
end $function$;