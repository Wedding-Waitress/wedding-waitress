-- Prepared recovery script for 20260902121937_add_secure_event_branding.sql.
-- Run only in an approved maintenance window. The private bucket is retained so
-- rollback cannot orphan stored files; remove an empty bucket through Storage API.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

drop policy if exists "Customers delete accessible event branding" on storage.objects;
drop policy if exists "Customers update accessible event branding" on storage.objects;
drop policy if exists "Customers upload accessible event branding" on storage.objects;
drop policy if exists "Customers read accessible event branding" on storage.objects;

drop function if exists event_branding_private.object_is_referenced(text);
drop schema if exists event_branding_private;

alter table public.events
  drop constraint if exists events_event_image_owner_path_check,
  drop constraint if exists events_event_image_position_y_check,
  drop constraint if exists events_event_image_position_x_check,
  drop constraint if exists events_event_image_fit_check,
  drop column if exists event_image_position_y,
  drop column if exists event_image_position_x,
  drop column if exists event_image_fit,
  drop column if exists event_image_path;

notify pgrst, 'reload schema';
commit;
