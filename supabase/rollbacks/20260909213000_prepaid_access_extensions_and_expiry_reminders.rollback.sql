-- Roll back the paid-access lifecycle and extension fulfillment migration.
-- This restores the previous 30-day download-only behavior; it does not undo
-- any access time already purchased and written to user_subscriptions.

drop function if exists public.complete_access_expiry_reminder(bigint,boolean,text,text,text);
drop function if exists public.claim_access_expiry_reminders(integer);
drop function if exists public.schedule_access_expiry_reminders();
drop function if exists public.get_access_recovery_storage_objects(bigint);
drop function if exists public.complete_access_recovery_cleanup(bigint,boolean,text);
drop function if exists public.prepare_expired_access_purge(bigint);
drop function if exists public.claim_access_recovery_cleanup(integer);
drop function if exists public.schedule_access_recovery_cleanup();
drop function if exists public.fulfill_access_extension(text,uuid,integer,integer,text,text);
drop function if exists public.get_my_paid_access_state();
drop table if exists public.access_expiry_reminders;
drop table if exists public.access_recovery_cleanup_jobs;
drop table if exists public.access_extension_purchases;
drop trigger if exists set_access_recovery_deadline on public.user_subscriptions;
drop function if exists public.set_access_recovery_deadline();
alter table public.user_subscriptions drop column if exists access_recovery_ends_at;

alter table public.user_subscriptions
  alter column download_only_ends_at set default (now() + interval '30 days');
update public.user_subscriptions
set download_only_ends_at = expires_at + interval '30 days'
where download_only_ends_at is null;

create or replace function public.set_subscription_download_window()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.expires_at is distinct from old.expires_at or new.download_only_ends_at is null then
    new.download_only_ends_at := new.expires_at + interval '30 days';
  end if;
  return new;
end;
$$;
revoke all on function public.set_subscription_download_window() from public, anon, authenticated;
create trigger set_subscription_download_window
before insert or update of expires_at, download_only_ends_at on public.user_subscriptions
for each row execute function public.set_subscription_download_window();

create or replace function public.refresh_my_subscription_lifecycle()
returns table(status text,is_read_only boolean,expires_at timestamptz,download_only_ends_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  update public.user_subscriptions us
     set status=case when now()<=us.expires_at then us.status when now()<=coalesce(us.download_only_ends_at,us.expires_at+interval '30 days') then 'grace_period' else 'expired' end,
         is_read_only=case when now()>us.expires_at then true else us.is_read_only end,
         download_only_ends_at=coalesce(us.download_only_ends_at,us.expires_at+interval '30 days'),updated_at=now()
   where us.user_id=owner_id;
  return query select us.status,us.is_read_only,us.expires_at,us.download_only_ends_at from public.user_subscriptions us where us.user_id=owner_id limit 1;
end;
$$;
revoke all on function public.refresh_my_subscription_lifecycle() from public, anon;
grant execute on function public.refresh_my_subscription_lifecycle() to authenticated;

create or replace function public.subscription_allows_event_edit(owner_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.user_subscriptions us where us.user_id=owner_id
    and us.status='active' and us.is_read_only=false and now()<=us.expires_at);
$$;
revoke all on function public.subscription_allows_event_edit(uuid) from public,anon,authenticated;

create or replace function public.is_account_operational(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((
    select l.status not in ('scheduled_for_deletion','permanently_deleted')
    from public.account_lifecycle l
    where l.account_owner_id=coalesce((
      select am.account_owner_id from public.account_members am
      where am.member_user_id=p_user_id and am.access_disabled_at is null
      order by (am.role='master') desc,am.invited_at limit 1
    ),p_user_id)
  ),true);
$$;
revoke all on function public.is_account_operational(uuid) from public, anon;
grant execute on function public.is_account_operational(uuid) to authenticated, service_role;

create or replace function public.guard_expired_event_mutation()
returns trigger language plpgsql security definer set search_path = public
as $$
declare payload jsonb := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
declare owner_id uuid; declare event_uuid uuid;
begin
  if auth.role()='service_role' then return case when tg_op='DELETE' then old else new end; end if;
  if tg_table_name='events' then owner_id:=nullif(payload->>'user_id','')::uuid;
  else event_uuid:=nullif(payload->>'event_id','')::uuid; if event_uuid is not null then select e.user_id into owner_id from public.events e where e.id=event_uuid; end if; end if;
  if owner_id is not null and not public.subscription_allows_event_edit(owner_id) then
    raise exception 'Paid planning access has ended. This account is download-only.' using errcode='42501';
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function public.guard_expired_event_mutation() from public, anon, authenticated;
