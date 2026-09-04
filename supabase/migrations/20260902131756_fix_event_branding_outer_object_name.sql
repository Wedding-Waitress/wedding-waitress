-- Qualify the outer storage object name inside event subqueries. Without this,
-- PostgreSQL binds unqualified `name` to public.events.name.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter policy "Customers read accessible event branding"
on storage.objects
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

alter policy "Customers upload accessible event branding"
on storage.objects
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

alter policy "Customers update accessible event branding"
on storage.objects
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

alter policy "Customers delete accessible event branding"
on storage.objects
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

commit;
