
CREATE TABLE IF NOT EXISTS public.admin_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_otp_codes_user_idx ON public.admin_otp_codes (user_id, created_at DESC);

ALTER TABLE public.admin_otp_codes ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated. Only service_role (edge functions) can read/write.
