-- communication_usage: remove user INSERT, restrict to service_role
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.communication_usage;

CREATE POLICY "Service role can insert usage logs"
  ON public.communication_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- rsvp_invite_logs: remove user INSERT, restrict to service_role
DROP POLICY IF EXISTS "Users can insert their own rsvp invite logs" ON public.rsvp_invite_logs;
DROP POLICY IF EXISTS "Users can insert their own invite logs" ON public.rsvp_invite_logs;
DROP POLICY IF EXISTS "Users can create rsvp invite logs" ON public.rsvp_invite_logs;
DROP POLICY IF EXISTS "Users can insert rsvp invite logs" ON public.rsvp_invite_logs;

CREATE POLICY "Service role can insert rsvp invite logs"
  ON public.rsvp_invite_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);