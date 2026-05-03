## Goal
Swap the RSVP Invite bundle Stripe Price IDs to the new working IDs so the "Pay Now" button in the RSVP Activation modal opens Stripe Checkout (no more "Edge Function returned non-2xx").

## What changes
Only one file: `src/lib/stripePrices.ts` — replace the 6 `price_id` values inside `RSVP_TIERS`.

| Tier | New Price ID |
|---|---|
| 1–100   | price_1TSzPs5GzTmqOxGK4Ca8kAAz |
| 101–200 | price_1TSzRu5GzTmqOxGK9gIwfeU4 |
| 201–300 | price_1TSzSJ5GzTmqOxGKaGm02LiC |
| 301–400 | price_1TSzSs5GzTmqOxGKMHCPxGfe |
| 401–500 | price_1TSzTH5GzTmqOxGKJ8qK3os0 |
| 501–1000| price_1TSzTg5GzTmqOxGK5k36snjG |

## What stays exactly the same
- `useRsvpPurchase.ts` — `getPricingTier()` logic untouched.
- `RsvpActivationModal.tsx` — UI, layout, copy, buttons untouched.
- All other fields on each tier (`min`, `max`, `price_aud`, `label`, `product_id`) untouched.
- `create-checkout` edge function untouched.

## Important deviation from the prompt's snippet
The prompt suggests renaming fields to `priceId` / `price`. I will **not** rename them — `RsvpActivationModal.tsx` reads `tier.price_id` and `getRsvpTier` is typed off the existing shape, so renaming would break the modal and violate "Do NOT change logic / Do NOT change UI". Keeping the existing `price_id` / `price_aud` field names while swapping only the ID values achieves the stated result (correct Stripe checkout opens, tier auto-selected by guest count) with zero side effects.

## Expected result after approval
- Click "Pay Now" in Activate and Send RSVP Invites modal → Stripe Checkout opens in a new tab with the correct tier.
- "Edge Function returned non-2xx" error stops occurring (was caused by invalid/old price IDs).
- No visual or behavioral change anywhere else.
