-- Rule one only. No account closure, entitlements, billing or notification changes.
alter table public.admin_account_controls add column customer_reason text;
alter table public.admin_account_controls add constraint suspension_customer_reason_length
 check(customer_reason is null or length(btrim(customer_reason)) between 5 and 2000);

create table private.suspension_identifiers (
 account_owner_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('email','verified_phone','reported_phone','full_name')),
 value text not null,
 primary key(account_owner_id,kind,value)
);
create table private.signup_access_reviews (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved')),
 match_kind text not null check(match_kind in ('full_name','reported_phone')),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 matched_owner_ids uuid[] not null default '{}'
);
alter table private.suspension_identifiers enable row level security;
alter table private.signup_access_reviews enable row level security;
revoke all on private.suspension_identifiers,private.signup_access_reviews from public,anon,authenticated;

create function private.suspension_normalize_name(value text) returns text
 language sql immutable set search_path=pg_catalog as $$
 select lower(regexp_replace(btrim(normalize(coalesce(value,''),NFKC)),'\s+',' ','g') collate "und-x-icu");
$$;
-- International input is preserved. AU national numbers are recognised only
-- with an explicit AU country context. No ambiguous other-country conversion.
create function private.suspension_normalize_phone(value text,country text default null) returns text
 language sql immutable set search_path=pg_catalog as $$
 select case
  when btrim(coalesce(value,'')) ~ '^\+' then '+'||regexp_replace(value,'[^0-9]','','g')
  when upper(coalesce(country,''))='AU' and regexp_replace(value,'[^0-9]','','g') ~ '^0[0-9]{9}$'
   then '+61'||substr(regexp_replace(value,'[^0-9]','','g'),2)
  when regexp_replace(coalesce(value,''),'[^0-9]','','g')<>''
   then 'national:'||regexp_replace(value,'[^0-9]','','g')
  else null end;
$$;

create function private.account_planning_blocked(p_user uuid) returns boolean
 language sql stable security definer set search_path=pg_catalog,public,private as $$
 select p_user is not null and (
 exists(select 1 from public.admin_account_controls where account_owner_id=p_user and status='suspended')
 or exists(select 1 from private.signup_access_reviews where user_id=p_user and status='pending')
 or exists(select 1 from public.account_members m join public.admin_account_controls c on c.account_owner_id=m.account_owner_id
   where m.member_user_id=p_user and m.accepted_at is not null and m.access_disabled_at is null and c.status='suspended')
 );
$$;
revoke all on function private.account_planning_blocked(uuid) from public,anon;
grant execute on function private.account_planning_blocked(uuid) to authenticated,service_role;

-- PostgREST pre-request blocks tables, views, GraphQL and SECURITY DEFINER RPCs
-- for an authenticated suspended identity before their handler can execute.
-- Auth APIs remain usable for sign-out; the only Data API exceptions are own
-- notice/reply and the boolean used by already-guarded Edge handlers.
create function public.guard_suspended_data_request() returns void
 language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
 if auth.role()='authenticated' and private.account_planning_blocked(auth.uid())
   and coalesce(current_setting('request.path',true),'') not in
    ('/rpc/get_my_account_access','/rpc/reply_to_account_suspension','/rpc/is_account_operational') then
  raise exception 'Account planning access is unavailable.' using errcode='42501';
 end if;
end; $$;
revoke all on function public.guard_suspended_data_request() from public;
-- PostgREST invokes its pre-request hook for public requests as well. Granting
-- this no-result guard does not expose data; its authenticated check is inside.
grant execute on function public.guard_suspended_data_request() to anon,authenticated,service_role;
do $$ begin
 if exists(select 1 from pg_roles where rolname='authenticator' and exists(
  select 1 from unnest(coalesce(rolconfig,'{}'::text[])) c where c like 'pgrst.db_pre_request=%')) then
  raise exception 'Existing pre-request handler must be reviewed before this migration';
 end if;
end; $$;
alter role authenticator set pgrst.db_pre_request='public.guard_suspended_data_request';

-- RLS protects non-PostgREST access and the legacy permissive table policies.
-- These restrictions AND with existing owner/team rules, never replace them.
create policy "Suspension blocks table planning" on public.tables as restrictive for all to authenticated
 using(not private.account_planning_blocked((select auth.uid())))
 with check(not private.account_planning_blocked((select auth.uid())));
create policy "Suspension blocks storage access" on storage.objects as restrictive for all to authenticated
 using(not private.account_planning_blocked((select auth.uid())))
 with check(not private.account_planning_blocked((select auth.uid())));

-- Exact planning-table inventory; active ownership/team policies remain intact.
do $$ declare table_name text; begin
 foreach table_name in array array[
 'events','guests','event_budget_expenses','event_budget_settings','family_groups','family_group_members',
 'ceremony_floor_plans','floor_plans','reception_floor_plans','saved_venue_templates','floor_plan_share_tokens',
 'venue_floor_plan_templates','venue_floor_plan_requests','reception_collaborator_contacts','reception_collaborator_drafts',
 'ai_seating_suggestions','dietary_chart_settings','full_seating_chart_settings','invitation_card_settings',
 'invitation_designs','place_card_settings','qr_code_settings','qr_design_presets','dynamic_qr_codes','qr_scan_logs',
 'running_sheets','running_sheet_items','running_sheet_share_tokens','dj_mc_questionnaires','dj_mc_sections',
 'dj_mc_items','dj_mc_share_tokens','long_table_seat_arrangements','live_view_settings','live_view_module_settings',
 'guest_song_request_settings','guest_song_requests','guest_activities','guest_access_tokens','guest_access_attempts',
 'guest_communication_preferences','guest_addition_notification_preferences','guest_addition_notifications',
 'event_media_galleries','event_media_items','event_media_likes','event_media_limits','event_media_seq_counters',
 'event_media_upload_tokens','event_guestbook_messages','onboarding_drafts','sms_credits','sms_send_logs',
 'communication_credits','communication_usage','rsvp_invite_logs','rsvp_invite_purchases','notification_settings',
 'welcome_video_uploads','signage_settings','seating_chart_share_tokens','event_collaborators',
 'guest_update_logs','event_shortlinks','event_referral_dismissals','venue_invitations'
 ] loop
  if to_regclass(format('public.%I',table_name)) is null then raise exception 'Required planning table missing: %',table_name; end if;
  execute format('create policy "Suspension blocks planning access" on public.%I as restrictive for all to authenticated using(not private.account_planning_blocked((select auth.uid()))) with check(not private.account_planning_blocked((select auth.uid())))',table_name);
 end loop;
end; $$;

create function public.get_my_account_access() returns jsonb language plpgsql stable security definer
 set search_path=pg_catalog,public,private as $$
declare owner_id uuid; control public.admin_account_controls;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 owner_id:=auth.uid();
 if not exists(select 1 from public.admin_account_controls where account_owner_id=owner_id and status='suspended') then
  select m.account_owner_id into owner_id from public.account_members m join public.admin_account_controls c on c.account_owner_id=m.account_owner_id
   where m.member_user_id=auth.uid() and m.accepted_at is not null and m.access_disabled_at is null and c.status='suspended'
   order by m.invited_at limit 1;
 end if;
 select * into control from public.admin_account_controls where account_owner_id=owner_id and status='suspended';
 if found then return jsonb_build_object('status','suspended','customer_reason',coalesce(control.customer_reason,'Please reply to the Wedding Waitress owner for review.'),'changed_at',control.changed_at); end if;
 if exists(select 1 from private.signup_access_reviews where user_id=auth.uid() and status='pending') then
  return jsonb_build_object('status','pending_review','customer_reason','Your registration requires owner review. A matching name or unverified contact detail does not establish that you are another customer. Please reply below.');
 end if;
 return jsonb_build_object('status','active');
end; $$;
revoke all on function public.get_my_account_access() from public,anon;
grant execute on function public.get_my_account_access() to authenticated;

create function public.reply_to_account_suspension(p_message text,p_request_id uuid) returns uuid
 language plpgsql security definer set search_path=pg_catalog,public,private,extensions as $$
declare customer auth.users; reply_id uuid;
begin
 if auth.uid() is null or not private.account_planning_blocked(auth.uid()) then raise exception 'Account reply unavailable' using errcode='42501'; end if;
 if length(btrim(coalesce(p_message,''))) not between 1 and 2000 or p_request_id is null then raise exception 'A reply is required' using errcode='22023'; end if;
 select * into customer from auth.users where id=auth.uid();
 -- Own identity only, no client-supplied account/event/recipient; reuse durable
 -- support, its idempotency and rate limit. This RPC queues/sends no email.
 select public.create_support_ticket(customer.id,null,
   left(coalesce(nullif(btrim(concat_ws(' ',customer.raw_user_meta_data->>'first_name',customer.raw_user_meta_data->>'last_name')),''),'Account customer'),100),
   coalesce(customer.email,'account@invalid.local'),'Account access review',p_message,'account_support',
   encode(digest('suspension-reply:'||customer.id::text,'sha256'),'hex'),p_request_id::text) into reply_id;
 return reply_id;
end; $$;
revoke all on function public.reply_to_account_suspension(text,uuid) from public,anon;
grant execute on function public.reply_to_account_suspension(text,uuid) to authenticated;

-- Customer reason is separate from internal audit reason. Owner protection is
-- enforced here AND by a trigger, including legacy/direct service calls.
create function private.protect_suspension_control() returns trigger language plpgsql security definer
 set search_path=pg_catalog,public,private,auth as $$
begin
 if tg_op='UPDATE' and old.status='suspended' and new.status='active' then
  if not exists(select 1 from auth.users where id=new.changed_by and lower(email)='naderelalfy1977@gmail.com')
    or not public.has_role(new.changed_by,'admin'::public.app_role) then
   raise exception 'Only the verified Wedding Waitress owner may restore suspension' using errcode='42501';
  end if;
 end if;
 if new.status='suspended' then
  if exists(select 1 from auth.users where id=new.account_owner_id and lower(email)='naderelalfy1977@gmail.com')
    or new.account_owner_id=new.changed_by then raise exception 'Owner/self suspension is prohibited' using errcode='42501'; end if;
  if length(btrim(coalesce(new.customer_reason,''))) not between 5 and 2000 then raise exception 'Customer-visible suspension reason required' using errcode='22023'; end if;
 end if;
 return new;
end; $$;
create trigger protect_suspension_control before insert or update on public.admin_account_controls
 for each row execute function private.protect_suspension_control();

create function public.admin_suspend_account(p_target uuid,p_customer_reason text,p_reason text,p_actor uuid) returns jsonb
 language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare previous jsonb; result jsonb;
begin
 if auth.role()<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
 if not exists(select 1 from auth.users where id=p_actor and lower(email)='naderelalfy1977@gmail.com')
   or not public.has_role(p_actor,'admin'::public.app_role) then raise exception 'Owner admin required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Audit reason required' using errcode='22023'; end if;
 if length(btrim(coalesce(p_customer_reason,''))) not between 5 and 2000 then raise exception 'Customer-visible reason required' using errcode='22023'; end if;
 select to_jsonb(c) into previous from public.admin_account_controls c where account_owner_id=p_target for update;
 insert into public.admin_account_controls(account_owner_id,status,reason,customer_reason,changed_by)
 values(p_target,'suspended',btrim(p_reason),btrim(p_customer_reason),p_actor)
 on conflict(account_owner_id) do update set status='suspended',reason=excluded.reason,customer_reason=excluded.customer_reason,changed_by=p_actor,changed_at=now();
 delete from private.suspension_identifiers where account_owner_id=p_target;
 insert into private.suspension_identifiers(account_owner_id,kind,value)
 select p_target,'email',lower(btrim(email)) from auth.users where id=p_target and email is not null
 union select p_target,'verified_phone',private.suspension_normalize_phone('+'||regexp_replace(phone,'[^0-9]','','g'),null) from auth.users where id=p_target and phone_confirmed_at is not null and regexp_replace(phone,'[^0-9]','','g') ~ '^[0-9]{7,15}$'
 union select p_target,'verified_phone',phone_e164 from public.organiser_phone_verifications where user_id=p_target and verified_at is not null
 union select p_target,'full_name',private.suspension_normalize_name(concat_ws(' ',first_name,last_name)) from public.profiles where id=p_target
 union select p_target,'reported_phone',private.suspension_normalize_phone(mobile,null) from public.profiles where id=p_target and private.suspension_normalize_phone(mobile,null) is not null
 on conflict do nothing;
 delete from private.suspension_identifiers where account_owner_id=p_target and (value is null or value='');
 select to_jsonb(c) into result from public.admin_account_controls c where account_owner_id=p_target;
 insert into public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
 values(p_actor,'suspend','account',p_target::text,p_reason,coalesce(previous,'{}'::jsonb),result,'succeeded');
 return result;
end; $$;
revoke all on function public.admin_suspend_account(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_suspend_account(uuid,text,text,uuid) to service_role;

create function private.release_suspension_identifiers() returns trigger language plpgsql security definer
 set search_path=pg_catalog,private,public as $$ begin
 if new.status='active' then
  delete from private.suspension_identifiers where account_owner_id=new.account_owner_id;
  -- A collision hold applies only while a matched source remains suspended.
  -- Restoration grants no paid entitlement and preserves the review record.
  update private.signup_access_reviews r set status='approved',reviewed_at=now(),reviewed_by=new.changed_by
   where r.status='pending' and new.account_owner_id=any(r.matched_owner_ids)
   and not exists(select 1 from public.admin_account_controls c where c.account_owner_id=any(r.matched_owner_ids) and c.status='suspended');
 end if;
 return new;
end; $$;
create trigger release_suspension_identifiers after update on public.admin_account_controls
 for each row execute function private.release_suspension_identifiers();

-- Auth trigger covers OTP, password and external-provider INSERT paths without
-- relying on a client preflight. Reported mobile/full-name collisions quarantine
-- a new registration for review; they never prove same-person identity.
create function private.check_suspended_registration() returns trigger language plpgsql security definer
 set search_path=pg_catalog,public,private as $$
declare phone_value text; name_value text; review_kind text;
begin
 phone_value:=case when nullif(new.phone,'') is not null then private.suspension_normalize_phone('+'||regexp_replace(new.phone,'[^0-9]','','g'),null)
  else private.suspension_normalize_phone(new.raw_user_meta_data->>'mobile',new.raw_user_meta_data->>'country') end;
 if exists(select 1 from private.suspension_identifiers i join public.admin_account_controls c on c.account_owner_id=i.account_owner_id
  where c.status='suspended' and ((i.kind='email' and i.value=lower(btrim(new.email))) or (i.kind='verified_phone' and i.value=phone_value))) then
  raise exception 'Registration is unavailable. Please contact Wedding Waitress support.' using errcode='42501';
 end if;
 return new;
end; $$;
create trigger check_suspended_registration before insert on auth.users for each row execute function private.check_suspended_registration();
create function private.review_suspended_registration() returns trigger language plpgsql security definer
 set search_path=pg_catalog,public,private as $$
declare phone_value text; name_value text; review_kind text; matched_owners uuid[];
begin
 phone_value:=case when nullif(new.phone,'') is not null then private.suspension_normalize_phone('+'||regexp_replace(new.phone,'[^0-9]','','g'),null)
  else private.suspension_normalize_phone(new.raw_user_meta_data->>'mobile',new.raw_user_meta_data->>'country') end;
 name_value:=private.suspension_normalize_name(coalesce(nullif(concat_ws(' ',new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name'),''),new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'));
 select i.kind into review_kind from private.suspension_identifiers i join public.admin_account_controls c on c.account_owner_id=i.account_owner_id
  where c.status='suspended' and ((i.kind='reported_phone' and i.value=phone_value) or (i.kind='full_name' and i.value=name_value and name_value<>'')) order by i.kind limit 1;
 if review_kind is not null then
  select array_agg(distinct i.account_owner_id) into matched_owners from private.suspension_identifiers i join public.admin_account_controls c on c.account_owner_id=i.account_owner_id
   where c.status='suspended' and ((i.kind='reported_phone' and i.value=phone_value) or (i.kind='full_name' and i.value=name_value and name_value<>''));
  insert into private.signup_access_reviews(user_id,match_kind,matched_owner_ids) values(new.id,review_kind,matched_owners);
 end if;
 return new;
end; $$;
create trigger review_suspended_registration after insert on auth.users for each row execute function private.review_suspended_registration();

create function public.admin_get_account_access_detail(p_target uuid) returns jsonb language plpgsql stable security definer
 set search_path=pg_catalog,public,private as $$ begin
 if not public.is_owner_admin() or not exists(select 1 from auth.users where id=auth.uid() and lower(email)='naderelalfy1977@gmail.com') then raise exception 'Owner admin required' using errcode='42501'; end if;
 return jsonb_build_object('control',(select jsonb_build_object('status',status,'customer_reason',customer_reason,'internal_audit_reason',reason,'changed_at',changed_at) from public.admin_account_controls where account_owner_id=p_target),
 'review',(select jsonb_build_object('status',status,'match_kind',match_kind,'created_at',created_at) from private.signup_access_reviews where user_id=p_target),
 'replies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'message',message,'status',status,'created_at',created_at) order by created_at desc) from (select id,message,status,created_at from public.support_tickets where customer_id=p_target and category='Account access review' order by created_at desc limit 50) t),'[]'::jsonb));
end; $$;
revoke all on function public.admin_get_account_access_detail(uuid) from public,anon;
grant execute on function public.admin_get_account_access_detail(uuid) to authenticated;
create function public.admin_approve_signup_review(p_target uuid,p_reason text,p_actor uuid) returns boolean language plpgsql security definer
 set search_path=pg_catalog,public,private,auth as $$ begin
 if auth.role()<>'service_role' or not exists(select 1 from auth.users where id=p_actor and lower(email)='naderelalfy1977@gmail.com') or not public.has_role(p_actor,'admin'::public.app_role) then raise exception 'Owner admin required' using errcode='42501'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Audit reason required' using errcode='22023'; end if;
 update private.signup_access_reviews set status='approved',reviewed_at=now(),reviewed_by=p_actor where user_id=p_target and status='pending';
 if not found then return false; end if;
 insert into public.admin_action_audit(administrator_id,action,target_type,target_id,reason,new_state,result) values(p_actor,'approve_signup_review','account',p_target::text,p_reason,'{"review":"approved"}','succeeded');
 return true;
end; $$;
revoke all on function public.admin_approve_signup_review(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_approve_signup_review(uuid,text,uuid) to service_role;

-- Tighten already-guarded Edge boolean without modifying closure semantics.
-- Separate Edge lookup avoids changing pre-existing account-closure behavior
-- in handlers that previously did not use is_account_operational.
create function public.is_account_suspension_blocked(p_user_id uuid) returns boolean
 language sql stable security definer set search_path=pg_catalog,private as $$
 select private.account_planning_blocked(p_user_id);
$$;
revoke all on function public.is_account_suspension_blocked(uuid) from public,anon,authenticated;
grant execute on function public.is_account_suspension_blocked(uuid) to service_role;

create or replace function public.is_account_operational(p_user_id uuid default auth.uid()) returns boolean
 language sql stable security definer set search_path=pg_catalog,public,private as $$
 with owner as (select coalesce((select am.account_owner_id from public.account_members am where am.member_user_id=p_user_id and am.access_disabled_at is null order by (am.role='master') desc,am.invited_at limit 1),p_user_id) id)
 select not private.account_planning_blocked(p_user_id)
 and coalesce((select l.status not in ('scheduled_for_deletion','permanently_deleted') from public.account_lifecycle l,owner o where l.account_owner_id=o.id),true);
$$;
-- No auth-hook config overwrite. The INSERT trigger is the enforcement point.
notify pgrst,'reload config';
notify pgrst,'reload schema';
