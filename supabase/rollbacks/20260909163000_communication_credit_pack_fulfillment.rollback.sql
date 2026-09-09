-- Disable new communication-credit fulfillment without deleting paid purchase
-- records or granted credits. The additive stripe_price_id audit column remains
-- intentionally because dropping it would discard payment evidence.
DROP FUNCTION IF EXISTS public.fulfill_communication_credit_topup(
  uuid, uuid, text, text, text, numeric, text, integer
);
