-- Preserve schema-required empty relation fields; authorization and other saved fields unchanged.
CREATE OR REPLACE FUNCTION public.save_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb DEFAULT '[]'::jsonb, _access_token text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare anchor guests%rowtype; ctx jsonb; e events%rowtype; g guests%rowtype; item jsonb; new_id uuid; group_name text; group_id uuid; group_ids uuid[]; n int; p text; r text; display text; roles jsonb; custom_name text;
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
