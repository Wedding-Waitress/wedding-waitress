begin;

drop policy "Event access reads guests" on public.guests;
drop policy "Event access creates owner guests" on public.guests;
drop policy "Event access updates owner guests" on public.guests;
drop policy "Event access deletes guests" on public.guests;

create policy "Users can view guests for their events"
on public.guests for select
using (auth.uid() = user_id);

create policy "Users can create guests for their events"
on public.guests for insert
with check (auth.uid() = user_id);

create policy "Users can update guests for their events"
on public.guests for update
using (auth.uid() = user_id);

create policy "Users can delete guests for their events"
on public.guests for delete
using (auth.uid() = user_id);

drop trigger guests_prevent_owner_change on public.guests;
drop function public.prevent_guest_owner_change();

alter table public.guests
  drop constraint guests_event_owner_fkey;

alter table public.guests
  add constraint guests_event_id_fkey
  foreign key (event_id)
  references public.events (id)
  on delete cascade;

create or replace function public.can_access_event(_user_id uuid, _event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(_user_id, 'admin'::public.app_role)
  or exists (
    select 1 from public.events e
    where e.id = _event_id and e.user_id = _user_id
      and public.is_account_operational(_user_id)
  )
  or exists (
    select 1 from public.event_collaborators ec
    join public.events e on e.id = ec.event_id
    where ec.event_id = _event_id and ec.user_id = _user_id
      and public.is_account_operational(e.user_id)
  )
  or exists (
    select 1 from public.account_members am
    join public.events e on e.user_id = am.account_owner_id
    where am.member_user_id = _user_id
      and am.access_disabled_at is null
      and e.id = _event_id
      and public.is_account_operational(am.account_owner_id)
  );
$$;

grant execute on function public.can_access_event(uuid, uuid)
to public, anon, authenticated, service_role;

commit;
