-- Requires 20260909205000_transactional_email_delivery_queue.
-- Additive foundations only. No historical consent is inferred or backfilled.
create table public.marketing_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status in ('opted_in', 'opted_out')),
  consent_email text not null,
  source text not null check (source in ('account_preferences', 'unsubscribe_link', 'verified_provider_unsubscribe')),
  wording_version text not null,
  changed_at timestamptz not null default now()
);
create table public.marketing_preference_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('opted_in', 'opted_out')),
  consent_email text not null,
  source text not null,
  wording_version text not null,
  recorded_at timestamptz not null default now()
);
create index marketing_preference_history_user_time on public.marketing_preference_history(user_id, recorded_at desc);
alter table public.marketing_preferences enable row level security;
alter table public.marketing_preference_history enable row level security;
revoke all on public.marketing_preferences, public.marketing_preference_history from public, anon, authenticated;
grant select on public.marketing_preferences, public.marketing_preference_history to authenticated;
grant all on public.marketing_preferences, public.marketing_preference_history to service_role;
create policy "Own or owner admin marketing preference" on public.marketing_preferences for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner_admin()));
create policy "Own or owner admin consent history" on public.marketing_preference_history for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_owner_admin()));

create function public.set_my_marketing_preference(p_opted_in boolean)
returns public.marketing_preferences language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare v_user uuid := auth.uid(); v_email text; v_result public.marketing_preferences;
begin
  if v_user is null or p_opted_in is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select lower(btrim(email)) into v_email from auth.users where id = v_user and not coalesce(is_anonymous, false);
  if v_email is null then raise exception 'Permanent account required' using errcode = '42501'; end if;
  insert into public.marketing_preferences(user_id,status,consent_email,source,wording_version)
  values(v_user,case when p_opted_in then 'opted_in' else 'opted_out' end,v_email,'account_preferences','marketing-email-v1')
  on conflict(user_id) do update set status=excluded.status,consent_email=excluded.consent_email,
    source=excluded.source,wording_version=excluded.wording_version,changed_at=now()
  returning * into v_result;
  insert into public.marketing_preference_history(user_id,status,consent_email,source,wording_version)
    values(v_result.user_id,v_result.status,v_result.consent_email,v_result.source,v_result.wording_version);
  return v_result;
end; $$;
revoke all on function public.set_my_marketing_preference(boolean) from public, anon;
grant execute on function public.set_my_marketing_preference(boolean) to authenticated;

-- Eligibility is verified against the current confirmed login email. A missing
-- preference, changed login email or suppression never implies permission.
create function public.marketing_email_eligible(p_user_id uuid,p_email text)
returns boolean language sql security definer set search_path=pg_catalog,public,auth as $$
  select exists(select 1 from auth.users u join public.marketing_preferences p on p.user_id=u.id
    where u.id=p_user_id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
      and p.status='opted_in' and p.consent_email=lower(btrim(p_email)) and lower(btrim(u.email))=p.consent_email
      and not exists(select 1 from public.suppressed_emails s where s.email=p.consent_email));
$$;
revoke all on function public.marketing_email_eligible(uuid,text) from public,anon,authenticated;
grant execute on function public.marketing_email_eligible(uuid,text) to service_role;

-- Token use and opt-out are one transaction. Tokens and audit records are never
-- returned to clients, and GET validation never changes consent.
create function public.unsubscribe_marketing_email(p_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_email text; v_user uuid;
begin
  select email into v_email from public.email_unsubscribe_tokens where token=p_token for update;
  if v_email is null then return false; end if;
  update public.email_unsubscribe_tokens set used_at=coalesce(used_at,now()) where token=p_token;
  for v_user in select id from auth.users where lower(btrim(email))=v_email loop
    insert into public.marketing_preferences(user_id,status,consent_email,source,wording_version)
    values(v_user,'opted_out',v_email,'unsubscribe_link','marketing-email-v1')
    on conflict(user_id) do update set status='opted_out',consent_email=excluded.consent_email,
      source='unsubscribe_link',wording_version=excluded.wording_version,changed_at=now();
    insert into public.marketing_preference_history(user_id,status,consent_email,source,wording_version)
    values(v_user,'opted_out',v_email,'unsubscribe_link','marketing-email-v1');
  end loop;
  return true;
end; $$;
revoke all on function public.unsubscribe_marketing_email(text) from public,anon,authenticated;
grant execute on function public.unsubscribe_marketing_email(text) to service_role;

create function public.record_email_suppression(p_email text,p_reason text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_email text:=lower(btrim(p_email)); v_user uuid;
begin
 if p_reason not in ('bounce','complaint','unsubscribe') or coalesce(v_email,'') not like '%@%'
  then raise exception 'Invalid suppression' using errcode='22023'; end if;
 insert into public.suppressed_emails(email,reason,metadata) values(v_email,p_reason,'{"source":"verified_suppression_webhook"}')
 on conflict(email) do update set reason=case when public.suppressed_emails.reason='complaint' then 'complaint'
  when public.suppressed_emails.reason='bounce' and excluded.reason='unsubscribe' then 'bounce' else excluded.reason end,updated_at=now();
 if p_reason='unsubscribe' then
  for v_user in select id from auth.users where lower(btrim(email))=v_email loop
   insert into public.marketing_preferences(user_id,status,consent_email,source,wording_version)
    values(v_user,'opted_out',v_email,'verified_provider_unsubscribe','marketing-email-v1')
    on conflict(user_id) do update set status='opted_out',consent_email=excluded.consent_email,
     source=excluded.source,wording_version=excluded.wording_version,changed_at=now()
    where public.marketing_preferences.status<>'opted_out' or public.marketing_preferences.consent_email<>excluded.consent_email;
   if found then insert into public.marketing_preference_history(user_id,status,consent_email,source,wording_version)
    values(v_user,'opted_out',v_email,'verified_provider_unsubscribe','marketing-email-v1'); end if;
  end loop;
 end if;
 return true;
end; $$;
revoke all on function public.record_email_suppression(text,text) from public,anon,authenticated;
grant execute on function public.record_email_suppression(text,text) to service_role;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  full_name text not null check(length(btrim(full_name)) between 1 and 100),
  contact_email text not null check(length(contact_email)<=255 and contact_email like '%@%'),
  category text not null check(length(category) between 1 and 100),
  message text not null check(length(btrim(message)) between 1 and 2000),
  source text not null check(source in ('public_contact','get_help','account_support')),
  status text not null default 'open' check(status in ('open','in_progress','resolved','closed')),
  rate_key text not null check(length(rate_key)=64),
  idempotency_key text not null check(length(idempotency_key) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rate_key,idempotency_key)
);
create index support_tickets_customer_time on public.support_tickets(customer_id,created_at desc);
create index support_tickets_event_time on public.support_tickets(event_id,created_at desc);
create index support_tickets_rate_time on public.support_tickets(rate_key,created_at desc);
create table public.support_ticket_activity (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  reason text not null,
  recorded_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
alter table public.support_ticket_activity enable row level security;
revoke all on public.support_tickets,public.support_ticket_activity from public,anon,authenticated;
-- Do not expose rate keys to customers or admin browser sessions.
grant select(id,customer_id,event_id,full_name,contact_email,category,message,source,status,created_at,updated_at) on public.support_tickets to authenticated;
grant select on public.support_ticket_activity to authenticated;
grant all on public.support_tickets,public.support_ticket_activity to service_role;
create policy "Own enquiry or owner admin" on public.support_tickets for select to authenticated
 using(customer_id=(select auth.uid()) or (select public.is_owner_admin()));
create policy "Owner admin support activity" on public.support_ticket_activity for select to authenticated
 using((select public.is_owner_admin()));

-- Only the trusted sender supplies the verified customer identity and keyed IP
-- digest. Email addresses in public forms are contact details, not identities.
create function public.create_support_ticket(p_customer_id uuid,p_event_id uuid,p_name text,p_email text,
 p_category text,p_message text,p_source text,p_rate_key text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_id uuid;
begin
  if p_rate_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid rate key' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rate_key,0));
  select id into v_id from public.support_tickets where rate_key=p_rate_key and idempotency_key=p_idempotency_key;
  if v_id is not null then return v_id; end if;
  if (select count(*) from public.support_tickets where rate_key=p_rate_key and created_at>now()-interval '1 hour')>=5
    then raise exception 'Support request rate limit reached' using errcode='P0001'; end if;
  -- Global anonymous bound also protects the fixed support inbox if a caller
  -- spoofs a forwarding header. It is independent of client-declared source/IP.
  if p_customer_id is null then
    perform pg_advisory_xact_lock(hashtextextended('anonymous_support_inbox',0));
    if (select count(*) from public.support_tickets where customer_id is null and created_at>now()-interval '1 hour')>=100
      then raise exception 'Support request rate limit reached' using errcode='P0001'; end if;
  end if;
  -- Service-only RPC receives an Auth-verified identity from the Edge handler.
  -- The existing access predicate additionally requires a transaction-local UID.
  perform set_config('request.jwt.claim.sub',coalesce(p_customer_id::text,''),true);
  if p_event_id is not null and (p_customer_id is null or not public.can_access_event(p_customer_id,p_event_id))
    then raise exception 'Event access denied' using errcode='42501'; end if;
  insert into public.support_tickets(customer_id,event_id,full_name,contact_email,category,message,source,rate_key,idempotency_key)
   values(p_customer_id,p_event_id,btrim(p_name),lower(btrim(p_email)),p_category,btrim(p_message),p_source,p_rate_key,p_idempotency_key)
   returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.create_support_ticket(uuid,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_support_ticket(uuid,uuid,text,text,text,text,text,text,text) to service_role;
create function public.admin_set_support_ticket_status(p_ticket_id uuid,p_status text,p_actor uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,auth as $$
begin
  -- Called only after admin-account-action verifies owner and recent signed OTP grant.
  if not public.has_role(p_actor,'admin'::public.app_role) then raise exception 'Owner admin required' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Audit reason required' using errcode='22023'; end if;
  if p_status not in ('open','in_progress','resolved','closed') then raise exception 'Invalid status' using errcode='22023'; end if;
  update public.support_tickets set status=p_status,updated_at=now() where id=p_ticket_id;
  if not found then return false; end if;
  insert into public.support_ticket_activity(ticket_id,actor_id,status,reason) values(p_ticket_id,p_actor,p_status,btrim(p_reason));
  return true;
end; $$;
revoke all on function public.admin_set_support_ticket_status(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.admin_set_support_ticket_status(uuid,text,uuid,text) to service_role;

-- Extend the existing queue audit, not a duplicate logging system. Bodies, OTPs,
-- magic links, unsubscribe tokens and provider raw payloads do not belong here.
alter table public.email_send_log
 add column customer_id uuid references auth.users(id) on delete set null,
 add column event_id uuid references public.events(id) on delete set null,
 add column support_ticket_id uuid references public.support_tickets(id) on delete set null,
 add column purpose text not null default 'transactional' check(purpose in ('transactional','promotional')),
 add column provider text,
 add column provider_message_id text,
 add column accepted_at timestamptz,
 add column delivered_at timestamptz;
alter table public.email_send_log drop constraint email_send_log_status_check;
alter table public.email_send_log add constraint email_send_log_status_check
 check(status in ('pending','sent','accepted','delivered','failed','suppressed','bounced','complained','delayed'));
create unique index email_send_log_provider_unique on public.email_send_log(provider,provider_message_id)
 where provider_message_id is not null;
create index email_send_log_customer_time on public.email_send_log(customer_id,created_at desc);
create index email_send_log_event_time on public.email_send_log(event_id,created_at desc);
create table public.email_delivery_events (
 id uuid primary key default gen_random_uuid(),
 provider text not null,
 provider_event_id text not null,
 provider_message_id text not null,
 event_type text not null check(event_type in ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed')),
 occurred_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 unique(provider,provider_event_id)
);
alter table public.email_delivery_events enable row level security;
revoke all on public.email_delivery_events from public,anon,authenticated;
grant all on public.email_delivery_events to service_role;
-- Owner-only, metadata-only visibility. Do not expose operational payloads.
grant select(id,message_id,template_name,recipient_email,status,customer_id,event_id,support_ticket_id,purpose,provider,provider_message_id,accepted_at,delivered_at,created_at) on public.email_send_log to authenticated;
create policy "Owner admin email reporting" on public.email_send_log for select to authenticated using((select public.is_owner_admin()));

create function public.record_email_delivery_event(p_provider_event_id text,p_message_id text,p_type text,p_occurred_at timestamptz)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_log public.email_send_log; v_status text;
begin
  if p_type not in ('email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.failed')
    then raise exception 'Unsupported delivery event' using errcode='22023'; end if;
  if p_occurred_at is null or length(p_provider_event_id) not between 1 and 200 or length(p_message_id) not between 1 and 200
    then raise exception 'Invalid delivery event' using errcode='22023'; end if;
  insert into public.email_delivery_events(provider,provider_event_id,provider_message_id,event_type,occurred_at)
   values('resend',p_provider_event_id,p_message_id,p_type,p_occurred_at) on conflict(provider,provider_event_id) do nothing;
  -- Replays also reconcile a signed event that arrived before provider linkage.
  select * into v_log from public.email_send_log where provider='resend' and provider_message_id=p_message_id for update;
  -- Retain unmatched signed events for reconciliation: webhook may beat sender acknowledgement.
  if v_log.id is null then return true; end if;
  v_status := case p_type when 'email.sent' then 'accepted' when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delayed' when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained' else 'failed' end;
  update public.email_send_log set
   status=case when status in ('bounced','complained') then status
     when v_status in ('bounced','complained') then v_status
     when status='delivered' then status
     when v_status='accepted' and status in ('delayed','failed') then status else v_status end,
   accepted_at=coalesce(accepted_at,case when v_status in ('accepted','delivered') then p_occurred_at end),
   delivered_at=coalesce(delivered_at,case when v_status='delivered' then p_occurred_at end)
   where id=v_log.id;
  if v_status in ('bounced','complained') then
   insert into public.suppressed_emails(email,reason) values(lower(btrim(v_log.recipient_email)),case when v_status='bounced' then 'bounce' else 'complaint' end)
   on conflict(email) do update set reason=excluded.reason,updated_at=now();
  end if;
  return true;
end; $$;
revoke all on function public.record_email_delivery_event(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_email_delivery_event(text,text,text,timestamptz) to service_role;

-- PostgREST upsert needs an unconditional unique key; NULLs remain permitted.
alter table public.email_send_log add constraint email_send_log_message_id_unique unique(message_id);
create function public.resolve_email_customer(p_email text,p_event_id uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,auth as $$
declare v_id uuid;
begin
 select id into v_id from auth.users where lower(btrim(email))=lower(btrim(p_email)) and not coalesce(is_anonymous,false);
 perform set_config('request.jwt.claim.sub',coalesce(v_id::text,''),true);
 if p_event_id is not null and (v_id is null or not public.can_access_event(v_id,p_event_id))
  then raise exception 'Recipient event access denied' using errcode='42501'; end if;
 return v_id;
end; $$;
revoke all on function public.resolve_email_customer(text,uuid) from public,anon,authenticated;
grant execute on function public.resolve_email_customer(text,uuid) to service_role;

-- Atomic provider acknowledgement + queue completion, with early-webhook replay.
create function public.acknowledge_email_acceptance(p_queue_id bigint,p_message_id text,p_provider_message_id text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_event public.email_delivery_events;
begin
 if coalesce(p_provider_message_id,'')='' then raise exception 'Provider ID required' using errcode='22023'; end if;
 update public.email_send_log set provider='resend',provider_message_id=p_provider_message_id,
   status=case when status in ('pending','failed') then 'accepted' else status end,accepted_at=coalesce(accepted_at,now())
   where message_id=p_message_id;
 if not found then raise exception 'Email audit record missing' using errcode='22023'; end if;
 if p_queue_id is not null and not public.complete_transactional_email(p_queue_id,true,null) then raise exception 'Queue claim missing' using errcode='22023'; end if;
 for v_event in select * from public.email_delivery_events where provider='resend' and provider_message_id=p_provider_message_id order by occurred_at loop
  perform public.record_email_delivery_event(v_event.provider_event_id,p_provider_message_id,v_event.event_type,v_event.occurred_at);
 end loop;
 return true;
end; $$;
revoke all on function public.acknowledge_email_acceptance(bigint,text,text) from public,anon,authenticated;
grant execute on function public.acknowledge_email_acceptance(bigint,text,text) to service_role;
