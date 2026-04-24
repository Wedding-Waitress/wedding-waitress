

## Goal
Enable Stripe automatic tax on the embedded checkout so GST (10% AU) is calculated and added to the total at checkout — no other behavior changes.

## Change
**File:** `supabase/functions/create-checkout/index.ts`

Add a single line to the `sessionParams` object passed to `stripe.checkout.sessions.create(...)`:

```ts
const sessionParams: Stripe.Checkout.SessionCreateParams = {
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  line_items: [{ price: price_id, quantity: 1 }],
  mode: checkoutMode as Stripe.Checkout.SessionCreateParams.Mode,
  automatic_tax: { enabled: true },   // ← added
  metadata: {
    user_id: user.id,
    plan_type: plan_type || "",
    event_id: event_id || "",
  },
};
```

Nothing else in the function (auth, customer lookup, embedded vs hosted branching, return/success/cancel URLs, error handling, response shape) is touched.

## Prerequisites in Stripe (configuration only — not code)
For `automatic_tax: { enabled: true }` to actually charge GST, the following must already be set up in the Stripe dashboard (test mode, since the project is currently on test keys):

1. **Stripe Tax must be activated** in the test account (Settings → Tax).
2. **Origin address** set to your AU business address.
3. Each **Product** used in checkout has a **tax code** assigned (e.g. `txcd_10000000` "General – Services" for SaaS-style plans). Without a tax code Stripe defaults to a generic code, which still works but may not be GST-correct.
4. The **price** has `tax_behavior` set to either `exclusive` (GST added on top — typical for B2B) or `inclusive` (GST already baked into the displayed price). If `tax_behavior` is unset on the price, Stripe will reject the session with `automatic_tax.enabled = true`.

If any of step 3 or 4 are missing on the current test-mode prices, Stripe will return an error like *"You cannot enable automatic tax without specifying a tax_behavior on each price"* and the embedded checkout will fail to load. After you approve, I will:

- Make the code change above.
- Test the checkout once. If Stripe returns the `tax_behavior` error, I will report it back with the exact list of price IDs that need `tax_behavior` set, and either update the prices (if you want me to) or stop and let you set them in the dashboard — your call. No prices will be modified without your explicit approval.

## Verification
- Reload `/dashboard/upgrade/checkout?plan=essential`.
- Confirm the embedded form mounts and the order summary shows a **GST line** added to the subtotal.
- Confirm test card `4242 4242 4242 4242` completes checkout.

## Out of Scope
- No UI / copy / styling changes.
- No changes to `upgradePlans.ts`, `stripePrices.ts`, or `UpgradeCheckout.tsx`.
- No changes to price IDs, plan amounts, or tax codes (unless step 3/4 above force a follow-up, which will be confirmed first).
- No switch to Stripe `managed_payments` (full MoR) — only `automatic_tax`, as requested.

