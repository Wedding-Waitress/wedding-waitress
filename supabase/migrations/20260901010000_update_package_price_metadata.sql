-- Non-Stripe package catalogue metadata only.
-- Stripe products, prices, checkout, webhooks and payment verification remain unchanged.
begin;

do $$
begin
  if (select count(*) from public.subscription_plans where name in ('Essential', 'Premium', 'Unlimited', 'Vendor Pro')) <> 4 then
    raise exception 'Expected exactly four paid package catalogue rows';
  end if;
end $$;

update public.subscription_plans set price_aud = 150 where name = 'Essential';
update public.subscription_plans set price_aud = 200 where name = 'Premium';
update public.subscription_plans set price_aud = 300 where name = 'Unlimited';
update public.subscription_plans set price_aud = 300 where name = 'Vendor Pro';

commit;
