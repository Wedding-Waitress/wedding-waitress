

## Goal
Fix the "Edge Function returned a non-2xx status code" shown after a successful payment, without touching pricing, tax, or UI.

## Root Cause
The Stripe payment itself succeeds (Stripe returns `payment_status: paid` and shows the correct GST). The error comes from `supabase/functions/verify-payment/index.ts`, which the success page calls to confirm the purchase and activate the user's plan.

`verify-payment` keeps its own hardcoded `PRODUCT_TO_PLAN` map of Stripe product IDs (lines 17–22). That map still contains the **old** product IDs (`prod_Tysz...`, `prod_Tyt0...`) from a previous Stripe configuration. Meanwhile `src/lib/stripePrices.ts` — the single source of truth used to *create* checkout sessions — has the **new** product IDs (`prod_UOQh...`, `prod_UOQi...`) tied to the current GST-enabled prices.

So: checkout is created with new product → payment succeeds → `verify-payment` looks up the new product ID in its stale map → not found → throws `Unknown product: prod_UOQhHcOhFdrhOs` → returns 500 → frontend shows "Edge Function returned a non-2xx status code".

This is confirmed by the live edge logs:
```
[VERIFY-PAYMENT] Product identified - {"productId":"prod_UOQhHcOhFdrhOs","eventId":""}
[VERIFY-PAYMENT] ERROR - {"message":"Unknown product: prod_UOQhHcOhFdrhOs"}
```

The `success_url` and `cancel_url` are both fine (`/payment-success` is a real route, page loads, just the verify call fails).

## Change (single file)
**File:** `supabase/functions/verify-payment/index.ts`

Update **only** the `PRODUCT_TO_PLAN` constant (lines 17–22) so its product IDs match the current ones in `src/lib/stripePrices.ts`. The `plan_db_id` UUIDs already match — only the Stripe product IDs are wrong.

```ts
const PRODUCT_TO_PLAN: Record<string, { plan_db_id: string; name: string; is_vendor: boolean }> = {
  "prod_UOQhHcOhFdrhOs": { plan_db_id: "78cdab0d-d81d-4757-b7cc-f210b8b30f47", name: "Essential",  is_vendor: false },
  "prod_UOQhTWnFzXV1FK": { plan_db_id: "1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8", name: "Premium",    is_vendor: false },
  "prod_UOQhLIYTxQAd7U": { plan_db_id: "cd10f207-2109-4546-a635-0baa68ba8213", name: "Unlimited",  is_vendor: false },
  "prod_UOQiLXxbgeXKZu": { plan_db_id: "632b476a-39da-4f6f-8457-9ba104d571da", name: "Vendor Pro", is_vendor: true  },
};
```

Nothing else in the file is touched: auth, session retrieval, RSVP branch, extension branch, plan-activation logic, admin notification email, success response shape, error handling — all unchanged.

## Why Not the Other Items in the Request
- `success_url`/`cancel_url` — already valid (`/payment-success?session_id={CHECKOUT_SESSION_ID}` and `/dashboard`). The success page renders; the failure is *inside* the verify call. No change needed.
- Webhook — this project doesn't use Stripe webhooks; activation is done synchronously in `verify-payment`. No change needed.
- Edge function returning 200 — it already returns 200 on the happy path; the 500 here is the correct behavior for an unrecoverable "unknown product" error. Fixing the lookup makes the happy path execute and returns 200.
- Undefined variables — none; the bug is a stale lookup table, not undefined state.

## Out of Scope
- No changes to pricing, tax, or any UI.
- No changes to `create-checkout`, `stripePrices.ts`, `PaymentSuccess.tsx`, or `UpgradeCheckout.tsx`.
- No changes to the RSVP or extension product ID sets in `verify-payment` (those are unrelated and already correct for their flows).
- No new webhook setup.

## Verification
1. Reload `/dashboard/upgrade/checkout?plan=essential`, complete checkout with `4242 4242 4242 4242`.
2. After Stripe redirects to `/payment-success?session_id=...`, the page should show "Payment Successful! 🎉" with `Essential` plan name and a 12-month expiry.
3. Edge logs for `verify-payment` should show:
   ```
   [VERIFY-PAYMENT] Product identified - {"productId":"prod_UOQhHcOhFdrhOs",...}
   [VERIFY-PAYMENT] Subscription updated - {"plan":"Essential","status":"active",...}
   ```
   and **no** "Unknown product" error.
4. Auto-redirect to `/dashboard?tab=account&success=true` after 8s; account page should show the Essential plan as active.
5. Repeat once for Premium and Unlimited if you want full coverage (optional — same code path).

