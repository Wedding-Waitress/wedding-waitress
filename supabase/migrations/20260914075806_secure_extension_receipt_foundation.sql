-- Narrow hosted prerequisite for GST extension receipts.
-- Replaces the proposed rollout of the older 20260909213000 migration.
-- Does NOT replace installed access/lifecycle/request guards, policies, download
-- window settings or existing triggers. No reminder/purge functions or cron jobs are installed.
-- Apply this prerequisite BEFORE 20260914071230 GST receipts in the reviewed
-- explicit hosted release batch; do not run an unrestricted migration push.
-- Receipt tables are private to service_role despite residing in public.
BEGIN;
alter table public.user_subscriptions add column if not exists access_recovery_ends_at timestamptz;
-- Additive recovery metadata only; preserve existing download windows and deadlines.
update public.user_subscriptions set access_recovery_ends_at=expires_at+interval '6 months'
where access_recovery_ends_at is null and isfinite(expires_at);
-- A dedicated additive metadata trigger keeps later renewals' deadlines current.
-- It neither grants access nor changes existing download/access triggers.
create or replace function private.set_extension_recovery_deadline()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if tg_op='INSERT' or new.expires_at is distinct from old.expires_at then
    new.access_recovery_ends_at := new.expires_at + interval '6 months';
  end if;
  return new;
end;
$$;
revoke all on function private.set_extension_recovery_deadline() from public,anon,authenticated,service_role;
DO $$ BEGIN
 if not exists(select 1 from pg_trigger where tgrelid='public.user_subscriptions'::regclass
   and tgname='extension_receipt_recovery_deadline') then
  create trigger extension_receipt_recovery_deadline before insert or update of expires_at
  on public.user_subscriptions for each row execute function private.set_extension_recovery_deadline();
 end if;
END $$;
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
  if coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
      nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','') <> 'service_role' then
    raise exception 'Service role required' using errcode='42501';
  end if;
  if _user_id is null then raise exception 'Account required' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-return:'||_user_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('access-extension-session:'||coalesce(_stripe_session_id,''),0));
  -- Recheck administrative restrictions even for an already recorded replay.
  if private.account_planning_blocked(_user_id)
     or private.admin_deleted_planning_blocked(_user_id)
     or private.closed_account_planning_blocked(_user_id)
     or not exists(select 1 from auth.users where id=_user_id)
     or not exists(select 1 from public.account_members m
       where m.account_owner_id=_user_id and m.member_user_id=_user_id
       and m.role='master' and m.accepted_at is not null and m.access_disabled_at is null) then
    raise exception 'An unrestricted account master is required' using errcode='42501';
  end if;
  if _stripe_session_id is null or length(_stripe_session_id) not between 10 and 255 then raise exception 'Invalid Stripe session'; end if;
  if _months is null or _months not between 1 and 49999 then raise exception 'Invalid extension duration'; end if;
  if _amount_cents is distinct from _months * 2000 then raise exception 'Invalid extension amount'; end if;
  if upper(coalesce(_currency, '')) <> 'AUD' then raise exception 'Access extensions must be paid in AUD'; end if;
  if lower(coalesce(_payment_status, '')) <> 'paid' then raise exception 'Payment is not complete'; end if;

  select * into existing from public.access_extension_purchases p where p.stripe_session_id = _stripe_session_id;
  if found then
    if existing.user_id is distinct from _user_id or existing.months is distinct from _months or existing.amount_cents is distinct from _amount_cents then
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
  if sub.expires_at is null or not isfinite(sub.expires_at) or clock_timestamp() > coalesce(sub.access_recovery_ends_at,sub.expires_at + interval '6 months') then
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


COMMIT;
