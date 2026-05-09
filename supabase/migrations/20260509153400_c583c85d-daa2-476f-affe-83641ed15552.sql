
-- referral_codes
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  signed_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- get_or_create_my_referral_code
CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_slug text;
  v_first text;
  v_attempt int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  SELECT first_name INTO v_first FROM public.profiles WHERE id = v_uid;
  v_slug := upper(regexp_replace(coalesce(NULLIF(trim(v_first), ''), 'FRIEND'), '[^A-Za-z0-9]', '', 'g'));
  IF length(v_slug) = 0 THEN v_slug := 'FRIEND'; END IF;
  IF length(v_slug) > 12 THEN v_slug := substr(v_slug, 1, 12); END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_code := 'WW-' || v_slug || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    BEGIN
      INSERT INTO public.referral_codes(user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- get_my_referral_stats
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS TABLE(total int, signed_up int, pending int, credits_earned int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status = 'signed_up')::int,
    COUNT(*) FILTER (WHERE status = 'pending')::int,
    0::int
  FROM public.referrals
  WHERE referrer_user_id = v_uid;
END;
$$;

-- record_referral_signup
CREATE OR REPLACE FUNCTION public.record_referral_signup(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL OR p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT user_id INTO v_owner FROM public.referral_codes WHERE code = p_code;
  IF v_owner IS NULL OR v_owner = v_uid THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = v_uid) THEN
    RETURN;
  END IF;

  INSERT INTO public.referrals(referrer_user_id, referred_user_id, code, status, signed_up_at)
  VALUES (v_owner, v_uid, p_code, 'signed_up', now());
END;
$$;
