
COMMENT ON TABLE public.admin_otp_codes IS
'SECURITY: Intentionally has NO RLS policies. RLS is enabled which means NO role (anon, authenticated) can read or write through the API. All reads/writes happen exclusively server-side via SECURITY DEFINER edge functions (admin-send-otp, admin-verify-otp) using the service role key. DO NOT add anon or authenticated policies — that would expose OTP code_hash values and allow brute-force / replay attacks against admin login.';
