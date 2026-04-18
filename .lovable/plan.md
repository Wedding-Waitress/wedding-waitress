
## Goal
Add a new **Account** page to the dashboard, accessible via a profile icon dropdown in the top-right of the dashboard header (not the sidebar). Then lock the new files.

## Findings (need to verify before building)
- `src/pages/Dashboard.tsx` uses `activeTab` state to switch sections — I'll add `"account"` as a new tab value, render conditionally, but keep it OUT of the sidebar.
- `src/components/Dashboard/DashboardHeader.tsx` is where the profile dropdown will live (top-right).
- Existing hooks I'll reuse (no new fetching logic):
  - `useProfile` — name, email, phone, update details
  - `useUserPlan` — plan name, status, start, expiry
  - `useEvents` — total events count
  - `useGuests` (or aggregate query) — total guests across events
- Stripe billing data: `verify-payment` / `create-checkout` edge functions already exist. For invoices/payment method/history I'll call a small read-only edge function (or surface what's already on `useUserPlan` + a Stripe Customer Portal link via `create-checkout` style redirect).

## Plan

### 1. New page component
`src/pages/Account.tsx` — composes 6 cards in a single vertical column, max-width container, generous padding, soft shadow, rounded-2xl, brand brown `#967A59` accents.

### 2. New section components (one file per card, kept small)
`src/components/Account/`
- `AccountInfoCard.tsx` — Name, Email, Phone + **Edit Details** button → opens `EditDetailsModal`
- `SubscriptionCard.tsx` — Plan name + status badge (green Active / red Expired), Start, Expiry, **Upgrade Plan** CTA
- `BillingCard.tsx` — Payment method (masked), Last payment, Next billing, **Download Invoice** + **Update Payment Method** (opens Stripe Customer Portal)
- `UsageCard.tsx` — Progress bars for Total Guests (vs plan limit), Total Events, Storage (placeholder "Coming soon")
- `HistoryCard.tsx` — Date / Type / Amount table
- `SecurityCard.tsx` — Masked password, email verified badge, **Change Password** modal + **Send Verification Email** button
- `EditDetailsModal.tsx` — form for first/last/phone, calls profile update
- `ChangePasswordModal.tsx` — current + new password, calls `supabase.auth.updateUser`

### 3. Header profile dropdown
Add to `src/components/Dashboard/DashboardHeader.tsx` (top-right):
- Circular avatar button with user initials, brown background `#967A59`, white text
- Radix `DropdownMenu` with items: **Account**, **Sign out**
- Clicking **Account** sets `activeTab="account"` in Dashboard

### 4. Wire into Dashboard
- `src/pages/Dashboard.tsx`: add `{activeTab === "account" && <Account />}` render branch
- Add `"account"` to the StatsBar exclusion list (no stats bar on Account page)
- **Sidebar untouched** — Account is reachable only via the header dropdown

### 5. Billing data source
Create one tiny new edge function `supabase/functions/get-account-billing/index.ts` that:
- Reads the user's Stripe customer ID from existing `subscriptions` table
- Returns: payment method last4 + brand, last invoice (amount + date + hosted URL), next billing date, history (last 10 invoices)
- Returns gracefully empty data if no Stripe customer yet (Free plan)

For "Update Payment Method", reuse Stripe Customer Portal via a small `create-portal-session` function (or extend `get-account-billing` to also return a portal URL).

### 6. Lock the new files
- Add `🔒 PRODUCTION-LOCKED` header comment to all new `.tsx`/`.ts` files
- Append "Locked Account page (2026-04-18)" section to `LOCKED_TRANSLATION_KEYS.md`
- Update `mem://standards/locked-translations.md`

### 7. Verify end-to-end (before reporting done)
- Click avatar → dropdown opens → click Account → page renders
- Each card shows real data (or graceful empty state)
- Edit Details modal saves and reflects
- Change Password modal works
- Send Verification Email triggers `supabase.auth.resend`
- Mobile (375px) — cards stack cleanly, no overflow
- Sidebar and Dashboard tab unchanged
- TypeScript build passes
- Confirm lock headers present

## Out of scope
- Sidebar changes (forbidden by user)
- Dashboard layout/content changes (forbidden by user)
- Real storage-usage calculation (placeholder progress bar with "Coming soon" label)
- Refund processing UI (display-only in History)

## Files created
- `src/pages/Account.tsx`
- `src/components/Account/{AccountInfoCard,SubscriptionCard,BillingCard,UsageCard,HistoryCard,SecurityCard,EditDetailsModal,ChangePasswordModal}.tsx`
- `supabase/functions/get-account-billing/index.ts`

## Files modified
- `src/components/Dashboard/DashboardHeader.tsx` (add profile dropdown)
- `src/pages/Dashboard.tsx` (add `account` tab render branch + StatsBar exclusion)
- `LOCKED_TRANSLATION_KEYS.md` (new lock section)
- `mem://standards/locked-translations.md` and `mem://index.md` (memory update)
