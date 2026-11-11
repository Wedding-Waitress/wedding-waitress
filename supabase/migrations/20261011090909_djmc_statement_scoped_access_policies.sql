-- The five account-level checks depend only on auth.uid(), not on each row.
-- Wrapping the complete existing expression in a scalar SELECT gives Postgres
-- an InitPlan. It does not cache across statements, sessions, users or commits.
-- Preserve policy roles, commands, restrictive/permissive mode, and all
-- row-dependent ownership/event policies.
DO $$
DECLARE policy record; expected text; changed integer:=0;
BEGIN
 FOR policy IN
  SELECT p.*,c.relname,pg_get_expr(p.polqual,p.polrelid) AS qual,
   pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr
  FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('dj_mc_questionnaires','dj_mc_sections','dj_mc_items')
   AND p.polname IN ('Admin deletion blocks planning access','Closed account blocks planning access',
    'Current entitlement required for planning','Prelaunch verified owner access','Suspension blocks planning access')
 LOOP
  expected:=CASE policy.polname
   WHEN 'Admin deletion blocks planning access' THEN 'private.admin_deleted_planning_blocked'
   WHEN 'Closed account blocks planning access' THEN 'private.closed_account_planning_blocked'
   WHEN 'Current entitlement required for planning' THEN 'private.customer_entitlement_blocked'
   WHEN 'Prelaunch verified owner access' THEN 'private.prelaunch_access_allowed'
   WHEN 'Suspension blocks planning access' THEN 'private.account_planning_blocked' END;
  IF policy.polpermissive OR policy.polcmd<>'*' OR policy.qual IS NULL OR policy.check_expr IS NULL
   OR position(expected IN policy.qual)=0 OR position(expected IN policy.check_expr)=0 THEN
   RAISE EXCEPTION 'Unexpected account policy definition: %.%',policy.relname,policy.polname;
  END IF;
  EXECUTE format('ALTER POLICY %I ON public.%I USING ((SELECT %s)) WITH CHECK ((SELECT %s))',
   policy.polname,policy.relname,policy.qual,policy.check_expr);
  changed:=changed+1;
 END LOOP;
 IF changed<>15 THEN RAISE EXCEPTION 'Expected 15 DJMC account policies, found %',changed; END IF;
END $$;
