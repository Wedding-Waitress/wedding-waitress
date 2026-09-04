-- Rollback-only RLS verification for 20260902121937.
-- Direct storage.objects writes are used only inside this rolled-back transaction
-- to exercise metadata RLS; real object verification must use the Storage API.
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'event-branding-owner@example.invalid', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'event-branding-other@example.invalid', '', now(), now(), now());

insert into public.onboarding_drafts (id, user_id, mode, answers, current_step)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'additional_event',
  '{"eventImagePath":"10000000-0000-0000-0000-000000000001/drafts/20000000-0000-0000-0000-000000000001/photo.jpg"}'::jsonb,
  3
);

insert into public.events (id, user_id, name, event_image_path, event_image_fit)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Event branding policy test',
  '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/logo.png',
  'contain'
);

insert into public.event_collaborators (event_id, user_id, role, invited_by)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'viewer',
  '10000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

do $$
begin
  if not event_branding_private.object_is_referenced(
    '10000000-0000-0000-0000-000000000001/drafts/20000000-0000-0000-0000-000000000001/photo.jpg'
  ) then
    raise exception 'active draft reference was not detected';
  end if;
  if not event_branding_private.object_is_referenced(
    '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/logo.png'
  ) then
    raise exception 'event reference was not detected';
  end if;
end $$;

insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'event-branding',
  '10000000-0000-0000-0000-000000000001/drafts/20000000-0000-0000-0000-000000000001/photo.jpg',
  '10000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/jpeg","size":1024}'::jsonb
);

update storage.objects
set metadata = '{"mimetype":"image/jpeg","size":2048}'::jsonb
where bucket_id = 'event-branding'
  and name = '10000000-0000-0000-0000-000000000001/drafts/20000000-0000-0000-0000-000000000001/photo.jpg';

insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'event-branding',
  '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/logo.png',
  '10000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/png","size":1024}'::jsonb
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
do $$
declare affected integer;
begin
  select count(*) into affected
  from storage.objects
  where bucket_id = 'event-branding'
    and name like '10000000-0000-0000-0000-000000000001/drafts/%';
  if affected <> 0 then raise exception 'non-owner read a private draft object'; end if;

  select count(*) into affected
  from storage.objects
  where bucket_id = 'event-branding'
    and name = '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/logo.png';
  if affected <> 0 then raise exception 'viewer read event branding outside existing event-row access rules'; end if;

  update storage.objects
  set metadata = '{"mimetype":"image/png","size":4096}'::jsonb
  where bucket_id = 'event-branding'
    and name = '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/logo.png';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'viewer updated event branding'; end if;

  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'event-branding',
      '10000000-0000-0000-0000-000000000001/events/30000000-0000-0000-0000-000000000001/other.jpg',
      '10000000-0000-0000-0000-000000000002',
      '{"mimetype":"image/jpeg","size":1024}'::jsonb
    );
    raise exception 'non-owner event upload succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
update public.onboarding_drafts
set answers = answers - 'eventImagePath'
where id = '20000000-0000-0000-0000-000000000001';

do $$
begin
  if event_branding_private.object_is_referenced(
    '10000000-0000-0000-0000-000000000001/drafts/20000000-0000-0000-0000-000000000001/photo.jpg'
  ) then
    raise exception 'cleared draft reference was still reported as active';
  end if;
end $$;

reset role;
rollback;
