-- Extend the existing UUID-backed platform-owner entitlement through every
-- authoritative event-creation allowance check. Ordinary account rules remain
-- unchanged; the singleton entitlement remains private and backend-controlled.

begin;

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
      when private.is_platform_owner(p_owner_id) then true
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
      public.has_platform_owner_access() as is_platform_owner,
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
      is_platform_owner,
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
    case
      when u.is_platform_owner then false
      else u.active_events >= (u.included_events + u.paid_additional_events)
    end as at_cap,
    u.plan_key in ('essential', 'premium', 'unlimited') as can_purchase_additional_events,
    case
      when u.is_platform_owner then true
      when not u.has_subscription then true
      else u.status = 'active'
        and not u.is_read_only
        and (u.expires_at is null or u.expires_at >= clock_timestamp())
    end as can_create
  from usage u;
$function$;

revoke all on function public.get_my_event_allowance() from public, anon;
grant execute on function public.get_my_event_allowance() to authenticated;

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
  -- The private singleton UUID is the sole unlimited-creation entitlement.
  if private.is_platform_owner(new.user_id) then
    return new;
  end if;

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

revoke all on function private.reserve_event_allowance_slot() from public, anon, authenticated;

comment on function public.get_my_event_allowance() is
  'Returns the authenticated account active-event allowance, including the private UUID-backed platform-owner creation entitlement.';

commit;

notify pgrst, 'reload schema';
