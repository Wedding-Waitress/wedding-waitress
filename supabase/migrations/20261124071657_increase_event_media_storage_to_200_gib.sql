-- Prepared locally; does not alter Supabase billing, spend cap or file/count limits.
-- Keep the application's existing binary GB convention (GiB internally).
begin;
alter table public.event_media_limits drop constraint if exists event_media_approved_storage_cap;
alter table public.event_media_limits alter column max_total_bytes set default 214748364800;
-- The approved allowance covers existing events, including expired accounts.
do $$
declare previous_role text := current_setting('request.jwt.claim.role',true);
begin
 perform set_config('request.jwt.claim.role','service_role',true);
 update public.event_media_limits set max_total_bytes=214748364800,updated_at=now();
 perform set_config('request.jwt.claim.role',coalesce(previous_role,''),true);
end $$;
alter table public.event_media_limits add constraint event_media_approved_storage_cap
check(max_total_bytes between 1 and 214748364800);
commit;
