-- Secure event photo/logo support for Guided Event Setup and My Events.
-- This migration is local-only until explicitly approved for remote application.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.events
  add column event_image_path text,
  add column event_image_fit text not null default 'cover',
  add column event_image_position_x smallint not null default 50,
  add column event_image_position_y smallint not null default 50;

alter table public.events
  add constraint events_event_image_fit_check
    check (event_image_fit in ('cover', 'contain')),
  add constraint events_event_image_position_x_check
    check (event_image_position_x between 0 and 100),
  add constraint events_event_image_position_y_check
    check (event_image_position_y between 0 and 100),
  add constraint events_event_image_owner_path_check
    check (
      event_image_path is null
      or (
        split_part(event_image_path, '/', 1) = user_id::text
        and split_part(event_image_path, '/', 2) in ('drafts', 'events')
      )
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-branding',
  'event-branding',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reference checks must see all rows owned by the caller, even when invoked from
-- a storage.objects policy. Keep this helper outside exposed schemas and bind it
-- to auth.uid() so it cannot be used to inspect another customer's references.
create schema event_branding_private;
revoke all on schema event_branding_private from public;
grant usage on schema event_branding_private to authenticated;

create function event_branding_private.object_is_referenced(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is null
    or split_part(object_name, '/', 1) <> (select auth.uid())::text
    or exists (
      select 1
      from public.events e
      where e.user_id = (select auth.uid())
        and e.event_image_path = object_name
    )
    or exists (
      select 1
      from public.onboarding_drafts d
      where d.user_id = (select auth.uid())
        and d.completed_at is null
        and d.answers ->> 'eventImagePath' = object_name
    );
$$;

revoke all on function event_branding_private.object_is_referenced(text) from public, anon;
grant execute on function event_branding_private.object_is_referenced(text) to authenticated;

create policy "Customers read accessible event branding"
on storage.objects for select to authenticated
using (
  bucket_id = 'event-branding'
  and (
    (
      (storage.foldername(storage.objects.name))[2] = 'drafts'
      and exists (
        select 1 from public.onboarding_drafts d
        where d.id::text = (storage.foldername(storage.objects.name))[3]
          and d.user_id = (select auth.uid())
          and d.user_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
    or (
      (storage.foldername(storage.objects.name))[2] = 'events'
      and (
        (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
        or exists (
          select 1 from public.events e
          where e.id::text = (storage.foldername(storage.objects.name))[3]
            and e.user_id::text = (storage.foldername(storage.objects.name))[1]
            and public.can_access_event((select auth.uid()), e.id)
        )
      )
    )
    or exists (
      select 1 from public.events e
      where e.event_image_path = storage.objects.name
        and e.user_id::text = (storage.foldername(storage.objects.name))[1]
        and public.can_access_event((select auth.uid()), e.id)
    )
  )
);

create policy "Customers upload accessible event branding"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'event-branding'
  and (
    (
      (storage.foldername(storage.objects.name))[2] = 'drafts'
      and exists (
        select 1 from public.onboarding_drafts d
        where d.id::text = (storage.foldername(storage.objects.name))[3]
          and d.user_id = (select auth.uid())
          and d.user_id::text = (storage.foldername(storage.objects.name))[1]
          and d.completed_at is null
      )
    )
    or (
      (storage.foldername(storage.objects.name))[2] = 'events'
      and exists (
        select 1 from public.events e
        where e.id::text = (storage.foldername(storage.objects.name))[3]
          and e.user_id = (select auth.uid())
          and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
      )
    )
  )
);

create policy "Customers update accessible event branding"
on storage.objects for update to authenticated
using (
  bucket_id = 'event-branding'
  and (
    (
      (storage.foldername(storage.objects.name))[2] = 'drafts'
      and exists (
        select 1 from public.onboarding_drafts d
        where d.id::text = (storage.foldername(storage.objects.name))[3]
          and d.user_id = (select auth.uid())
          and d.user_id::text = (storage.foldername(storage.objects.name))[1]
          and d.completed_at is null
      )
    )
    or (
      (storage.foldername(storage.objects.name))[2] = 'events'
      and exists (
        select 1 from public.events e
        where e.id::text = (storage.foldername(storage.objects.name))[3]
          and e.user_id = (select auth.uid())
          and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
      )
    )
  )
)
with check (
  bucket_id = 'event-branding'
  and (
    (
      (storage.foldername(storage.objects.name))[2] = 'drafts'
      and exists (
        select 1 from public.onboarding_drafts d
        where d.id::text = (storage.foldername(storage.objects.name))[3]
          and d.user_id = (select auth.uid())
          and d.user_id::text = (storage.foldername(storage.objects.name))[1]
          and d.completed_at is null
      )
    )
    or (
      (storage.foldername(storage.objects.name))[2] = 'events'
      and exists (
        select 1 from public.events e
        where e.id::text = (storage.foldername(storage.objects.name))[3]
          and e.user_id = (select auth.uid())
          and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
      )
    )
  )
);

create policy "Customers delete accessible event branding"
on storage.objects for delete to authenticated
using (
  bucket_id = 'event-branding'
  and (
    (
      (storage.foldername(storage.objects.name))[2] = 'drafts'
      and exists (
        select 1 from public.onboarding_drafts d
        where d.id::text = (storage.foldername(storage.objects.name))[3]
          and d.user_id = (select auth.uid())
          and d.user_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
    or (
      (storage.foldername(storage.objects.name))[2] = 'events'
      and exists (
        select 1 from public.events e
        where e.id::text = (storage.foldername(storage.objects.name))[3]
          and e.user_id = (select auth.uid())
          and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
      )
    )
  )
  and not event_branding_private.object_is_referenced(storage.objects.name)
);

comment on column public.events.event_image_path is
  'Private event-branding object path. The first path segment must be the owning account user id.';
comment on column public.events.event_image_fit is
  'Display mode for the event photo/logo: cover fills the frame and contain fits a logo.';

notify pgrst, 'reload schema';
commit;
