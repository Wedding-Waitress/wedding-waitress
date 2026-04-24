

## Goal
Force Stripe to calculate AU GST (10%) on the embedded checkout **without** asking the user for any address, billing field, or country selector.

## Reality Check on the Requested Options
Before proposing a fix, here is why the three options in the request don't work as written — this matters because picking the wrong one will silently re-introduce the bug or break checkout entirely:

1. **`customer_details: { address: { country: "AU" } }`** — Not a valid parameter on `checkout.sessions.create`. `customer_details` is a *response* field Stripe populates after the session completes; it cannot be set as input. Stripe will reject the request.

2. **`shipping_address_collection: { allowed_countries: ["AU"] }`** — This *does* render a shipping address form in the embedded checkout (name + street + city + postcode), which violates the "no address fields in UI" requirement. Same UX problem as `billing_address_collection`.

3. **`default_tax_rates`** — Works, but **disables Stripe automatic tax**. You'd be hard-coding a manual 10% rate. It also conflicts with `automatic_tax: { enabled: true }` (Stripe rejects the session if both are set on the same line item). You'd lose the dashboard-managed tax setup you already configured.

## What Actually Works
The correct way to force a location for `automatic_tax` without any UI is to **pre-set the address on the Stripe Customer object server-side** before creating the checkout session. Stripe's automatic tax then uses the customer's stored address as the location, and no address UI is shown.

Concretely, in `supabase/functions/create-checkout/index.ts`:

1. **Remove** `billing_address_collection: "required"` (added in the previous step) and the conditional `customer_update: { address: "auto", name: "auto" }` block. These were what triggered the address form.
2. **Always ensure a Stripe Customer exists** for the user (currently we only look one up; if none is found we let Checkout create it). Change this to: if no customer found, create one explicitly via `stripe.customers.create({ email: user.email, address: { country: "AU" } })`.
3. **If the customer exists but has no address** (or a non-AU address) on file, call `stripe.customers.update(customerId, { address: { country: "AU" } })` before creating the session. This is idempotent and invisible to the user.
4. Pass `customer: customerId` to the session (already done) and **drop** `customer_email` since we now always have a customer.
5. Keep `automatic_tax: { enabled: true }` exactly as-is.

Stripe accepts `address: { country: "AU" }` with only the country field — no street/city/postcode required for tax-location purposes. GST will compute against the AU country.

## Change Summary (single file)
**File:** `supabase/functions/create-checkout/index.ts`

```ts
// Find OR create the Stripe customer, and ensure address.country = "AU"
const customers = await stripe.customers.list({ email: user.email, limit: 1 });
let customerId: string;
if (customers.data.length > 0) {
  customerId = customers.data[0].id;
  const existing = customers.data[0];
  if (!existing.address || existing.address.country !== "AU") {
    await stripe.customers.update(customerId, { address: { country: "AU" } });
    logStep("Customer address forced to AU", { customerId });
  }
} else {
  const created = await stripe.customers.create({
    email: user.email,
    address: { country: "AU" },
    metadata: { user_id: user.id },
  });
  customerId = created.id;
  logStep("Created Stripe customer with AU address", { customerId });
}

const sessionParams: Stripe.Checkout.SessionCreateParams = {
  customer: customerId,
  line_items: [{ price: price_id, quantity: 1 }],
  mode: checkoutMode as Stripe.Checkout.SessionCreateParams.Mode,
  automatic_tax: { enabled: true },
  metadata: {
    user_id: user.id,
    plan_type: plan_type || "",
    event_id: event_id || "",
  },
};
```

Removed from the previous version:
- `customer_email: customerId ? undefined : user.email` (no longer needed — customer always exists)
- `billing_address_collection: "required"`
- `...(customerId ? { customer_update: { address: "auto", name: "auto" } } : {})`

The embedded vs hosted branching, return/success/cancel URLs, error handling, and response shape are untouched.

## Prerequisite (Stripe dashboard — unchanged from before)
The current test-mode prices must have `tax_behavior` set to `inclusive` or `exclusive`. From your screenshot the Stripe price preview is already showing `Subtotal $99 + GST $9.90 = $108.90`, which means `tax_behavior` is already set correctly. No price changes needed.

## Verification
- Reload `/dashboard/upgrade/checkout?plan=essential`.
- Confirm the embedded form shows **only the card field** — no address, no country dropdown.
- Confirm the order summary on the right shows: Subtotal $99.00, **GST $9.90**, Total $108.90.
- Confirm test card `4242 4242 4242 4242` completes checkout.
- Confirm hitting checkout a second time as the same user still shows GST (i.e. the existing customer with the AU address is reused without prompting).

## Out of Scope
- No UI / copy / styling changes anywhere in the app.
- No changes to `upgradePlans.ts`, `stripePrices.ts`, `UpgradeCheckout.tsx`, `verify-payment`, or webhooks.
- No changes to plan amounts, price IDs, or tax_behavior.
- No `default_tax_rates`, no `shipping_address_collection`, no `billing_address_collection` — all explicitly avoided.

