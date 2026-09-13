-- Data-preserving withdrawal only. Never restore the replayable UPDATE path.
-- Preserve verified purchases, original term dates, unique payment bindings,
-- billing history, access restrictions and all customer data.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.fulfill_paid_plan_purchase(uuid,text,text,uuid,text,integer,integer,text,text,timestamptz,text,boolean,uuid) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
