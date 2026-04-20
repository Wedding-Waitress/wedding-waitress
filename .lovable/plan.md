
## Status: Already Implemented

This change is already live in the codebase. No further work is needed.

## Current Behavior (verified in `src/components/Pricing/PricingSection.tsx`)

The component already branches the CTA label by context using the `onPlanSelect` prop:

```tsx
const ctaLabel = onPlanSelect ? 'Upgrade Now' : t('pricing.getStarted');
```

- **Homepage** (`Landing.tsx`) renders `<PricingSection />` with no `onPlanSelect` → buttons display **"Start Planning Free"** (via `t('pricing.getStarted')`).
- **Dashboard** (`UpgradePricing.tsx` at `/dashboard/upgrade`) renders `<PricingSection onPlanSelect={handlePlanSelect} />` → buttons display **"Upgrade Now"**.

All 4 cards (Essential, Premium, Unlimited, Vendor Pro) use the same `{ctaLabel}` variable, so they are consistent.

## If You Are Still Seeing "Start Planning Free" on `/dashboard/upgrade`

Likely a stale browser cache. Please:
1. Hard-refresh the `/dashboard/upgrade` page (Cmd/Ctrl + Shift + R).
2. Confirm the URL is exactly `/dashboard/upgrade` (not `/#pricing` on the homepage).

If after a hard refresh the buttons still read "Start Planning Free" on `/dashboard/upgrade`, reply with a screenshot of that exact URL and I'll investigate a different root cause (e.g. a second pricing component being rendered there).

## Out of Scope
- No code changes proposed — the requested behavior is already implemented.
