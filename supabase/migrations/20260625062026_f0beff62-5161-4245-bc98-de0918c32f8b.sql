
ALTER FUNCTION public.profiles_account_id_immutable() SET search_path = public;
ALTER FUNCTION public.events_event_id_immutable() SET search_path = public;

-- admin_otp_codes: RLS enabled but no policy. Lock down to service_role only.
-- Edge functions use service_role and bypass RLS; this policy makes intent explicit
-- and denies anon/authenticated access at the policy layer.
DROP POLICY IF EXISTS "admin_otp_codes_no_client_access" ON public.admin_otp_codes;
CREATE POLICY "admin_otp_codes_no_client_access"
ON public.admin_otp_codes
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
