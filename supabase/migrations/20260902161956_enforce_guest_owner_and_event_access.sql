create or replace function public.can_access_event(_user_id uuid, _event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(_user_id, 'admin'::public.app_role)
  or exists (
    select 1
    from public.events e
    where e.id = _event_id
      and e.user_id = _user_id
      and public.is_account_operational(_user_id)
  )
  or exists (
    select 1
    from public.event_collaborators ec
    join public.events e on e.id = ec.event_id
    where ec.event_id = _event_id
      and ec.user_id = _user_id
      and public.is_account_operational(_user_id)
      and public.is_account_operational(e.user_id)
  )
  or exists (
    select 1
    from public.account_members am
    join public.events e on e.user_id = am.account_owner_id
    where am.member_user_id = _user_id
      and am.accepted_at is not null
      and am.access_disabled_at is null
      and e.id = _event_id
      and public.is_account_operational(_user_id)
      and public.is_account_operational(am.account_owner_id)
  );
$$;

revoke all on function public.can_access_event(uuid, uuid) from public, anon;
grant execute on function public.can_access_event(uuid, uuid) to authenticated, service_role;

alter table public.guests
  drop constraint guests_event_id_fkey;

alter table public.guests
  add constraint guests_event_owner_fkey
  foreign key (event_id, user_id)
  references public.events (id, user_id)
  on delete cascade;

create or replace function public.prevent_guest_owner_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.event_id is distinct from old.event_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Guest event ownership cannot be changed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_guest_owner_change() from public, anon, authenticated;

create trigger guests_prevent_owner_change
before update of event_id, user_id on public.guests
for each row execute function public.prevent_guest_owner_change();

drop policy "Users can view guests for their events" on public.guests;
drop policy "Users can create guests for their events" on public.guests;
drop policy "Users can update guests for their events" on public.guests;
drop policy "Users can delete guests for their events" on public.guests;

create policy "Event access reads guests"
on public.guests for select
to authenticated
using (public.can_access_event((select auth.uid()), event_id));

create policy "Event access creates owner guests"
on public.guests for insert
to authenticated
with check (public.can_access_event((select auth.uid()), event_id));

create policy "Event access updates owner guests"
on public.guests for update
to authenticated
using (public.can_access_event((select auth.uid()), event_id))
with check (public.can_access_event((select auth.uid()), event_id));

create policy "Event access deletes guests"
on public.guests for delete
to authenticated
using (public.can_access_event((select auth.uid()), event_id));
