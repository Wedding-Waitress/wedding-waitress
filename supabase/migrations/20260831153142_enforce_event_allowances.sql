-- Enforce Wedding Waitress active-event allowances at the database boundary.
-- Active means expiry_date_local is NULL or is today/a future date.
-- The NULL case deliberately fails closed so an omitted lifecycle value cannot
-- be used to evade the limit.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.subscription_plan_event_limit_backup_20260831 (
  plan_id uuid primary key,
  plan_name text not null,
  included_events integer,
  extra_event_price numeric,
  backed_up_at timestamptz not null default clock_timestamp()
);

insert into private.subscription_plan_event_limit_backup_20260831 (
  plan_id,
  plan_name,
  included_events,
  extra_event_price
)
select id, name, included_events, extra_event_price
from public.subscription_plans
where lower(name) in ('starter', 'free', 'essential', 'premium', 'unlimited', 'ultimate', 'vendor', 'vendor pro')
on conflict (plan_id) do nothing;

alter table public.subscription_plans
  alter column included_events set default 1;

update public.subscription_plans
set included_events = case
  when lower(name) in ('vendor', 'vendor pro') then 100
  else 1
end
where lower(name) in ('starter', 'free', 'essential', 'premium', 'unlimited', 'ultimate', 'vendor', 'vendor pro')
  and included_events is distinct from case
    when lower(name) in ('vendor', 'vendor pro') then 100
    else 1
  end;

create table private.event_allowance_slots (
  owner_id uuid not null,
  event_id uuid not null unique references public.events(id) on delete cascade,
  slot_number integer not null check (slot_number > 0),
  expires_on date,
  created_at timestamptz not null default clock_timestamp(),
  primary key (owner_id, slot_number)
);

create index event_allowance_slots_expiry_idx
  on private.event_allowance_slots (owner_id, expires_on);

revoke all on private.subscription_plan_event_limit_backup_20260831 from public, anon, authenticated;
revoke all on private.event_allowance_slots from public, anon, authenticated;

create or replace function private.resolve_event_allowance(p_owner_id uuid)
returns table (
  plan_key text,
  included_events integer,
  paid_additional_events integer,
  total_allowed integer,
  can_purchase_additional_events boolean,
  can_create boolean
)
language sql
stable
set search_path = pg_catalog, public
as $function$
  with subscription as (
    select
      lower(coalesce(sp.name, 'free')) as raw_plan_name,
      greatest(coalesce(sp.included_events, 1), 0)::integer as included_events,
      us.status,
      coalesce(us.is_read_only, false) as is_read_only,
      us.expires_at,
      (us.id is not null) as has_subscription
    from (select 1) seed
    left join public.user_subscriptions us on us.user_id = p_owner_id
    left join public.subscription_plans sp on sp.id = us.plan_id
    limit 1
  ), normalized as (
    select
      case
        when raw_plan_name like '%vendor%' then 'vendor_pro'
        when raw_plan_name like '%essential%' then 'essential'
        when raw_plan_name like '%premium%' then 'premium'
        when raw_plan_name like '%unlimited%' or raw_plan_name like '%ultimate%' then 'unlimited'
        else 'free'
      end as plan_key,
      case
        when raw_plan_name like '%vendor%' then least(included_events, 100)
        else least(included_events, 1)
      end as included_events,
      has_subscription,
      status,
      is_read_only,
      expires_at
    from subscription
  ), paid as (
    select count(*)::integer as purchase_count
    from public.additional_event_purchases aep, normalized n
    where aep.user_id = p_owner_id
      and aep.status = 'paid'
      and n.plan_key in ('essential', 'premium', 'unlimited')
  )
  select
    n.plan_key,
    n.included_events,
    p.purchase_count,
    (n.included_events + p.purchase_count)::integer,
    n.plan_key in ('essential', 'premium', 'unlimited'),
    case
      when not n.has_subscription then true
      else n.status = 'active'
        and not n.is_read_only
        and (n.expires_at is null or n.expires_at >= clock_timestamp())
    end
  from normalized n
  cross join paid p;
$function$;

revoke all on function private.resolve_event_allowance(uuid) from public, anon, authenticated;

create or replace function public.get_my_event_allowance()
returns table (
  plan_key text,
  included_events integer,
  paid_additional_events integer,
  total_allowed integer,
  active_events integer,
  remaining integer,
  at_cap boolean,
  can_purchase_additional_events boolean,
  can_create boolean
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  with owner_scope as (
    select coalesce(
      (
        select am.account_owner_id
        from public.account_members am
        where am.member_user_id = auth.uid()
          and am.access_disabled_at is null
        order by am.invited_at asc
        limit 1
      ),
      auth.uid()
    ) as owner_id
  ), subscription as (
    select
      os.owner_id,
      lower(coalesce(sp.name, 'free')) as raw_plan_name,
      greatest(coalesce(sp.included_events, 1), 0)::integer as included_events,
      us.status,
      coalesce(us.is_read_only, false) as is_read_only,
      us.expires_at,
      (us.id is not null) as has_subscription
    from owner_scope os
    left join public.user_subscriptions us on us.user_id = os.owner_id
    left join public.subscription_plans sp on sp.id = us.plan_id
    where os.owner_id is not null
    limit 1
  ), normalized as (
    select
      owner_id,
      case
        when raw_plan_name like '%vendor%' then 'vendor_pro'
        when raw_plan_name like '%essential%' then 'essential'
        when raw_plan_name like '%premium%' then 'premium'
        when raw_plan_name like '%unlimited%' or raw_plan_name like '%ultimate%' then 'unlimited'
        else 'free'
      end as plan_key,
      case
        when raw_plan_name like '%vendor%' then least(included_events, 100)
        else least(included_events, 1)
      end as included_events,
      has_subscription,
      status,
      is_read_only,
      expires_at
    from subscription
  ), usage as (
    select
      n.*,
      (
        select count(*)::integer
        from public.additional_event_purchases aep
        where aep.user_id = n.owner_id
          and aep.status = 'paid'
          and n.plan_key in ('essential', 'premium', 'unlimited')
      ) as paid_additional_events,
      (
        select count(*)::integer
        from public.events e
        where e.user_id = n.owner_id
          and (e.expiry_date_local is null or e.expiry_date_local >= current_date)
      ) as active_events
    from normalized n
  )
  select
    u.plan_key,
    u.included_events,
    u.paid_additional_events,
    (u.included_events + u.paid_additional_events)::integer as total_allowed,
    u.active_events,
    greatest(0, u.included_events + u.paid_additional_events - u.active_events)::integer as remaining,
    u.active_events >= (u.included_events + u.paid_additional_events) as at_cap,
    u.plan_key in ('essential', 'premium', 'unlimited') as can_purchase_additional_events,
    case
      when not u.has_subscription then true
      else u.status = 'active'
        and not u.is_read_only
        and (u.expires_at is null or u.expires_at >= clock_timestamp())
    end as can_create
  from usage u;
$function$;

revoke all on function public.get_my_event_allowance() from public, anon;
grant execute on function public.get_my_event_allowance() to authenticated;

create or replace function private.prepare_event_allowance_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  actor_id uuid := auth.uid();
  owner_id uuid;
begin
  if actor_id is not null then
    select coalesce(
      (
        select am.account_owner_id
        from public.account_members am
        where am.member_user_id = actor_id
          and am.access_disabled_at is null
        order by am.invited_at asc
        limit 1
      ),
      actor_id
    ) into owner_id;

    if new.user_id is distinct from actor_id or owner_id is distinct from actor_id then
      raise exception using
        errcode = 'P0001',
        message = 'WW_EVENT_MASTER_REQUIRED';
    end if;
  end if;

  new.created_date_local := current_date;
  new.expiry_date_local := (current_date + interval '1 year')::date;
  return new;
end;
$function$;

create or replace function private.reserve_event_allowance_slot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  allowance record;
  candidate integer;
  reserved integer;
begin
  select * into allowance
  from private.resolve_event_allowance(new.user_id);

  if allowance.can_create is not true then
    raise exception using
      errcode = 'P0001',
      message = 'WW_EVENT_PLAN_INACTIVE';
  end if;

  delete from private.event_allowance_slots s
  where s.owner_id = new.user_id
    and s.expires_on is not null
    and s.expires_on < current_date;

  if allowance.total_allowed < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'WW_EVENT_LIMIT_REACHED';
  end if;

  for candidate in 1..allowance.total_allowed loop
    reserved := null;
    insert into private.event_allowance_slots (owner_id, event_id, slot_number, expires_on)
    values (new.user_id, new.id, candidate, new.expiry_date_local)
    on conflict do nothing
    returning slot_number into reserved;

    if reserved is not null then
      return new;
    end if;
  end loop;

  raise exception using
    errcode = 'P0001',
    message = 'WW_EVENT_LIMIT_REACHED';
end;
$function$;

create or replace function private.protect_event_allowance_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  if auth.uid() is not null
    and (
      new.user_id is distinct from old.user_id
      or new.created_date_local is distinct from old.created_date_local
      or new.expiry_date_local is distinct from old.expiry_date_local
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'WW_EVENT_LIFECYCLE_IMMUTABLE';
  end if;
  return new;
end;
$function$;

revoke all on function private.prepare_event_allowance_insert() from public, anon, authenticated;
revoke all on function private.reserve_event_allowance_slot() from public, anon, authenticated;
revoke all on function private.protect_event_allowance_lifecycle() from public, anon, authenticated;

drop trigger if exists prepare_event_allowance_insert on public.events;
create trigger prepare_event_allowance_insert
before insert on public.events
for each row execute function private.prepare_event_allowance_insert();

drop trigger if exists reserve_event_allowance_slot on public.events;
create trigger reserve_event_allowance_slot
after insert on public.events
for each row execute function private.reserve_event_allowance_slot();

drop trigger if exists protect_event_allowance_lifecycle on public.events;
create trigger protect_event_allowance_lifecycle
before update on public.events
for each row execute function private.protect_event_allowance_lifecycle();

-- Preserve every existing active event. Slot numbers above a newly reduced base
-- allowance are retained; no customer event or purchase is changed or removed.
with ranked as (
  select
    e.user_id as owner_id,
    e.id as event_id,
    e.expiry_date_local as expires_on,
    row_number() over (
      partition by e.user_id
      order by e.created_at asc, e.id asc
    )::integer as slot_number
  from public.events e
  where e.expiry_date_local is null or e.expiry_date_local >= current_date
)
insert into private.event_allowance_slots (owner_id, event_id, slot_number, expires_on)
select owner_id, event_id, slot_number, expires_on
from ranked
on conflict do nothing;

comment on function public.get_my_event_allowance() is
  'Returns the authenticated account active-event allowance. SECURITY INVOKER; no arguments and no cross-account access.';
comment on table private.event_allowance_slots is
  'Transaction-safe active-event slot reservations. Unique owner/slot rows prevent concurrent inserts from exceeding allowance.';

commit;
