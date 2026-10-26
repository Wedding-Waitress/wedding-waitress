-- QA ONLY: project ckmgjbwifbzzknnyxzqe. Never apply to production.
-- Bootstrap an empty branch's DISABLED business launch hold without granting admin access.
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM auth.users)
 OR EXISTS (SELECT 1 FROM private.platform_owners)
 OR EXISTS (SELECT 1 FROM private.prelaunch_control)
 OR (SELECT max(version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM '20261026100500'
 THEN RAISE EXCEPTION 'Expected the verified empty QA branch after postal-privacy migration'; END IF;
END $guard$;
ALTER TABLE private.prelaunch_control ALTER COLUMN owner_user_id DROP NOT NULL;
ALTER TABLE private.prelaunch_control ADD CONSTRAINT qa_disabled_hold_without_owner CHECK (owner_user_id IS NOT NULL OR enabled=false);
INSERT INTO private.prelaunch_control(singleton,enabled,owner_user_id) VALUES(true,false,NULL);
-- All Auth verification, account authorization and RLS protections remain installed.
-- After a controlled QA Auth user exists, bind this disabled switch to that user,
-- restore owner_user_id NOT NULL, and remove qa_disabled_hold_without_owner.
-- A control-row reference itself does not confer platform-owner/admin access.
