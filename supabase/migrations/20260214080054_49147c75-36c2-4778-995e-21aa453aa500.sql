
-- 1. Add table_limit column to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN table_limit integer DEFAULT NULL;

-- 2. Update Starter plan: 24-hour trial, 5 table limit
UPDATE public.subscription_plans 
SET duration_days = 1, table_limit = 5 
WHERE name = 'Starter';

-- 3. Create rsvp_invite_purchases table
CREATE TABLE public.rsvp_invite_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  amount_paid numeric NOT NULL,
  guest_tier_label text,
  stripe_session_id text,
  stripe_payment_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: one purchase per event
CREATE UNIQUE INDEX uq_rsvp_invite_purchases_event ON public.rsvp_invite_purchases(event_id) WHERE status = 'completed';

-- 4. Enable RLS
ALTER TABLE public.rsvp_invite_purchases ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can view their own RSVP purchases"
ON public.rsvp_invite_purchases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own RSVP purchases"
ON public.rsvp_invite_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVP purchases"
ON public.rsvp_invite_purchases
FOR UPDATE
USING (auth.uid() = user_id);
