-- Current ex-GST catalogue only. Historical payments, subscription terms and
-- package identities are unchanged. No account or catalogue row is deleted.
DO $$
DECLARE approved record; matching integer; current_price numeric;
BEGIN
  FOR approved IN SELECT * FROM (VALUES
    ('Essential',150::numeric,199::numeric),
    ('Premium',200::numeric,249::numeric),
    ('Unlimited',300::numeric,299::numeric)
  ) AS prices(plan_name,old_price,new_price)
  LOOP
    PERFORM 1 FROM public.subscription_plans
      WHERE name=approved.plan_name AND is_active FOR UPDATE;
    SELECT count(*),min(price_aud) INTO matching,current_price
      FROM public.subscription_plans WHERE name=approved.plan_name AND is_active;
    IF matching<>1 OR current_price IS NULL
      OR current_price NOT IN (approved.old_price,approved.new_price) THEN
      RAISE EXCEPTION 'Package catalogue changed unexpectedly for %',approved.plan_name;
    END IF;
    UPDATE public.subscription_plans SET price_aud=approved.new_price
      WHERE name=approved.plan_name AND is_active;
  END LOOP;
END $$;
