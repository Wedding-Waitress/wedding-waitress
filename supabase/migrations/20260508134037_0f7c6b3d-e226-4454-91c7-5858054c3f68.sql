
-- 1) Extend subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS included_events integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_users integer NOT NULL DEFAULT 3;

UPDATE public.subscription_plans
  SET included_events = 100, max_users = 10
  WHERE lower(name) LIKE '%vendor%';

-- 2) Extend app_role enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'account_master' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'account_master';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'account_standard' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'account_standard';
  END IF;
END$$;

-- 3) additional_event_purchases
CREATE TABLE IF NOT EXISTS public.additional_event_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  stripe_session_id text,
  stripe_price_id text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'AUD',
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_addl_event_user ON public.additional_event_purchases(user_id);
ALTER TABLE public.additional_event_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own additional event purchases"
  ON public.additional_event_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 4) account_members (Master/Standard architecture, foundation only)
CREATE TABLE IF NOT EXISTS public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'standard' CHECK (role IN ('master','standard')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_owner_id, member_user_id)
);
CREATE INDEX IF NOT EXISTS idx_acct_members_owner ON public.account_members(account_owner_id);
CREATE INDEX IF NOT EXISTS idx_acct_members_member ON public.account_members(member_user_id);
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage account members"
  ON public.account_members FOR ALL
  USING (auth.uid() = account_owner_id)
  WITH CHECK (auth.uid() = account_owner_id);

CREATE POLICY "Member can read own membership"
  ON public.account_members FOR SELECT
  USING (auth.uid() = member_user_id);

-- 5) account_invitations (scaffold; no UI yet)
CREATE TABLE IF NOT EXISTS public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'standard' CHECK (role IN ('master','standard')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  accepted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acct_invites_owner ON public.account_invitations(account_owner_id);
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages invitations"
  ON public.account_invitations FOR ALL
  USING (auth.uid() = account_owner_id)
  WITH CHECK (auth.uid() = account_owner_id);

-- 6) event_collaborators (scaffold; no UI yet)
CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner','collaborator','client','bride','groom')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_event_collab_event ON public.event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collab_user ON public.event_collaborators(user_id);
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owner manages collaborators"
  ON public.event_collaborators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_collaborators.event_id AND e.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_collaborators.event_id AND e.user_id = auth.uid()));

CREATE POLICY "Collaborator reads own row"
  ON public.event_collaborators FOR SELECT
  USING (auth.uid() = user_id);

-- 7) Helper functions
CREATE OR REPLACE FUNCTION public.is_account_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_owner_id = _user_id AND member_user_id = _user_id AND role = 'master'
  )
$$;

CREATE OR REPLACE FUNCTION public.account_event_access(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event_id AND e.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.event_collaborators ec
    WHERE ec.event_id = _event_id AND ec.user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.account_members am
    JOIN public.events e ON e.user_id = am.account_owner_id
    WHERE am.member_user_id = _user_id AND e.id = _event_id
  )
$$;

-- 8) Backfill: every existing subscription owner becomes a master member of their own account
INSERT INTO public.account_members (account_owner_id, member_user_id, role, accepted_at)
SELECT DISTINCT us.user_id, us.user_id, 'master', now()
FROM public.user_subscriptions us
ON CONFLICT (account_owner_id, member_user_id) DO NOTHING;
