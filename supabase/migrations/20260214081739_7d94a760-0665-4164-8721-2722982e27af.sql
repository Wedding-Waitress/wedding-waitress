
-- Update Starter plan trial from 1 day to 7 days
UPDATE subscription_plans SET duration_days = 7 WHERE name = 'Starter';

-- Add trial_extended flag to user_subscriptions
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS trial_extended boolean NOT NULL DEFAULT false;
