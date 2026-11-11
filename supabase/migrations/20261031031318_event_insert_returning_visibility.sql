-- A STABLE helper that queries events by id cannot see the row being checked
-- during INSERT ... RETURNING. Authorize using the checked row's owner instead.
-- The existing planning-owner resolver and restrictive access policies remain.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER POLICY "Account team reads events" ON public.events
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    user_id = (SELECT public.current_planning_account_owner())
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  )
);
NOTIFY pgrst, 'reload schema';
COMMIT;
