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
  select c.id,c.user_id,c.expires_at,c.channel::text,au.email::text,ov.phone_e164::text,c.attempts
  from claimed c join auth.users au on au.id=c.user_id
  left join public.organiser_phone_verifications ov on ov.user_id=c.user_id;
end;
$$;
revoke all on function public.claim_access_expiry_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_access_expiry_reminders(integer) to service_role;

