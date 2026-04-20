
## Goal
Kill the current 3-card "Choose your plan" modal and replace it with a flow that (a) shows the EXACT homepage pricing section, then (b) routes the chosen plan to a dedicated checkout screen — Left = plan summary, Right = Stripe Checkout — with dynamic price IDs for Essential / Premium / Unlimited / Vendor Pro.

## Findings (from exploration so far)
- Current modal: `src/components/Account/UpgradePlanModal.tsx` (3 hardcoded cards). Triggered from `src/components/Account/SubscriptionCard.tsx`.
- Stripe price IDs already exist in `src/lib/stripePrices.ts` (Essential / Premium / Unlimited) and `src/lib/stripeExtensionPrices.ts`. Vendor Pro pricing exists on the homepage but I need to confirm whether a Vendor Pro price ID is already wired or needs to be referenced from the existing landing CTA — I will verify in `Landing.tsx` / `stripePrices.ts` at implementation time.
- Homepage pricing lives inside the LOCKED public surface (`src/pages/Landing.tsx` + `src/i18n/locales/*/landing.json`). Per the locked-surface rule I will NOT modify it. Instead I will extract the existing pricing JSX into a small reusable component **without changing markup, classes, copy, or behavior on the homepage**, then reuse it in the new authenticated flow.
- `create-checkout` edge function already accepts `{ price_id, mode, plan_type }` and returns a Stripe Checkout URL — no backend changes needed.

## Plan

### 1. Extract homepage pricing into a shared component (zero visual change)
- New file: `src/components/Pricing/PricingSection.tsx` containing the EXACT JSX currently in `Landing.tsx`'s pricing section (heading, subheading, all support lines, 4 cards, footer lines).
- Add a prop `onPlanSelect?: (planKey: 'essential' | 'premium' | 'unlimited' | 'vendor_pro') => void`.
  - When `onPlanSelect` is provided → all 4 CTA buttons call it instead of the current "Start Planning Free" sign-up behavior.
  - When omitted → component behaves IDENTICALLY to today (default Landing.tsx behavior preserved).
- Replace the inline pricing JSX in `Landing.tsx` with `<PricingSection />`. Pure refactor, no copy / class / layout change.

### 2. Delete the old modal
- Remove `src/components/Account/UpgradePlanModal.tsx`.
- Remove its import + `<UpgradePlanModal />` usage + `upgradeOpen` state from `SubscriptionCard.tsx`.

### 3. New "Upgrade" route — pricing screen
- New route: `/dashboard/upgrade` → renders a simple authenticated page that mounts `<PricingSection onPlanSelect={...} />`.
- "Upgrade Plan" button in `SubscriptionCard.tsx` → `navigate('/dashboard/upgrade')` (existing paying customers with `billing.portalUrl` keep going to Stripe portal — unchanged).
- On plan click → `navigate(\`/dashboard/upgrade/checkout?plan=\${planKey}\`)`.

### 4. Checkout screen — Left summary + Right Stripe
- New route: `/dashboard/upgrade/checkout?plan=<key>`.
- Two-column layout (stacks on mobile):
  - **Left**: Selected plan card — name, price (e.g. A$149), description, and the same feature bullets shown on the homepage card. Sourced from a single `PLAN_DETAILS` map so left summary + Stripe line item can never drift.
  - **Right**: Embedded Stripe Checkout via `@stripe/stripe-js` + `@stripe/react-stripe-js` `EmbeddedCheckoutProvider`.
- Backend: extend `create-checkout` (small, additive) to support `ui_mode: 'embedded'` when the new screen calls it — returns `client_secret` instead of a redirect URL. The existing redirect flow stays intact for any other caller. Vendor Pro uses `mode: 'subscription'`; the other three stay `mode: 'payment'` (matches current Stripe price configuration).
- On success → Stripe redirects to existing `/payment-success` page (already wired).

### 5. Files touched
- **New**: `src/components/Pricing/PricingSection.tsx`, `src/pages/UpgradePricing.tsx`, `src/pages/UpgradeCheckout.tsx`
- **Edit**: `src/pages/Landing.tsx` (swap inline pricing for `<PricingSection />` — no visual change), `src/components/Account/SubscriptionCard.tsx` (remove modal, navigate to `/dashboard/upgrade`), `src/App.tsx` (add 2 routes), `supabase/functions/create-checkout/index.ts` (add embedded mode branch)
- **Delete**: `src/components/Account/UpgradePlanModal.tsx`

### 6. Out of scope
- No homepage visual/copy/i18n changes (locked surface respected via pure refactor).
- No changes to the Account page billing/usage/history/security cards.
- No new pricing or new plans — Vendor Pro reuses the existing homepage Vendor Pro CTA target.

### 7. Verification
1. `/` homepage pricing section is pixel-identical to today (same heading, subheading, all 4 cards, both footer lines).
2. Account → "Upgrade Plan" navigates to `/dashboard/upgrade` showing the same pricing section.
3. Clicking any of the 4 "Start Planning Free" buttons (when logged in) routes to `/dashboard/upgrade/checkout?plan=<key>`.
4. Checkout screen shows the matching plan summary on the left and an embedded Stripe Checkout on the right with the correct AUD amount (Essential $99, Premium $149, Unlimited $249, Vendor Pro $249/mo subscription).
5. Successful payment lands on `/payment-success`.
6. Existing paying users still hit the Stripe billing portal directly (unchanged).
