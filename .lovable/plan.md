

## Goal
Ensure Stripe automatic tax (AU GST 10%) calculates correctly on the embedded checkout by collecting the customer's billing address so Stripe has a location to tax against.

## Context
`automatic_tax: { enabled: true }` is already in `supabase/functions/create-checkout/index.ts` (added in the previous step). For Stripe to actually compute GST, it needs a customer location. Without `billing_address_collection`, the embedded checkout won't ask for an address and `automatic_tax` will fail with "Customer location could not be determined."

Note: `billing_address_collection: 'required'` is the correct Stripe parameter. There is no separate "pass customer location" parameter — Stripe derives location from the address the customer enters at checkout (or from a saved customer address if one exists).

## Change
**File:** `supabase/functions/create-checkout/index.ts`

Add one line to the existing `sessionParams` object:

```ts
const sessionParams: Stripe.Checkout.SessionCreateParams = {
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  line_items: [{ price: price_id, quantity: 1 }],
  mode: checkoutMode as Stripe.Checkout.SessionCreateParams.Mode,
  automatic_tax: { enabled: true },
  billing_address_collection: "required",   // ← added
  metadata: {
    user_id: user.id,
    plan_type: plan_type || "",
    event_id: event_id || "",
  },
};
```

Nothing else in the function changes (auth, customer lookup, embedded vs hosted branching, return/success/cancel URLs, error handling, response shape — all untouched).

## Prerequisites Still Required in Stripe Dashboard
These are unchanged from the previous plan and must be true for `automatic_tax` to succeed — they are configuration, not code:

1. Stripe Tax activated in test mode (Settings → Tax).
2. Origin address set to your AU business address.
3. Each test-mode price used in checkout has `tax_behavior` set to `inclusive` or `exclusive`. If unset, Stripe will reject the session.

If the checkout still 500s after this change with a `tax_behavior` error, I will report the exact failing price IDs and ask before modifying any prices.

## Verification
- Reload `/dashboard/upgrade/checkout?plan=essential`.
- Confirm the embedded form now shows a **billing address form** in addition to the card field.
- Enter an AU address — confirm the order summary displays a **GST line** added to the subtotal.
- Confirm test card `4242 4242 4242 4242` completes checkout.

## Out of Scope
- No UI / copy / styling changes.
- No changes to `upgradePlans.ts`, `stripePrices.ts`, or `UpgradeCheckout.tsx`.
- No changes to price IDs, plan amounts, or `tax_behavior` settings (unless step 3 above forces a follow-up, which will be confirmed first).
- No changes to `customer_update`, `tax_id_collection`, or other tax-related parameters — only the two requested.

