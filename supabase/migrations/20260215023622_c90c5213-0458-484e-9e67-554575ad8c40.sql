
-- Update team_members from 1 to 2 for Essential, Premium, and Unlimited plans
UPDATE public.subscription_plans SET team_members = 2 WHERE name IN ('Essential', 'Premium', 'Unlimited');
