
## Root Cause
The `STRIPE_PUBLISHABLE_KEY` Edge Function secret is set to an invalid value (`mk_1T0eM…`, 27 chars). Stripe.js requires `pk_live_…` or `pk_test_…`. Because the embedded checkout receives this bad key, `loadStripe()` fails silently and the right-hand panel stays blank. No code change can fix this — the secret itself must be replaced with the real **live publishable key** from your Stripe dashboard.

The price IDs, the `create-checkout` Edge Function, the client secret flow, and the `<EmbeddedCheckoutProvider>` mount logic are all already correct. The secret key (`STRIPE_SECRET_KEY`) on the server side is presumed valid because the function returns a `client_secret` without error — only the publishable key is broken.

## Plan

### 1. Replace the `STRIPE_PUBLISHABLE_KEY` secret (required user action)
Open Stripe Dashboard → Developers → API keys → copy the **Publishable key** that starts with `pk_live_` (toggle the dashboard to **Live mode** first). Then update the secret in Lovable Cloud → Edge Function Secrets, replacing the current `mk_1T0eM…` value.

I will trigger the secret-update modal for you so you can paste it directly. (No code edit needed for this step.)

### 2. Add a friendly client-side guard in `src/pages/UpgradeCheckout.tsx`
If the function ever returns a non-`pk_` key again, surface a clear error in the right-hand panel instead of a blank box:
- After receiving `publishable_key`, validate `startsWith('pk_live_') || startsWith('pk_test_')`.
- If invalid, show: "Payment system is misconfigured. Please contact support." (and log details to console).

### 3. Add a server-side guard in `supabase/functions/create-checkout/index.ts`
Before returning the embedded payload, validate `STRIPE_PUBLISHABLE_KEY` starts with `pk_`. If not, return a 500 with a clear message ("STRIPE_PUBLISHABLE_KEY is invalid — must start with pk_live_ or pk_test_") so future misconfigurations fail loudly instead of rendering a blank checkout.

### 4. Verify live mode end-to-end
After the secret is replaced:
- Reload `/dashboard/upgrade/checkout?plan=essential`.
- Confirm the embedded Stripe checkout mounts on the right with the A$99 line item.
- Confirm the Stripe form shows "Powered by Stripe" with no test-mode banner.
- GST/tax behaviour follows your Stripe **Tax** settings — once Stripe Checkout renders, any tax rules you have configured in the live Stripe dashboard will apply automatically.

## Out of Scope
- No UI changes (layout, copy, styling untouched).
- No changes to price IDs, plan list, or `upgradePlans.ts`.
- No changes to the `/dashboard/upgrade` pricing cards.
- Tax/GST configuration itself lives in the Stripe Dashboard (Tax settings) — not in app code.
