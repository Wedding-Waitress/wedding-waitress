
ALTER TABLE public.rsvp_invite_purchases
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'rsvp_tier',
  ADD COLUMN IF NOT EXISTS purchased_limit integer,
  ADD COLUMN IF NOT EXISTS overage_blocks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_count_at_purchase integer;

ALTER TABLE public.rsvp_invite_purchases
  DROP CONSTRAINT IF EXISTS rsvp_invite_purchases_purchase_type_check;
ALTER TABLE public.rsvp_invite_purchases
  ADD CONSTRAINT rsvp_invite_purchases_purchase_type_check
  CHECK (purchase_type IN ('rsvp_tier','rsvp_overage'));

DROP INDEX IF EXISTS public.uq_rsvp_invite_purchases_event;
CREATE UNIQUE INDEX uq_rsvp_invite_purchases_event_tier
  ON public.rsvp_invite_purchases (event_id)
  WHERE status = 'completed' AND purchase_type = 'rsvp_tier';

CREATE INDEX IF NOT EXISTS idx_rsvp_invite_purchases_event_status_type
  ON public.rsvp_invite_purchases (event_id, status, purchase_type);
