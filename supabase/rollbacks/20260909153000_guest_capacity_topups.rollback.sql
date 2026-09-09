-- Roll back the dedicated guest-capacity fulfillment path without deleting
-- payment history or removing capacity that customers already purchased.
BEGIN;

DROP TRIGGER IF EXISTS guests_enforce_paid_plan_capacity ON public.guests;
DROP FUNCTION IF EXISTS public.enforce_paid_plan_guest_capacity();
DROP FUNCTION IF EXISTS public.fulfill_guest_capacity_topup(uuid, uuid, text, text, numeric, integer, integer);

UPDATE public.rsvp_invite_purchases
SET purchase_type = 'rsvp_overage',
    guest_tier_label = replace(guest_tier_label, 'Guest Capacity', 'Legacy capacity')
WHERE purchase_type = 'guest_capacity_topup';

ALTER TABLE public.rsvp_invite_purchases
  DROP CONSTRAINT IF EXISTS rsvp_invite_purchases_purchase_type_check;
ALTER TABLE public.rsvp_invite_purchases
  ADD CONSTRAINT rsvp_invite_purchases_purchase_type_check
  CHECK (purchase_type IN ('rsvp_tier', 'rsvp_overage', 'communication_topup', 'sms_topup'));

-- Retain the unique Stripe-session index: it protects historical purchases
-- from duplicate fulfillment and is safe for the legacy reader.
COMMIT;
