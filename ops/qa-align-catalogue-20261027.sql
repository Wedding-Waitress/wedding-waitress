-- QA ONLY: ckmgjbwifbzzknnyxzqe. Never run against production.
-- Values read from the current production public catalogue on 27 October 2026.
-- Historical replay generated different IDs and retained obsolete limits.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM public.user_subscriptions)
 OR EXISTS(SELECT 1 FROM public.event_purchases) OR EXISTS(SELECT 1 FROM public.paid_plan_purchases)
 THEN RAISE EXCEPTION 'This bootstrap requires an empty QA environment'; END IF;
END $$;
UPDATE public.subscription_plans p SET
 id=v.id::uuid,guest_limit=v.guests,max_users=5,team_members=4,
 duration_days=v.days,included_events=v.events,table_limit=v.tables,
 is_active=v.active,extra_event_price=v.extra,
 can_send_email=(v.name<>'Starter'),can_send_sms=(v.name<>'Starter'),can_send_whatsapp=(v.name<>'Starter')
FROM (VALUES
 ('Starter','fe3c6c39-01eb-47c8-b8c1-5a0efb48562d',20,7,1,5,true,0),
 ('Essential','78cdab0d-d81d-4757-b7cc-f210b8b30f47',100,365,1,NULL,true,99),
 ('Premium','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8',200,365,1,NULL,true,99),
 ('Unlimited','cd10f207-2109-4546-a635-0baa68ba8213',400,365,1,NULL,true,99),
 ('Vendor Pro','632b476a-39da-4f6f-8457-9ba104d571da',NULL,30,100,NULL,false,0)
) AS v(name,id,guests,days,events,tables,active,extra)
WHERE p.name=v.name;
-- Prices deliberately untouched.
COMMIT;
