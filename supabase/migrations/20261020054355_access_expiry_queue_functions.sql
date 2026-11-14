-- Install the missing service-only reminder queue functions; preserve paid access and owner data.
create or replace function public.schedule_access_expiry_reminders()
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$
declare inserted_count integer;
begin
  if coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
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
   where private.is_platform_owner(us.user_id) is distinct from true
     and us.status in ('active','trial')
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
  if coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  update public.access_expiry_reminders r
     set status = 'stale', updated_at = now(), last_error = 'Subscription expiry changed'
   where r.status in ('pending','failed','processing')
     and not exists (select 1 from public.user_subscriptions us where us.user_id=r.user_id and us.expires_at=r.expires_at and us.status in ('active','trial'));

  return query
  with candidates as (
    select r.id from public.access_expiry_reminders r
    join public.user_subscriptions us on us.user_id=r.user_id and us.expires_at=r.expires_at
    where r.status in ('pending','failed') and r.available_at <= now() and r.attempts < 5
      and us.status in ('active','trial') and us.expires_at>now()
      and private.is_platform_owner(us.user_id) is distinct from true
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
  if coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then raise exception 'Service role required' using errcode='42501'; end if;
  if _accepted and (_provider not in ('resend','twilio') or _provider is null or nullif(_provider_id,'') is null) then raise exception 'Provider acceptance identity required'; end if;
  update public.access_expiry_reminders r
     set status=case when _accepted then 'queued' else 'failed' end,
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

