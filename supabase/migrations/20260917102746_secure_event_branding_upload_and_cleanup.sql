-- Restore the qualified event-branding path checks overwritten by the account
-- team authorization migration. Keep the bucket private and leave the global
-- restrictive entitlement, suspension, and prelaunch policies unchanged.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter policy "Customers read accessible event branding"
on storage.objects
using (
  bucket_id = 'event-branding'
  and (
    (
      split_part(storage.objects.name, '/', 2) = 'drafts'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.onboarding_drafts d
        where d.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and d.user_id = (select auth.uid())
          and d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
      )
    )
    or (
      split_part(storage.objects.name, '/', 2) = 'events'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.events e
        where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and public.can_access_event((select auth.uid()), e.id)
      )
    )
  )
);

alter policy "Customers upload accessible event branding"
on storage.objects
with check (
  bucket_id = 'event-branding'
  and (
    (
      split_part(storage.objects.name, '/', 2) = 'drafts'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.onboarding_drafts d
        where d.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and d.user_id = (select auth.uid())
          and d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and d.completed_at is null
      )
    )
    or (
      split_part(storage.objects.name, '/', 2) = 'events'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.events e
        where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and public.can_access_event((select auth.uid()), e.id)
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
      split_part(storage.objects.name, '/', 2) = 'drafts'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.onboarding_drafts d
        where d.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and d.user_id = (select auth.uid())
          and d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and d.completed_at is null
      )
    )
    or (
      split_part(storage.objects.name, '/', 2) = 'events'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.events e
        where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and public.can_access_event((select auth.uid()), e.id)
      )
    )
  )
)
with check (
  bucket_id = 'event-branding'
  and (
    (
      split_part(storage.objects.name, '/', 2) = 'drafts'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.onboarding_drafts d
        where d.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and d.user_id = (select auth.uid())
          and d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and d.completed_at is null
      )
    )
    or (
      split_part(storage.objects.name, '/', 2) = 'events'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.events e
        where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
          and public.can_access_event((select auth.uid()), e.id)
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
      split_part(storage.objects.name, '/', 2) = 'drafts'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and exists (
        select 1
        from public.onboarding_drafts d
        where d.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          and d.user_id = (select auth.uid())
          and d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
      )
    )
    or (
      split_part(storage.objects.name, '/', 2) = 'events'
      and split_part(storage.objects.name, '/', 4) <> ''
      and split_part(storage.objects.name, '/', 5) = ''
      and (
        exists (
          select 1
          from public.events e
          where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
            and e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))
            and public.can_access_event((select auth.uid()), e.id)
        )
        or (
          public.safe_uuid(split_part(storage.objects.name, '/', 1)) = (select auth.uid())
          and not exists (
            select 1
            from public.events e
            where e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))
          )
        )
      )
    )
  )
  and not event_branding_private.object_is_referenced(storage.objects.name)
);

commit;
