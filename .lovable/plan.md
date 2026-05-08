# Admin Gated Access & Permission Hardening — Phase 1

Surgical hardening pass. No redesigns. No new RBAC system. Foundation already exists (`account_members`, `useAccountRole`, `is_account_master`, `account_event_access`); this plan finishes wiring it through the UI and adds matching server-side guards.

---

## 1. Permission primitives (single source of truth)

Add tiny helpers so every gated surface uses identical logic:

- `src/lib/permissions.ts` — pure mapping: `canManageBilling`, `canPurchaseEvents`, `canDeleteEvent`, `canManageUsers`, `canManageVendorPro`, `canDeleteAccount`. Each takes `{ role: AccountRole }` (and later `{ collaboratorRole }` — left as TODO comment).
- Extend `src/hooks/useAccountRole.ts`: keep current API, add `permissions` object derived from `role` so call sites are one-liners.
- `src/components/permissions/MasterOnly.tsx` — renders children when master; otherwise renders a **disabled clone** wrapped in a premium tooltip ("Only the Master Account Holder can manage billing and account access.").
- `src/components/permissions/LockedTooltip.tsx` — small wrapper around shadcn `Tooltip` with brand-styled lock icon (`Lock` from lucide, `#967A59`).

No styling redesign — uses existing tokens and `lv-premium-shade`.

## 2. Account page gating (`/dashboard/account`)

`Account.tsx` is locked, so we only edit the inner cards (already structured for this). All edits are additive — no layout changes.

| Card | Action | Master | Standard |
|------|--------|--------|----------|
| `AccountAccessCard` | Invite / Manage Users | visible (today) | hide buttons (already gated — verify) |
| `SubscriptionCard` | "Change Plan" button | enabled | **disabled + LockedTooltip** |
| `BillingCard` | Update card / view invoices / portal links | enabled | disabled + tooltip; invoice list stays read-only visible |
| `UsageCard` | — | unchanged | unchanged (read-only for all) |
| `HistoryCard` | — | unchanged | unchanged (read-only) |
| `SecurityCard` | Change password | always enabled (own account) | always enabled |
| `SecurityCard` | Delete account (if present) | enabled | hidden |

Standard users still see plan name, usage, history → satisfies "still see plan information, account usage, collaboration visibility".

## 3. Events surface gating

Sensitive actions: **create event**, **delete event**, **purchase additional event**.

`EventsTable.tsx` carries a production lock header. Two options:

**Option A (preferred — surgical, no layout change):** gate at the handler/button props passed in from `Dashboard.tsx` / `MyEventsPage`. Pass `canDelete`/`canCreate`/`canPurchase` and let existing button render disabled with tooltip via shared `LockedTooltip`. This requires a tiny addition to `EventsTable.tsx` props and conditional `disabled` on the existing `Trash2` / `Plus` / `Buy more` buttons — additive only, no redesign.

**Option B:** intercept inside the handlers (`deleteEvent`, `createEvent`, `purchaseAdditionalEvent`) and pop a `LockedSheet` instead of executing. Zero UI markup change.

→ **Going with Option B** to avoid touching the locked table file. The locked file's UI stays byte-identical; the gate lives inside `useEvents.ts` (`deleteEvent`, `createEvent`) and `useAdditionalEventPurchase` (or equivalent). Returns a friendly `{ blocked: true, reason }` and the call site shows a `ComingSoonSheet`-style explanatory sheet (reuse existing `ComingSoonSheet` pattern).

If you want Option A (visual disabled state in the table itself) — say so and I will treat it as explicit override of the lock header.

## 4. Vendor Pro gating

`useUserPlan` already exposes `plan_name`. Add `isVendorPro` derivation in `useAccountRole` result. Vendor-pro **owner** = master; vendor-pro **standard** seat = standard. Same gates from §1 apply automatically — no separate code path. Vendor-specific admin controls (capacity, seat management) get the same `MasterOnly` wrapper.

## 5. Server-side guards (defense in depth)

Add a single migration that closes the loopholes a determined Standard user could exploit via direct API:

1. **`events` DELETE policy** — replace existing user-only delete policy with: `auth.uid() = user_id AND public.is_account_master(auth.uid())`. (Current standard members are scaffolded but cannot delete other-account events anyway because of `user_id` scoping; this just prevents a master from delegating delete to a standard seat in the future.)
2. **`additional_event_purchases` INSERT** — keep service-role only (already enforced via edge function); add a RAISE EXCEPTION guard inside the `create-additional-event-checkout` edge function: reject if caller is not master.
3. **`stripe-customer-portal` / `create-checkout-session` / `cancel-subscription` edge functions** — early return `403` when `is_account_master(user.id)` is false. Read JWT, call RPC, abort.
4. **`account_members` / `account_invitations` / `event_collaborators`** — policies already restrict to `account_owner_id = auth.uid()` (master). Verify and document.

No table schema changes. Migration is a few `DROP POLICY`/`CREATE POLICY` + edge function edits.

## 6. Public route safety

Audit-only — no edits expected. Verify:
- `/s/:slug`, `/kiosk/:slug`, vendor share tokens, reset-password and token routes never read `useAccountRole` and never render any control gated by it.
- Token-validated RPCs (`get_public_event_with_data_secure`, `update_guest_with_token`, etc.) do not consult `account_members` — confirmed by grep.

Deliverable: a one-paragraph confirmation in the final report.

## 7. Cleanup (minimal, only-if-confirmed-redundant)

- Remove the legacy `requireMaster(role)` re-export if nothing imports it (`useAccountRole` now exposes `isMaster`).
- Remove any duplicated inline `role === 'master'` checks in favor of `usePermissions()`.

No other deletions.

## 8. Mobile QA

For each gated control: verify on 375px viewport that
- disabled state retains brand color contrast,
- `LockedTooltip` renders as a tap-to-show popover (not hover-only),
- no overflow / horizontal scroll introduced,
- `pt-6+` header rule and 44px touch targets respected.

Quick screenshot pass via preview at the end.

---

## Files touched

Created
- `src/lib/permissions.ts`
- `src/components/permissions/MasterOnly.tsx`
- `src/components/permissions/LockedTooltip.tsx`
- `supabase/migrations/<ts>_master_only_destructive_guards.sql`

Edited
- `src/hooks/useAccountRole.ts` (add `permissions` + `isVendorPro`)
- `src/components/Account/SubscriptionCard.tsx` (button gate)
- `src/components/Account/BillingCard.tsx` (button gate)
- `src/components/Account/SecurityCard.tsx` (delete-account gate, if present)
- `src/hooks/useEvents.ts` (`deleteEvent`, `createEvent` master guard + sheet trigger)
- additional-event purchase hook (master guard)
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/create-additional-event-checkout/index.ts` (or current name)
- `supabase/functions/stripe-customer-portal/index.ts`
- `supabase/functions/cancel-subscription/index.ts` (if present)

Not touched (locked)
- `Account.tsx`, `EventsTable.tsx`, `Landing.tsx`, all public-route pages, auth modals, pricing page, Stripe architecture.

## Deliverable

After merge, report will contain:
1. List of every action gated + UX shown to standard users.
2. Server-side guards added.
3. Confirmation Standard Users cannot reach billing/destructive flows (UI + API).
4. Public route safety confirmation.
5. Open future-role considerations (collaborator/bride/groom/venue staff/planner) noted as TODOs in `permissions.ts`.
