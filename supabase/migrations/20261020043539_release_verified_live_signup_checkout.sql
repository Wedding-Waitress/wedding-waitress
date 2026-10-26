-- Release the temporary launch hold only; preserve all identity checks, RLS,
-- verified trials, account-owner protections and existing customer data.
DO $$
DECLARE control private.prelaunch_control; matching integer;
BEGIN
  -- A no-data branch has no owner control row; preserve the fail-closed hold.
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN RETURN; END IF;
  IF (SELECT count(*) FROM private.prelaunch_control)<>1 THEN
    RAISE EXCEPTION 'Expected one launch control row';
  END IF;
  SELECT * INTO control FROM private.prelaunch_control WHERE singleton FOR UPDATE;
  IF control.owner_user_id IS NULL
    OR NOT private.is_platform_owner(control.owner_user_id)
    OR NOT public.has_role(control.owner_user_id,'admin'::public.app_role)
    OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=control.owner_user_id) THEN
    RAISE EXCEPTION 'Verified platform owner must be preserved';
  END IF;
  SELECT count(*) INTO matching FROM public.subscription_plans
    WHERE is_active AND (name,price_aud) IN (('Essential',199),('Premium',249),('Unlimited',299));
  IF matching<>3 THEN RAISE EXCEPTION 'Approved live catalogue is not reconciled'; END IF;
  UPDATE private.prelaunch_control SET enabled=false,changed_at=now() WHERE singleton;
END $$;


