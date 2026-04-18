
## Goal
Wire the Account page fully to real data + Stripe monetisation. No other pages touched.

## Findings (verified)
- `get-account-billing` edge function exists — returns payment method, invoices, next billing, portal URL.
- `useUserPlan`, `useProfile`, `useEvents` already provide subscription/profile/events data.
- `subscriptions` / `user_subscriptions` table already tracks plan + expiry.
- Existing `create-checkout` and `verify-payment` edge functions handle one-off plan purchases. No recurring Stripe price exists yet — the app's pricing model is **one-time** (Essential $99 / Premium $149 / Unlimited $249), not subscriptions.
- `BillingCard.tsx` and `HistoryCard.tsx` currently render placeholders — they need to call `get-account-billing` and display real data.
- `SubscriptionCard.tsx` shows plan name + status but lacks a real start date.
- `SecurityCard.tsx` exists but I need to verify it reads `email_confirmed_at` and triggers `supabase.auth.resend`.

## Decision: Stripe model
Keep the **existing one-time payment model** (matches current pricing in project knowledge). "Upgrade Plan" routes to the existing `my-events` upgrade flow (which already uses `create-checkout` for one-time purchases). I will NOT introduce recurring subscriptions — that would conflict with the locked pricing structure. If a Stripe customer + invoices exist (from past one-time purchases), Billing/History will show them via `get-account-billing`.

## Plan

### 1. `BillingCard.tsx` — connect to real data
- On mount, call `supabase.functions.invoke('get-account-billing')`.
- Render: card brand + last4, last payment (amount + date), next billing date (or "—" for one-time), **Download Invoice** opens `hosted_invoice_url` in new tab, **Update Payment Method** opens `portal_url`.
- Empty state: "No payment method on file", buttons disabled.
- Loading skeleton.

### 2. `HistoryCard.tsx` — connect to real invoices
- Reuse the same `get-account-billing` response (lift fetch to a small shared hook `useAccountBilling.ts` to avoid double-calling).
- Render rows: Date · Type (Payment/Refund) · Amount · "View" link → `hosted_invoice_url`.
- Empty: "No transactions yet".

### 3. `SubscriptionCard.tsx` — add real start date + correct status
- Fetch `created_at` from `user_subscriptions` (or fall back to `auth.user.created_at` for Free users).
- Status badge: green Active/Trial, amber Trial, red Expired, grey Cancelled.
- "Upgrade Plan" → navigate to `?tab=my-events` (existing upgrade flow), unchanged.

### 4. `AccountInfoCard.tsx` + `EditDetailsModal.tsx` — verify update flow
- Confirm `EditDetailsModal` updates `profiles` and `useProfile` cache refreshes immediately. Patch if missing.

### 5. `UsageCard.tsx` — already correct, just verify
- Total Guests: count from `guests` (already correct).
- Total Events: count from `events` (already correct).
- If `guest_limit` null → render "Unlimited" with full bar; else progress bar vs limit. Already done — verify.

### 6. `SecurityCard.tsx` — verify auth integration
- Email verified badge driven by `user.email_confirmed_at`.
- "Send Verification Email" calls `supabase.auth.resend({ type: 'signup', email })`.
- Change Password modal already wired — verify it works.

### 7. Success-redirect handling
- In `Account.tsx`, `useEffect` checks `searchParams.get('success') === 'true'`:
  - Toast "Your plan has been upgraded successfully"
  - Force-refresh `useUserPlan` + billing hook
  - Strip the param from URL.

### 8. New shared hook
- `src/hooks/useAccountBilling.ts` — single source of truth for the `get-account-billing` response, with `refetch`. Used by Billing + History cards.

### 9. Lock files
- Add/refresh `🔒 PRODUCTION-LOCKED` headers on all edited Account files.
- Append entry to `LOCKED_TRANSLATION_KEYS.md`.

### 10. Verify end-to-end
- With Free account: cards show clean empty states, no console errors.
- Edit Details → save → instant UI refresh.
- Change Password → success toast.
- Send Verification → toast confirming email sent.
- Mobile 375px → all cards stack cleanly.
- TypeScript build passes.

## Out of scope (per user "do not change anything else")
- Sidebar, Dashboard tab logic, pricing structure, my-events upgrade flow.
- Stripe webhook changes (existing `verify-payment` already updates `user_subscriptions`).
- Switching to recurring subscriptions (conflicts with locked one-time pricing).

## Files modified
- `src/components/Account/BillingCard.tsx`
- `src/components/Account/HistoryCard.tsx`
- `src/components/Account/SubscriptionCard.tsx`
- `src/components/Account/SecurityCard.tsx` (verify only, patch if needed)
- `src/components/Account/EditDetailsModal.tsx` (verify only)
- `src/pages/Account.tsx` (success-redirect handling)
- `LOCKED_TRANSLATION_KEYS.md`

## Files created
- `src/hooks/useAccountBilling.ts`
