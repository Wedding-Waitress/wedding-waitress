-- Wedding Waitress paid-access lifecycle:
-- * paid plans end at expires_at (no download/grace entitlement)
-- * one-time access extensions cost A$20 per whole calendar month
-- * Stripe-session fulfillment is durable and idempotent
-- * transactional email/SMS reminders are prepared exactly 30 days before expiry

drop trigger if exists set_subscription_download_window on public.user_subscriptions;
drop function if exists public.set_subscription_download_window();

alter table public.user_subscriptions
  alter column download_only_ends_at drop default;

alter table public.user_subscriptions
  add column if not exists access_recovery_ends_at timestamptz;

update public.user_subscriptions
set download_only_ends_at = null,
    access_recovery_ends_at = expires_at + interval '6 months'
where download_only_ends_at is not null or access_recovery_ends_at is null;

create or replace function public.set_access_recovery_deadline()
returns trigger language plpgsql set search_path = pg_catalog, public
as $$
begin
  if tg_op='INSERT' or new.expires_at is distinct from old.expires_at or new.access_recovery_ends_at is null then
    new.access_recovery_ends_at := new.expires_at + interval '6 months';
  end if;
  return new;
end;
$$;
revoke all on function public.set_access_recovery_deadline() from public, anon, authenticated;
drop trigger if exists set_access_recovery_deadline on public.user_subscriptions;
create trigger set_access_recovery_deadline before insert or update of expires_at,access_recovery_ends_at
on public.user_subscriptions for each row execute function public.set_access_recovery_deadline();

create table if not exists public.access_extension_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_name text not null,
  months integer not null check (months between 1 and 49999),
  amount_cents integer not null check (amount_cents = months * 2000),
  currency text not null check (currency = 'AUD'),
  payment_status text not null check (payment_status = 'paid'),
  previous_expires_at timestamptz not null,
  new_expires_at timestamptz not null,
  fulfilled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (length(stripe_session_id) between 10 and 255),
  check (new_expires_at > previous_expires_at)
);

alter table public.access_extension_purchases enable row level security;
revoke all on public.access_extension_purchases from public, anon, authenticated;
grant select, insert on public.access_extension_purchases to service_role;

create table if not exists public.access_expiry_reminders (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  channel text not null check (channel in ('email', 'sms')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'queued', 'failed', 'unavailable', 'stale')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  provider text,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  queued_at timestamptz,
  unique (user_id, expires_at, channel)
);

create index if not exists access_expiry_reminders_ready_idx
  on public.access_expiry_reminders(status, available_at, id)
  where status in ('pending', 'failed');

alter table public.access_expiry_reminders enable row level security;
revoke all on public.access_expiry_reminders from public, anon, authenticated;
grant all on public.access_expiry_reminders to service_role;
grant usage, select on sequence public.access_expiry_reminders_id_seq to service_role;

create table if not exists public.access_recovery_cleanup_jobs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  recovery_ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, expires_at)
);
alter table public.access_recovery_cleanup_jobs enable row level security;
revoke all on public.access_recovery_cleanup_jobs from public, anon, authenticated;
grant all on public.access_recovery_cleanup_jobs to service_role;
grant usage,select on sequence public.access_recovery_cleanup_jobs_id_seq to service_role;

create or replace function public.refresh_my_subscription_lifecycle()
returns table(status text, is_read_only boolean, expires_at timestamptz, download_only_ends_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare owner_id uuid := (select auth.uid());
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;

  update public.user_subscriptions us
     set status = case when now() <= us.expires_at then
           case when us.status in ('expired', 'grace_period') then 'active' else us.status end
         else 'expired' end,
         is_read_only = now() > us.expires_at,
         download_only_ends_at = null,
         updated_at = now()
   where us.user_id = owner_id;

  return query
  select us.status, us.is_read_only, us.expires_at, us.download_only_ends_at
    from public.user_subscriptions us where us.user_id = owner_id limit 1;
end;
$$;

revoke all on function public.refresh_my_subscription_lifecycle() from public, anon;
grant execute on function public.refresh_my_subscription_lifecycle() to authenticated;

create or replace function public.get_my_paid_access_state()
returns jsonb language sql stable security definer set search_path = ''
as $$
  with me as (select auth.uid() as id), owner as (
    select coalesce((select am.account_owner_id from public.account_members am,me
      where am.member_user_id=me.id and am.accepted_at is not null and am.access_disabled_at is null
      order by (am.role='master') desc,am.invited_at limit 1),(select id from me)) as id
  )
  select coalesce((
    select jsonb_build_object(
      'account_owner_id',o.id,'plan_name',sp.name,'expires_at',us.expires_at,
      'recovery_ends_at',us.access_recovery_ends_at,
      'paid_plan',sp.name in ('Essential','Premium','Unlimited','Ultimate'),
      'expired',sp.name in ('Essential','Premium','Unlimited','Ultimate') and now()>us.expires_at,
      'recoverable',now()<=coalesce(us.access_recovery_ends_at,us.expires_at+interval '6 months')
    ) from owner o join public.user_subscriptions us on us.user_id=o.id join public.subscription_plans sp on sp.id=us.plan_id
  ),jsonb_build_object('paid_plan',false,'expired',false,'recoverable',false));
$$;
revoke all on function public.get_my_paid_access_state() from public,anon;
grant execute on function public.get_my_paid_access_state() to authenticated;

create or replace function public.subscription_allows_event_edit(owner_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_role(owner_id, 'admin'::public.app_role)
    or exists (
      select 1 from public.user_subscriptions us
      where us.user_id = owner_id and us.status in ('active', 'trial')
        and us.is_read_only = false and now() <= us.expires_at
    );
$$;
revoke all on function public.subscription_allows_event_edit(uuid) from public, anon, authenticated;
grant execute on function public.subscription_allows_event_edit(uuid) to service_role;

create or replace function public.is_account_operational(p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  with owner as (
    select coalesce((
      select am.account_owner_id from public.account_members am
      where am.member_user_id = p_user_id and am.accepted_at is not null
        and am.access_disabled_at is null
      order by (am.role = 'master') desc, am.invited_at limit 1
    ), p_user_id) as id
  )
  select public.has_role(p_user_id, 'admin'::public.app_role) or (
    coalesce((select l.status not in ('scheduled_for_deletion','permanently_deleted')
      from public.account_lifecycle l join owner o on o.id = l.account_owner_id), true)
    and coalesce((select us.status in ('active','trial') and us.is_read_only = false and now() <= us.expires_at
      from public.user_subscriptions us join owner o on o.id = us.user_id limit 1), true)
  );
$$;
revoke all on function public.is_account_operational(uuid) from public, anon;
grant execute on function public.is_account_operational(uuid) to authenticated, service_role;

create or replace function public.guard_expired_event_mutation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare payload jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
declare owner_id uuid;
declare event_uuid uuid;
begin
  if current_user in ('service_role', 'postgres') then return case when tg_op = 'DELETE' then old else new end; end if;
  if tg_table_name = 'events' then owner_id := nullif(payload->>'user_id', '')::uuid;
  else
    event_uuid := nullif(payload->>'event_id', '')::uuid;
    if event_uuid is not null then select e.user_id into owner_id from public.events e where e.id = event_uuid; end if;
  end if;
  if owner_id is not null and not public.subscription_allows_event_edit(owner_id) then
    raise exception 'Paid planning access has ended. Extend access in Account Centre to continue.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function public.guard_expired_event_mutation() from public, anon, authenticated;

create or replace function public.fulfill_access_extension(
  _stripe_session_id text,
  _user_id uuid,
  _months integer,
  _amount_cents integer,
  _currency text,
  _payment_status text
)
returns table(result text, previous_expires_at timestamptz, new_expires_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare sub public.user_subscriptions%rowtype;
declare plan_name_value text;
declare old_expiry timestamptz;
declare next_expiry timestamptz;
declare existing public.access_extension_purchases%rowtype;
begin
  if _stripe_session_id is null or length(_stripe_session_id) not between 10 and 255 then raise exception 'Invalid Stripe session'; end if;
  if _months is null or _months not between 1 and 49999 then raise exception 'Invalid extension duration'; end if;
  if _amount_cents is distinct from _months * 2000 then raise exception 'Invalid extension amount'; end if;
  if upper(coalesce(_currency, '')) <> 'AUD' then raise exception 'Access extensions must be paid in AUD'; end if;
  if lower(coalesce(_payment_status, '')) <> 'paid' then raise exception 'Payment is not complete'; end if;

  select * into existing from public.access_extension_purchases p where p.stripe_session_id = _stripe_session_id;
  if found then
    if existing.user_id <> _user_id or existing.months <> _months or existing.amount_cents <> _amount_cents then
      raise exception 'Stripe session was already fulfilled with different purchase details';
    end if;
    return query select 'already_fulfilled'::text, existing.previous_expires_at, existing.new_expires_at;
    return;
  end if;

  select us.* into sub from public.user_subscriptions us
   where us.user_id = _user_id for update of us;
  if not found then raise exception 'An eligible paid plan is required'; end if;
  select sp.name into plan_name_value from public.subscription_plans sp where sp.id = sub.plan_id;
  if not found or plan_name_value not in ('Essential','Premium','Unlimited','Ultimate') then
    raise exception 'An eligible paid plan is required';
  end if;
  if sub.access_recovery_ends_at is not null and clock_timestamp() > sub.access_recovery_ends_at then
    raise exception 'The six-month account recovery period has ended';
  end if;
  if exists(select 1 from public.account_lifecycle l where l.account_owner_id=_user_id and l.status in ('scheduled_for_deletion','permanently_deleted')) then
    raise exception 'This account must be restored before an access extension can be fulfilled';
  end if;
  if exists(select 1 from public.access_recovery_cleanup_jobs j where j.user_id=_user_id and j.status='processing') then
    raise exception 'Account recovery cleanup has already started';
  end if;

  old_expiry := sub.expires_at;
  next_expiry := greatest(sub.expires_at, clock_timestamp()) + make_interval(months => _months);

  insert into public.access_extension_purchases(
    stripe_session_id,user_id,plan_name,months,amount_cents,currency,payment_status,
    previous_expires_at,new_expires_at
  ) values (
    _stripe_session_id,_user_id,plan_name_value,_months,_amount_cents,'AUD','paid',old_expiry,next_expiry
  );

  update public.user_subscriptions
     set expires_at = next_expiry, status = 'active', is_read_only = false,
         grace_period_ends_at = null, download_only_ends_at = null,
         access_recovery_ends_at = next_expiry + interval '6 months', updated_at = now()
   where user_id = _user_id;

  update public.access_expiry_reminders
     set status = 'stale', last_error = 'Expiry changed after an access extension', updated_at = now()
   where user_id = _user_id and expires_at <> next_expiry and status in ('pending','failed','processing');

  update public.access_recovery_cleanup_jobs set status='cancelled',updated_at=now(),last_error='Access was extended before cleanup'
   where user_id=_user_id and status in ('pending','failed');

  return query select 'fulfilled'::text, old_expiry, next_expiry;
end;
$$;
revoke all on function public.fulfill_access_extension(text,uuid,integer,integer,text,text) from public, anon, authenticated;
grant execute on function public.fulfill_access_extension(text,uuid,integer,integer,text,text) to service_role;

create or replace function public.schedule_access_expiry_reminders()
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inserted_count integer;
begin
  insert into public.access_expiry_reminders(user_id, expires_at, channel, status, last_error)
  select us.user_id, us.expires_at, channel.name,
         case
           when channel.name = 'email' and nullif(btrim(au.email), '') is null then 'unavailable'
           when channel.name = 'sms' and ov.phone_e164 is null then 'unavailable'
           else 'pending'
         end,
         case
           when channel.name = 'email' and nullif(btrim(au.email), '') is null then 'Account email unavailable'
           when channel.name = 'sms' and ov.phone_e164 is null then 'Verified account mobile unavailable'
           else null
         end
    from public.user_subscriptions us
    join public.subscription_plans sp on sp.id = us.plan_id and sp.name in ('Essential','Premium','Unlimited','Ultimate')
    join auth.users au on au.id = us.user_id
    cross join (values ('email'),('sms')) as channel(name)
    left join public.organiser_phone_verifications ov on ov.user_id = us.user_id
   where us.status in ('active','trial')
     and us.expires_at > now() + interval '29 days 23 hours'
     and us.expires_at <= now() + interval '30 days'
  on conflict (user_id, expires_at, channel) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.schedule_access_expiry_reminders() from public, anon, authenticated;
grant execute on function public.schedule_access_expiry_reminders() to service_role;

create or replace function public.claim_access_expiry_reminders(_limit integer default 50)
returns table(id bigint,user_id uuid,expires_at timestamptz,channel text,email text,phone_e164 text,attempts integer)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  update public.access_expiry_reminders r
     set status = 'stale', updated_at = now(), last_error = 'Subscription expiry changed'
   where r.status in ('pending','failed','processing')
     and not exists (select 1 from public.user_subscriptions us where us.user_id=r.user_id and us.expires_at=r.expires_at);

  return query
  with candidates as (
    select r.id from public.access_expiry_reminders r
    join public.user_subscriptions us on us.user_id=r.user_id and us.expires_at=r.expires_at
    where r.status in ('pending','failed') and r.available_at <= now() and r.attempts < 5
    order by r.id for update skip locked limit greatest(1, least(coalesce(_limit,50),100))
  ), claimed as (
    update public.access_expiry_reminders r set status='processing',attempts=r.attempts+1,locked_at=now(),updated_at=now(),last_error=null
    from candidates c where r.id=c.id returning r.*
  )
  select c.id,c.user_id,c.expires_at,c.channel,au.email,ov.phone_e164,c.attempts
  from claimed c join auth.users au on au.id=c.user_id
  left join public.organiser_phone_verifications ov on ov.user_id=c.user_id;
end;
$$;
revoke all on function public.claim_access_expiry_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_access_expiry_reminders(integer) to service_role;

create or replace function public.complete_access_expiry_reminder(
  _id bigint,_accepted boolean,_provider text default null,_provider_id text default null,_error text default null
)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  update public.access_expiry_reminders r
     set status=case when _accepted then 'queued' when r.attempts >= 5 then 'failed' else 'failed' end,
         provider=case when _accepted then left(_provider,50) else r.provider end,
         provider_id=case when _accepted then left(_provider_id,255) else r.provider_id end,
         queued_at=case when _accepted then now() else r.queued_at end,
         last_error=case when _accepted then null else left(coalesce(_error,'Provider acceptance was not confirmed'),1000) end,
         available_at=case when _accepted then r.available_at else now()+interval '15 minutes' end,
         locked_at=null,updated_at=now()
   where r.id=_id and r.status='processing';
  return found;
end;
$$;
revoke all on function public.complete_access_expiry_reminder(bigint,boolean,text,text,text) from public, anon, authenticated;
grant execute on function public.complete_access_expiry_reminder(bigint,boolean,text,text,text) to service_role;

create or replace function public.schedule_access_recovery_cleanup()
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inserted_count integer;
begin
  insert into public.access_recovery_cleanup_jobs(user_id,expires_at,recovery_ends_at)
  select us.user_id,us.expires_at,us.access_recovery_ends_at
  from public.user_subscriptions us join public.subscription_plans sp on sp.id=us.plan_id
  where sp.name in ('Essential','Premium','Unlimited','Ultimate')
    and us.access_recovery_ends_at is not null and us.access_recovery_ends_at <= now()
  on conflict(user_id,expires_at) do nothing;
  get diagnostics inserted_count=row_count;
  return inserted_count;
end;
$$;

create or replace function public.claim_access_recovery_cleanup(_limit integer default 10)
returns table(id bigint,user_id uuid,expires_at timestamptz,recovery_ends_at timestamptz)
language sql security definer set search_path = pg_catalog, public
as $$
  with candidates as (
    select j.id from public.access_recovery_cleanup_jobs j
    join public.user_subscriptions us on us.user_id=j.user_id and us.expires_at=j.expires_at
      and us.access_recovery_ends_at=j.recovery_ends_at and us.access_recovery_ends_at<=now()
    where j.status in ('pending','failed') and j.available_at<=now() and j.attempts<5
    order by j.id for update skip locked limit greatest(1,least(coalesce(_limit,10),25))
  )
  update public.access_recovery_cleanup_jobs j
  set status='processing',attempts=j.attempts+1,locked_at=now(),updated_at=now(),last_error=null
  from candidates c where j.id=c.id returning j.id,j.user_id,j.expires_at,j.recovery_ends_at;
$$;

create or replace function public.prepare_expired_access_purge(_job_id bigint)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare job public.access_recovery_cleanup_jobs%rowtype; sub public.user_subscriptions%rowtype;
begin
  select * into job from public.access_recovery_cleanup_jobs where id=_job_id and status='processing' for update;
  if not found then raise exception 'Cleanup job is unavailable'; end if;
  select * into sub from public.user_subscriptions where user_id=job.user_id for update;
  if not found or sub.expires_at<>job.expires_at or sub.access_recovery_ends_at<>job.recovery_ends_at or sub.access_recovery_ends_at>now() then
    update public.access_recovery_cleanup_jobs set status='cancelled',updated_at=now(),last_error='Subscription is no longer eligible' where id=_job_id;
    return null;
  end if;
  insert into public.account_lifecycle(account_owner_id,status,deletion_requested_at,purge_after,deleted_by_user_id,stripe_cancellation_succeeded,audit_metadata,updated_at)
  values(job.user_id,'scheduled_for_deletion',now(),now(),null,true,jsonb_build_object('source','paid_access_recovery_expired','access_expired_at',job.expires_at),now())
  on conflict(account_owner_id) do update set status='scheduled_for_deletion',deletion_requested_at=now(),purge_after=now(),
    audit_metadata=public.account_lifecycle.audit_metadata||excluded.audit_metadata,updated_at=now();
  return job.user_id;
end;
$$;

create or replace function public.complete_access_recovery_cleanup(_job_id bigint,_success boolean,_error text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  update public.access_recovery_cleanup_jobs j set
    status=case when _success then 'completed' else 'failed' end,
    completed_at=case when _success then now() else null end,
    available_at=case when _success then j.available_at else now()+interval '1 hour' end,
    locked_at=null,last_error=case when _success then null else left(coalesce(_error,'Cleanup failed'),1000) end,updated_at=now()
  where id=_job_id and status='processing';
  return found;
end;
$$;

create or replace function public.get_access_recovery_storage_objects(_job_id bigint)
returns table(bucket_id text,object_name text)
language sql security definer set search_path = pg_catalog, public, storage
as $$
  select o.bucket_id,o.name
  from public.access_recovery_cleanup_jobs j
  join storage.objects o on o.owner_id::text=j.user_id::text
    or (storage.foldername(o.name))[1]=j.user_id::text
    or (storage.foldername(o.name))[1] in (select e.id::text from public.events e where e.user_id=j.user_id)
  where j.id=_job_id and j.status='processing';
$$;

revoke all on function public.schedule_access_recovery_cleanup(),public.claim_access_recovery_cleanup(integer),public.prepare_expired_access_purge(bigint),public.complete_access_recovery_cleanup(bigint,boolean,text),public.get_access_recovery_storage_objects(bigint) from public,anon,authenticated;
grant execute on function public.schedule_access_recovery_cleanup(),public.claim_access_recovery_cleanup(integer),public.prepare_expired_access_purge(bigint),public.complete_access_recovery_cleanup(bigint,boolean,text),public.get_access_recovery_storage_objects(bigint) to service_role;

-- Scheduling is activated during the separately approved rollout after the
-- processor secret and Edge Function are present. The migration intentionally
-- does not send or backfill any reminder by itself.
