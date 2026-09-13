-- Revert only the newly introduced enhanced reporting endpoint. The original
-- get_admin_centre_snapshot remains intact. No customer or business data changes.
drop function if exists public.get_admin_platform_snapshot();
