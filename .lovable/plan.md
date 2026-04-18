
## Goal
Make the **Upgrade Plan** button in the Account → Subscription card actually drive payment:
- If the user already has a Stripe customer (i.e. `data.portalUrl` exists) → open the Stripe **Billing Portal** in a new tab.
- Otherwise → open Stripe **Checkout** for an upgrade purchase, return to `/dashboard?tab=account&success=true`.

## Important constraint (must surface, not assume)
Project pricing is **one-time payments** (Essential $99 / Premium $149 / Unlimited $249) per locked memory + `stripePrices.ts`. The brief says `mode: subscription` — I will **not** introduce a recurring SaaS subscription, because that conflicts with locked pricing and would create duplicate billing logic. Instead I will:
- Use the existing `create-checkout` edge function in **`mode: payment`** (matches current model).
- Default to the **Premium** plan price (`PLAN_PRICES.premium.price_id`) as the upgrade target — same plan the upgrade flow on My Events uses for mid-tier users.
- The success URL is updated to `/dashboard?tab=account&success=true` (already handled by `Account.tsx` toast + refetch).

Vendor Pro IS a real subscription (`mode: subscription`, $249/mo) — but that's a vendor product, not what an event host upgrades to from Account. So `payment` mode is correct here.

## Plan (single file change)

### `src/components/Account/SubscriptionCard.tsx`
Replace the Upgrade Plan click handler:

```tsx
const { data: billing } = useAccountBilling();

const handleUpgrade = async () => {
  setBusy(true);
  try {
    // Existing Stripe customer → portal
    if (billing?.portalUrl) {
      window.open(billing.portalUrl, '_blank');
      return;
    }
    // No customer → create Checkout for Premium one-time
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        price_id: PLAN_PRICES.premium.price_id,
        mode: 'payment',
        plan_type: 'premium',
      },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  } catch (e) {
    toast({ title: 'Error', description: e.message, variant: 'destructive' });
  } finally {
    setBusy(false);
  }
};
```

Patch `create-checkout/index.ts` only if needed — its `success_url` currently points to `/payment-success?session_id=...`. That page already calls `verify-payment` → updates `user_subscriptions` → then we want it to land on `/dashboard?tab=account&success=true`. Quick check: `verify-payment` already updates the subscriptions table. I'll verify `PaymentSuccess.tsx` redirects to `/dashboard?tab=account&success=true` after verification; if it currently goes elsewhere I'll add that as a one-line redirect change scoped to the Account upgrade flow only via a query param like `&from=account`.

### Webhook / DB sync
`verify-payment` is already wired to `user_subscriptions` (status, plan name, expiry) via the existing one-time flow. **No webhook changes needed** — payment success already updates the DB. I will not add a new webhook (out of scope, and existing flow already works).

### Lock
Re-stamp `🔒 PRODUCTION-LOCKED` header on the modified file and append a one-line entry under the Account section in `LOCKED_TRANSLATION_KEYS.md`.

## Files modified
- `src/components/Account/SubscriptionCard.tsx` (handler swap, ~15 lines)
- `src/pages/PaymentSuccess.tsx` (only if needed — add `from=account` redirect branch to land on `/dashboard?tab=account&success=true`)
- `LOCKED_TRANSLATION_KEYS.md`

## Files NOT changed
- All other pages, sidebar, my-events flow, pricing constants, webhook code, `verify-payment`, `get-account-billing`, `useAccountBilling`.

## Verification
1. Click Upgrade Plan with no Stripe customer → Stripe Checkout opens in new tab for Premium $149.
2. Complete test payment → returns to `/dashboard?tab=account&success=true` → toast + plan refresh.
3. Click Upgrade Plan with existing Stripe customer → Stripe Billing Portal opens in new tab.
4. Mobile 375px → button + toast render cleanly.
5. Console clean.
