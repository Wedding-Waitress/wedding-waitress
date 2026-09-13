-- Data-preserving rollback. Keep customer-visible reasons, identifier review
-- records and support replies for audit/recovery; do not delete customer data.
begin;
alter role authenticator reset pgrst.db_pre_request;
drop trigger if exists check_suspended_registration on auth.users;
drop trigger if exists review_suspended_registration on auth.users;
drop trigger if exists protect_suspension_control on public.admin_account_controls;
drop trigger if exists release_suspension_identifiers on public.admin_account_controls;
drop policy if exists "Suspension blocks table planning" on public.tables;
drop policy if exists "Suspension blocks storage access" on storage.objects;
do $$ declare target record; begin
 for target in select schemaname,tablename from pg_policies where schemaname='public' and policyname='Suspension blocks planning access' loop
  execute format('drop policy "Suspension blocks planning access" on %I.%I',target.schemaname,target.tablename);
 end loop;
end; $$;
-- Retain private records and definitions, but withdraw the new public APIs.
revoke all on function public.get_my_account_access(),public.reply_to_account_suspension(text,uuid),public.admin_get_account_access_detail(uuid),public.admin_suspend_account(uuid,text,text,uuid),public.admin_approve_signup_review(uuid,text,uuid),public.is_account_suspension_blocked(uuid) from public,anon,authenticated,service_role;
create or replace function public.is_account_operational(p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 with owner as (select coalesce((select am.account_owner_id from public.account_members am where am.member_user_id=p_user_id and am.access_disabled_at is null order by (am.role='master') desc,am.invited_at limit 1),p_user_id) id)
 select coalesce((select l.status not in ('scheduled_for_deletion','permanently_deleted') from public.account_lifecycle l,owner o where l.account_owner_id=o.id),true)
 and coalesce((select c.status<>'suspended' from public.admin_account_controls c,owner o where c.account_owner_id=o.id),true);
$$;
-- Revert the matching Edge/client release before using legacy suspension again.
notify pgrst,'reload config';
notify pgrst,'reload schema';
commit;
