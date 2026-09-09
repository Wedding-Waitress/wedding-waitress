BEGIN;
DROP FUNCTION IF EXISTS public.fulfill_additional_event_purchase(uuid, text, text, integer, text);
-- Retain the unique Stripe-session index because removing duplicate-payment
-- protection would weaken historical purchase safety.
COMMIT;
