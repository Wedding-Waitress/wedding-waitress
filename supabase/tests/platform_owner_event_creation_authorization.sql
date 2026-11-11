begin;

do $verification$
declare
  owner_id uuid;
  allowance record;
  account record;
  ordinary_can_create boolean;
  slot_function text;
begin
  select user_id into owner_id
  from private.platform_owners
  where singleton;

  if owner_id is null then
    raise exception 'Platform Owner entitlement is missing';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  select * into allowance from public.get_my_event_allowance();

  if allowance.can_create is not true or allowance.at_cap is not false then
    raise exception 'Platform Owner event allowance bypass is not active';
  end if;

  select pg_get_functiondef('private.reserve_event_allowance_slot()'::regprocedure)
  into slot_function;

  if position('private.is_platform_owner(new.user_id)' in slot_function) = 0 then
    raise exception 'Platform Owner insert-trigger bypass is not active';
  end if;
  if position('WW_EVENT_PLAN_INACTIVE' in slot_function) = 0
     or position('WW_EVENT_LIMIT_REACHED' in slot_function) = 0 then
    raise exception 'Ordinary account event-creation guards are missing';
  end if;

  for account in
    select
      us.user_id,
      us.status = 'active'
        and not coalesce(us.is_read_only, false)
        and (us.expires_at is null or us.expires_at >= clock_timestamp()) as expected_can_create
    from public.user_subscriptions us
    where not private.is_platform_owner(us.user_id)
  loop
    select can_create into ordinary_can_create
    from private.resolve_event_allowance(account.user_id);

    if ordinary_can_create is distinct from account.expected_can_create then
      raise exception 'Ordinary account event-creation rule changed unexpectedly';
    end if;
  end loop;
end
$verification$;

select
  true as platform_owner_event_creation_authorization_verified,
  count(*) filter (
    where us.status = 'active'
      and not coalesce(us.is_read_only, false)
      and (us.expires_at is null or us.expires_at >= clock_timestamp())
  ) as ordinary_active_accounts_checked,
  count(*) filter (
    where us.status <> 'active'
      or coalesce(us.is_read_only, false)
      or (us.expires_at is not null and us.expires_at < clock_timestamp())
  ) as ordinary_inactive_accounts_checked
from public.user_subscriptions us
where not private.is_platform_owner(us.user_id);

rollback;
