## Goal
Sync every event-capacity calculation, label, and fallback so all paid plans show **3 included events** (Essential / Premium / Unlimited) and Vendor Pro stays at **100**. Additional events remain A$99 each, account-wide. No UI redesign, no styling, no pricing-page or Stripe-architecture changes.

## Current state (audit)
- `src/lib/planRegistry.ts` — Essential/Premium/Unlimited `includedEvents: 2`; Vendor Pro `100` ✅
- `src/lib/upgradePlans.ts` — three plan summaries hardcode "2 events included"
- `src/hooks/useEventLimits.ts` — fallback `?? 1` when plan unknown
- `supabase/migrations/20260508134037_…sql` — `subscription_plans.included_events` default `2`; vendor row updated to 100
- `src/lib/stripePrices.ts` `VENDOR_PRO.included_events: 100` ✅
- `AdditionalEventModal.tsx`, `EventUsagePill.tsx`, `AccountAccessCard.tsx`, `SubscriptionCard.tsx`, `EventsTable.tsx` — all already read from `useEventLimits` (dynamic, no change needed)
- Edge functions `create-extension-checkout` / `verify-payment` — no hardcoded event-limit math (rely on `additional_event_purchases` rows) ✅

## Changes

### 1. `src/lib/planRegistry.ts`
Set `limits.includedEvents` to `3` for `essential`, `premium`, `unlimited`. Vendor Pro stays `100`.

### 2. `src/lib/upgradePlans.ts`
Replace the three "2 events included" strings (description + features array) with "3 events included" for Essential, Premium, Unlimited. Vendor Pro copy unchanged (already "100 events included").

### 3. `src/hooks/useEventLimits.ts`
Change unknown-plan fallback from `?? 1` to `?? 3` so a missing/loading plan no longer under-reports capacity.

### 4. New migration — sync DB column
```sql
ALTER TABLE public.subscription_plans
  ALTER COLUMN included_events SET DEFAULT 3;

UPDATE public.subscription_plans
  SET included_events = 3
  WHERE lower(name) NOT LIKE '%vendor%';

UPDATE public.subscription_plans
  SET included_events = 100
  WHERE lower(name) LIKE '%vendor%';
```

### 5. `src/pages/TermsOfService.tsx` (optional accuracy fix)
Three occurrences of "Limited to 1 event" describing paid plans → "Limited to 3 events (additional events A$99 each)". Flagging because Terms is user-facing legal copy; will only change if you confirm. (Public surface is locked per memory — would need approval.)

## Not changed (explicitly out of scope)
- `AdditionalEventModal` markup/styling (already dynamic — text auto-updates to "Your plan includes 3 events")
- `EventUsagePill`, `AccountAccessCard`, `SubscriptionCard`, `EventsTable` — already dynamic
- Stripe price IDs, checkout edge functions, pricing page layout, permissions
- Vendor Pro values (already 100)

## Verification after build
- New account on Essential → modal reads "Your plan includes **3** events. You currently have N."
- Pill shows `N of 3 events used`; after one A$99 purchase → `N of 4`.
- Vendor Pro account still shows 100 included.
- `subscription_plans.included_events` in DB returns 3 / 3 / 3 / 100.