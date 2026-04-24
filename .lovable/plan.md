

## Goal
Switch the frontend embedded Stripe checkout from LIVE mode to TEST mode without changing any UI, copy, or business logic.

## Root Cause / Context
The frontend doesn't hold the Stripe publishable key directly. `src/pages/UpgradeCheckout.tsx` receives `publishable_key` from the `create-checkout` Edge Function response, which reads it from the **Supabase secret** `STRIPE_PUBLISHABLE_KEY`. To switch the embedded checkout to test mode, that secret must be replaced with a `pk_test_...` key (and the matching `STRIPE_SECRET_KEY` must also be a `sk_test_...` key, otherwise Stripe will reject the session because the publishable + secret keys must belong to the same mode/account).

## Plan

### 1. Update `STRIPE_PUBLISHABLE_KEY` secret to test key
- Replace the current `pk_live_...` value with the project's `pk_test_...` value.
- This is what `create-checkout` returns to the browser, which `loadStripe()` uses to mount the embedded checkout.

### 2. Update `STRIPE_SECRET_KEY` secret to matching test key
- Replace `sk_live_...` with `sk_test_...` from the same Stripe account.
- Required because Stripe sessions must be created with a secret key whose mode matches the publishable key. Mixing live + test keys causes the session to fail to load.
- Triggered via the secure Stripe key update modal.

### 3. Verify price IDs exist in test mode
- The price IDs in `src/lib/upgradePlans.ts` (e.g. `price_1TOGeX5GzTmqOxGKNtttFMhv` for Essential) were created in **live** mode. In test mode they will not resolve and checkout will 500.
- After switching keys, list test-mode prices and confirm whether the same IDs exist or whether test-mode equivalents need to be created/added.
- If test-mode prices have different IDs, this will be flagged back to you with the options (create matching test prices in Stripe, or temporarily map plan keys to test price IDs in `upgradePlans.ts`). No code changes will be made without your approval of which option to take.

### 4. Verify end-to-end
- Reload `/dashboard/upgrade/checkout?plan=essential`.
- Confirm the embedded Stripe form mounts and shows the Stripe **test mode banner** ("TEST MODE" orange ribbon).
- Confirm a test card (`4242 4242 4242 4242`) can complete checkout.

## Out of Scope
- No UI / layout / copy / styling changes.
- No changes to `upgradePlans.ts`, `stripePrices.ts`, `UpgradeCheckout.tsx`, or `create-checkout/index.ts` code (unless step 3 reveals price IDs must be remapped, which will be confirmed first).
- No changes to the LIVE Stripe account configuration.

