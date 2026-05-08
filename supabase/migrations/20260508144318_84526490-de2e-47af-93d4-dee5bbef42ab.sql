-- Master-only destructive guards (Phase 1 admin gating)
-- Replaces events DELETE policy to require account-master role.
-- Backwards compatible: every existing subscription owner is already
-- a master member of their own account (backfilled in prior migration),
-- so existing self-deletes continue to work.

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;

CREATE POLICY "Master can delete own events"
  ON public.events FOR DELETE
  USING (
    auth.uid() = user_id
    AND public.is_account_master(auth.uid())
  );