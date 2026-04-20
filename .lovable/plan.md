
## Goal
Update all Stripe price IDs to use the live production prices provided.

## Changes

### 1. Update src/lib/stripePrices.ts
Replace the test price IDs with the live ones:

| Plan | Old Price ID | New Live Price ID |
|------|-------------|-------------------|
| Essential | price_1T0vD35GzTmqOxGK3k6EQZee | price_1TOGeX5GzTmqOxGKNtttFMhv |
| Premium | price_1T0vDN5GzTmqOxGKf3kyvjxs | price_1TOGhC5GzTmqOxGKNMnWh8k5 |
| Unlimited | price_1T0vDj5GzTmqOxGKxVXhCfub | price_1TOGjY5GzTmqOxGKSpGNJJdU |
| Vendor Pro | price_1T0vEC5GzTmqOxGK9AK1MNLL | price_1TOGn05GzTmqOxGKPhBNhnPr |

### 2. Verification
- `src/lib/upgradePlans.ts` imports from `stripePrices.ts`, so it will automatically use the updated live price IDs
- `src/pages/UpgradeCheckout.tsx` uses `PLAN_DETAILS` from `upgradePlans.ts`, which sources from `stripePrices.ts`
- All checkout flows will now use live Stripe mode

## Out of Scope
- No UI changes
- No logic changes to checkout flow
- No changes to product IDs or plan database IDs
