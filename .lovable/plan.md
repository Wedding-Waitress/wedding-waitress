
## Goal
Polish the Account page + profile dropdown: rename "Account" → "My Profile" in 2 places, add a tooltip on the NE avatar, rename the trial label, and gate the Upgrade flow behind a 3-plan selection modal before redirecting to Stripe.

## Findings (from codebase)
- **Profile dropdown**: lives in the dashboard header. Need to confirm exact file — likely `src/components/Dashboard/DashboardHeader.tsx`. The "Account" item routes to `/dashboard?tab=account`. The NE avatar is the dropdown trigger.
- **Account page title**: `src/pages/Account.tsx` line 41 — hardcoded `"Account"` and subtitle `"Manage your account, subscription, and billing"`.
- **Subscription label + Upgrade button**: `src/components/Account/SubscriptionCard.tsx`. Currently shows the plan name (e.g. `"Free (Expired)"`) and an "Upgrade Plan" button that calls `create-checkout` directly with a single price.
- **3 plans available**: Per project knowledge — Essential $99 AUD (≤100 guests), Premium $149 AUD (≤300 guests), Unlimited $249 AUD (unlimited). Stripe price IDs already exist in `src/lib/stripePrices.ts`.

I will read `SubscriptionCard.tsx`, `DashboardHeader.tsx` (or wherever the dropdown lives), and `stripePrices.ts` at implementation time to use the correct existing price IDs and existing checkout invocation pattern (no new edge function needed — reuse `create-checkout`).

## Changes (scoped, additive only)

### 1. Profile dropdown — `src/components/Dashboard/DashboardHeader.tsx` (or equivalent)
- Rename dropdown item label `"Account"` → `"My Profile"`.
- Wrap the NE avatar trigger in a `<Tooltip>` with content `"My Profile"` (using existing `@/components/ui/tooltip`).
- No route or behavior change — still navigates to `/dashboard?tab=account`.

### 2. Account page heading — `src/pages/Account.tsx`
- Line 41: `Account` → `My Profile`.
- Subtitle untouched.

### 3. Subscription label — `src/components/Account/SubscriptionCard.tsx`
- When `plan_name === 'Free'` (or trial/expired state), render `"7-Day Free Trial"` instead of `"Free"`. Keep the `(Expired)` suffix logic and the existing red "Expired" badge exactly as-is for non-trial plans display.
- Only the displayed string changes; underlying `plan.plan_name` value is not modified.

### 4. Upgrade flow — new modal + wiring
- **New file**: `src/components/Account/UpgradePlanModal.tsx`
  - Dialog with 3 plan cards (Essential / Premium / Unlimited).
  - Each card: name, AUD price, one-line description, "Choose Plan" button styled with existing `dashboard-btn-primary`.
  - On "Choose Plan" click → invoke existing `create-checkout` edge function with the corresponding Stripe `price_id` from `src/lib/stripePrices.ts`, then `window.location.href = url` (matches current pattern).
- **`SubscriptionCard.tsx`**: change "Upgrade Plan" button `onClick` to open the modal instead of calling checkout directly. Remove the direct single-price checkout call from this button only.

### 5. Untouched
Billing, Usage, History, Security cards. All other layout/styling.

## Out of scope
- No new edge functions, DB migrations, or pricing changes.
- No i18n key changes (these labels are not in landing locked files).
- No changes to the trial logic / `useUserPlan` hook.

## Verification
1. `/dashboard?tab=account` heading reads **My Profile**.
2. Hovering the NE avatar shows tooltip "My Profile"; opening the dropdown shows menu item "My Profile" that still navigates to the Account page.
3. Subscription card shows **7-Day Free Trial (Expired)** with the red Expired badge intact.
4. Clicking **Upgrade Plan** opens a modal with 3 plans (Essential $99, Premium $149, Unlimited $249), each with a "Choose Plan" button.
5. Clicking "Choose Plan" on any tier opens the matching Stripe Checkout URL in the same tab (existing pattern).
6. Billing / Usage / History / Security sections render identically to before.
