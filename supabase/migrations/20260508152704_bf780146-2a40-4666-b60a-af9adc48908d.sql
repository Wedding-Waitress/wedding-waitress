ALTER TABLE public.subscription_plans ALTER COLUMN included_events SET DEFAULT 3;
UPDATE public.subscription_plans SET included_events = 3 WHERE lower(name) NOT LIKE '%vendor%';
UPDATE public.subscription_plans SET included_events = 100 WHERE lower(name) LIKE '%vendor%';