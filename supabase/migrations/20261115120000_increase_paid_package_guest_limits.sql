-- Owner-approved package capacities. Prices, trial access, communication credits,
-- purchased guest spaces, plan IDs and lifecycle rules are unchanged.
DO $migration$
DECLARE
  package record;
BEGIN
  -- Finish existing subscription/event writes before taking the snapshot, and
  -- let queued checkouts resume against the new catalogue after commit.
  LOCK TABLE public.user_subscriptions,public.events IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (
    SELECT 1 FROM public.subscription_plans p
    JOIN (VALUES ('Essential',100,150),('Premium',200,250),('Unlimited',400,450)) c(name,old_limit,new_limit)
      ON p.name=c.name
    WHERE p.guest_limit IS NULL OR p.guest_limit NOT IN (c.old_limit,c.new_limit)
  ) THEN
    RAISE EXCEPTION 'Unexpected paid package capacity; review before applying the increase';
  END IF;
  IF (SELECT count(*) FROM public.subscription_plans WHERE name IN ('Essential','Premium','Unlimited'))<>3 THEN
    RAISE EXCEPTION 'Expected the three existing paid package records';
  END IF;

  FOR package IN
    SELECT p.id,c.old_limit,c.new_limit
    FROM public.subscription_plans p
    JOIN (VALUES ('Essential',100,150),('Premium',200,250),('Unlimited',400,450)) c(name,old_limit,new_limit)
      ON p.name=c.name AND p.guest_limit=c.old_limit
    FOR UPDATE OF p
  LOOP
    UPDATE public.subscription_plans SET guest_limit=package.new_limit WHERE id=package.id;

    -- Migrate inherited event maxima, including an already-applied top-up. Keep
    -- custom event sizes intact. Selecting only packages changed above makes a
    -- repeat run safe even when a former top-up happens to equal the new base.
    WITH current_subscriptions AS (
      SELECT DISTINCT ON (s.user_id) s.user_id,s.plan_id
      FROM public.user_subscriptions s
      ORDER BY s.user_id,s.created_at DESC,s.id DESC
    ), inherited_limits AS (
      SELECT e.id,package.old_limit+coalesce(extra.capacity,0) AS old_total,
             package.new_limit+coalesce(extra.capacity,0) AS new_total
      FROM public.events e
      JOIN current_subscriptions s ON s.user_id=e.user_id AND s.plan_id=package.id
      LEFT JOIN LATERAL (
        SELECT (coalesce(sum(p.overage_blocks),0)*10)::integer AS capacity
        FROM public.rsvp_invite_purchases p
        WHERE p.event_id=e.id AND p.user_id=e.user_id AND p.status='completed'
          AND p.purchase_type IN ('rsvp_overage','guest_capacity_topup')
      ) extra ON true
    )
    UPDATE public.events e
    SET guest_limit=CASE
          WHEN e.guest_limit=i.old_total THEN i.new_total
          WHEN e.guest_limit=package.old_limit THEN package.new_limit
          ELSE e.guest_limit END,
        ceremony_guest_limit=CASE
          WHEN e.ceremony_guest_limit=i.old_total THEN i.new_total
          WHEN e.ceremony_guest_limit=package.old_limit THEN package.new_limit
          ELSE e.ceremony_guest_limit END
    FROM inherited_limits i
    WHERE e.id=i.id AND (
      e.guest_limit IN (package.old_limit,i.old_total)
      OR e.ceremony_guest_limit IN (package.old_limit,i.old_total)
    );
  END LOOP;
END
$migration$;
