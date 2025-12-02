-- ============================================================
-- PHASE 1: SUBSCRIPTION SYSTEM DATABASE SCHEMA
-- ============================================================

-- 1.1: Create subscription_plans reference table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_aud DECIMAL(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL,
  guest_limit INTEGER, -- NULL means unlimited
  team_members INTEGER NOT NULL DEFAULT 1,
  can_send_email BOOLEAN NOT NULL DEFAULT false,
  can_send_sms BOOLEAN NOT NULL DEFAULT false,
  can_send_whatsapp BOOLEAN NOT NULL DEFAULT false,
  extra_event_price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pre-populate plans
INSERT INTO public.subscription_plans (name, price_aud, duration_days, guest_limit, team_members, can_send_email, can_send_sms, can_send_whatsapp, extra_event_price) VALUES
  ('Starter', 0, 30, 20, 1, false, false, false, 0),
  ('Essential', 99, 365, 100, 1, true, true, true, 99),
  ('Premium', 149, 365, 300, 1, true, true, true, 99),
  ('Unlimited', 249, 365, NULL, 1, true, true, true, 99),
  ('Vendor Pro', 249, 30, NULL, 5, true, true, true, 0)
ON CONFLICT (name) DO NOTHING;

-- 1.2: Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'grace_period', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  grace_period_ends_at TIMESTAMPTZ,
  is_read_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 1.3: Create event_purchases table
CREATE TABLE IF NOT EXISTS public.event_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  amount_paid DECIMAL(10, 2) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_method TEXT,
  stripe_payment_id TEXT,
  UNIQUE(event_id)
);

-- 1.4: Create communication_credits table
CREATE TABLE IF NOT EXISTS public.communication_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  credits_purchased DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credits_used DECIMAL(10, 2) NOT NULL DEFAULT 0,
  credits_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- 1.5: Create communication_usage audit log
CREATE TABLE IF NOT EXISTS public.communication_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  cost_aud DECIMAL(10, 4) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  edge_function_name TEXT
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_usage ENABLE ROW LEVEL SECURITY;

-- subscription_plans: Public read access (for pricing page)
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- user_subscriptions: Users can only see their own
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- event_purchases: Users can only see their own
CREATE POLICY "Users can view their own event purchases"
  ON public.event_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own event purchases"
  ON public.event_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- communication_credits: Users can only see their own
CREATE POLICY "Users can view their own credits"
  ON public.communication_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own credits"
  ON public.communication_credits FOR ALL
  USING (auth.uid() = user_id);

-- communication_usage: Users can only see their own
CREATE POLICY "Users can view their own usage"
  ON public.communication_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
  ON public.communication_usage FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- PHASE 3: HELPER FUNCTIONS FOR PLAN ENFORCEMENT
-- ============================================================

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS TABLE(
  plan_name TEXT,
  guest_limit INTEGER,
  team_members INTEGER,
  can_send_email BOOLEAN,
  can_send_sms BOOLEAN,
  can_send_whatsapp BOOLEAN,
  status TEXT,
  is_read_only BOOLEAN,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sp.name,
    sp.guest_limit,
    sp.team_members,
    sp.can_send_email,
    sp.can_send_sms,
    sp.can_send_whatsapp,
    us.status,
    us.is_read_only,
    us.expires_at
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = _user_id
  LIMIT 1;
$$;

-- Function to check if user can add more guests
CREATE OR REPLACE FUNCTION public.check_guest_limit(_user_id UUID, _event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan RECORD;
  _current_guest_count INTEGER;
BEGIN
  -- Get user's plan
  SELECT * INTO _plan FROM public.get_user_plan(_user_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'No active subscription found');
  END IF;

  -- If read-only mode, deny
  IF _plan.is_read_only THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Subscription expired - read-only mode');
  END IF;

  -- If unlimited guests (NULL), allow
  IF _plan.guest_limit IS NULL THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Count current guests for this event
  SELECT COUNT(*) INTO _current_guest_count
  FROM public.guests
  WHERE event_id = _event_id;

  -- Check if adding one more would exceed limit
  IF _current_guest_count >= _plan.guest_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 
      'error', format('Guest limit reached (%s/%s). Upgrade to add more guests.', _current_guest_count, _plan.guest_limit)
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Function to check communication credits
CREATE OR REPLACE FUNCTION public.check_communication_credits(_user_id UUID, _channel TEXT, _count INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan RECORD;
  _cost_per_message DECIMAL;
  _total_cost DECIMAL;
  _credits_remaining DECIMAL;
BEGIN
  -- Get user's plan
  SELECT * INTO _plan FROM public.get_user_plan(_user_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'No active subscription found');
  END IF;

  -- Check if plan allows this channel
  IF _channel = 'email' AND NOT _plan.can_send_email THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Email not available on your plan. Upgrade to send emails.');
  END IF;

  IF _channel = 'sms' AND NOT _plan.can_send_sms THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'SMS not available on your plan. Upgrade to send SMS.');
  END IF;

  IF _channel = 'whatsapp' AND NOT _plan.can_send_whatsapp THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'WhatsApp not available on your plan. Upgrade to send WhatsApp.');
  END IF;

  -- Get cost per message
  _cost_per_message := CASE
    WHEN _channel = 'email' THEN 0.05
    WHEN _channel = 'sms' THEN 0.20
    WHEN _channel = 'whatsapp' THEN 0.20
    ELSE 0
  END;

  _total_cost := _cost_per_message * _count;

  -- Get credits remaining
  SELECT credits_remaining INTO _credits_remaining
  FROM public.communication_credits
  WHERE user_id = _user_id AND channel = _channel;

  IF NOT FOUND THEN
    _credits_remaining := 0;
  END IF;

  -- Check if sufficient credits
  IF _credits_remaining < _total_cost THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', format('Insufficient credits. Need $%.2f, have $%.2f. Please purchase more credits.', _total_cost, _credits_remaining)
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'cost', _total_cost, 'remaining_after', _credits_remaining - _total_cost);
END;
$$;

-- Function to deduct communication credits
CREATE OR REPLACE FUNCTION public.deduct_communication_credit(
  _user_id UUID,
  _event_id UUID,
  _guest_id UUID,
  _channel TEXT,
  _cost DECIMAL,
  _edge_function TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduct from credits
  UPDATE public.communication_credits
  SET 
    credits_used = credits_used + _cost,
    credits_remaining = credits_remaining - _cost,
    updated_at = now()
  WHERE user_id = _user_id AND channel = _channel;

  -- Log usage
  INSERT INTO public.communication_usage (user_id, event_id, guest_id, channel, cost_aud, edge_function_name)
  VALUES (_user_id, _event_id, _guest_id, _channel, _cost, _edge_function);

  RETURN true;
END;
$$;

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_credits_updated_at
BEFORE UPDATE ON public.communication_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();