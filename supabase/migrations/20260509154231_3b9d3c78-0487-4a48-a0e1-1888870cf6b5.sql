
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  kind text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user_created ON public.credit_transactions(user_id, created_at DESC);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own credit transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Balance
CREATE OR REPLACE FUNCTION public.get_my_credits_balance()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::int
  FROM public.credit_transactions
  WHERE user_id = auth.uid();
$$;

-- Recent transactions
CREATE OR REPLACE FUNCTION public.get_my_credit_transactions(p_limit int DEFAULT 5)
RETURNS TABLE(id uuid, amount int, kind text, description text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, amount, kind, description, created_at
  FROM public.credit_transactions
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50));
$$;

-- Update referral stats to reflect real balance
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
    (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = v_uid)::int,
    (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = v_uid AND status = 'signed_up')::int,
    (SELECT COUNT(*) FROM public.referrals WHERE referrer_user_id = v_uid AND status = 'pending')::int,
    COALESCE((SELECT SUM(amount) FROM public.credit_transactions WHERE user_id = v_uid), 0)::int;
END;
$$;

-- Award referral signup bonus to referrer
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

  INSERT INTO public.credit_transactions(user_id, amount, kind, description, metadata)
  VALUES (v_owner, 25, 'referral_signup_bonus', 'Referral signup bonus',
          jsonb_build_object('referred_user_id', v_uid, 'code', p_code));
END;
$$;

-- Welcome bonus trigger on profile insert
CREATE OR REPLACE FUNCTION public.award_welcome_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.credit_transactions
    WHERE user_id = NEW.id AND kind = 'welcome_bonus'
  ) THEN
    INSERT INTO public.credit_transactions(user_id, amount, kind, description)
    VALUES (NEW.id, 25, 'welcome_bonus', 'Welcome bonus');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_welcome_bonus ON public.profiles;
CREATE TRIGGER trg_award_welcome_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.award_welcome_bonus();
