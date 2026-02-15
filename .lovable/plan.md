

# Account Label Updates and Expiry Warning System

## Part 1: Update Account Created/Expiry Labels

**File:** `src/components/Dashboard/EventsTable.tsx`

Change the top-level account dates (lines 248-254) from:
- "Created: 13/02/2026" --> "Your account was created on 13/02/2026"
- "Expiry: 13/02/2027" --> "Your account will expire on 13/02/2027"

The per-event "Created Date" and "Expiry Date" columns in the table below remain unchanged -- those are event-specific and already clear.

---

## Part 2: Expiry Warning Banner System

A non-intrusive banner at the top of the dashboard (below the header) that appears at these intervals before account expiry:

- **30 days** before expiry
- **14 days** before expiry
- **7 days** before expiry
- **24 hours** before expiry

### Banner Design
- Colored banner bar below the dashboard header
- 30 days: amber/yellow background with warning icon
- 14 days: orange background
- 7 days: red background
- 24 hours: dark red, pulsing/bold
- Dismissible (X button), but reappears on next login/page load
- Contains message like: "Your account expires in X days. Extend your plan to keep your data."
- Contains an "Extend Plan" button that opens the extension modal

### New Files
| File | Purpose |
|------|---------|
| `src/components/Dashboard/ExpiryWarningBanner.tsx` | Banner component with countdown logic and dismiss |
| `src/components/Dashboard/ExtendPlanModal.tsx` | Modal showing extension duration options and pricing |

### Integration
- Add `ExpiryWarningBanner` to `Dashboard.tsx`, positioned below the header
- Banner reads `expires_at` from `useUserPlan` hook
- Only shows for Essential, Premium, and Unlimited plans
- Does NOT show for Starter or Vendor Pro

---

## Part 3: Plan Extension Modal and Pricing

When user clicks "Extend Plan" on the banner, a modal appears with duration options.

### Extension Pricing (Essential / Premium / Unlimited)

| Duration | Essential | Premium | Unlimited |
|----------|-----------|---------|-----------|
| 1 month  | $19 AUD   | $29 AUD | $39 AUD   |
| 2 months | $35 AUD   | $49 AUD | $69 AUD   |
| 3 months | $49 AUD   | $69 AUD | $99 AUD   |
| 4 months | $59 AUD   | $85 AUD | $119 AUD  |
| 5 months | $69 AUD   | $99 AUD | $139 AUD  |
| 6 months | $79 AUD   | $109 AUD| $149 AUD  |
| 12 months| $99 AUD   | $149 AUD| $249 AUD  |

### Implementation
1. Create Stripe Products and Prices for each extension tier (21 prices total: 7 durations x 3 plans)
2. Add a new `src/lib/stripeExtensionPrices.ts` as a central reference for all extension Price IDs
3. Create a new Edge Function `create-extension-checkout` that:
   - Validates the user's current plan
   - Creates a Stripe Checkout session with the correct extension price
   - Passes metadata (plan_id, extension_months) for fulfillment
4. Update the existing `verify-payment` Edge Function to handle extension payments:
   - On successful payment, extend `expires_at` in `user_subscriptions` by the purchased months
   - Record the purchase in `event_purchases`

### ExtendPlanModal UI
- Shows current plan name and expiry date
- Radio/card selection for 1-6 months or 12 months
- Each option shows the price in AUD
- 12-month option highlighted as "Best Value" 
- "Pay Now" button redirects to Stripe Checkout
- After payment, user returns to a success page and `expires_at` is updated

---

## Part 4: Stripe Products (to be created)

21 new Stripe Price objects will be created for extension durations. These will be created using the Stripe tools before coding begins, and the Price IDs recorded in `stripeExtensionPrices.ts`.

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/Dashboard/EventsTable.tsx` | Edit: Update account label text |
| `src/components/Dashboard/ExpiryWarningBanner.tsx` | New: Banner component |
| `src/components/Dashboard/ExtendPlanModal.tsx` | New: Extension duration picker modal |
| `src/lib/stripeExtensionPrices.ts` | New: Extension price ID mappings |
| `src/pages/Dashboard.tsx` | Edit: Add ExpiryWarningBanner |
| `supabase/functions/create-extension-checkout/index.ts` | New: Edge function for extension payments |
| `supabase/functions/verify-payment/index.ts` | Edit: Handle extension payment fulfillment |

## What stays the same
- All existing dashboard features and locked components
- Current sign-in flow (recently fixed)
- Existing plan upgrade flow via landing page
- Per-event created/expiry dates in the table columns
