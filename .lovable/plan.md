## Stage 1 — Sidebar Identity + SaaS Control Centre

Scope: only `src/components/Dashboard/AppSidebar.tsx` (account footer block + dropdown). No other layouts, no Stripe, no permissions.

### 1. Replace "Account ID" with "Current Plan"

In the `SidebarFooter` user button (lines ~199–208):
- Remove the `{profile?.account_id && ...}` Account ID line entirely.
- Replace with a single subtle line: `Current Plan: <PlanName>`.
- Source plan name from `useUserPlan()` → `plan?.plan_name`. Fallback to `Free` when null/loading.
- Map raw names to display labels: `Starter → Free`, `Essential`, `Premium`, `Unlimited`, `Vendor Basic`, `Vendor Pro` (pass-through for already-clean names).
- Account ID stays available in My Account page (no change there).

### 1a. UX polish — two-tone "Current Plan" line

Render as two spans on one line, both `text-[11px] truncate`:
- Label `Current Plan:` → `text-muted-foreground/80` (muted).
- Plan name → `text-foreground/90 font-medium ml-1` (slightly brighter, premium feel).

All plans use the same styling — Free/Starter is NOT dimmed, italicized, or greyed. Every plan name (Free, Essential, Premium, Unlimited, Vendor Basic, Vendor Pro) renders with identical visual weight so every tier feels valid and respected.

### 2. Expand dropdown menu

Inside `DropdownMenuContent`, replace current items with this exact order:

1. My Account — existing `handleItemClick('account')`, `UserCircle` icon.
2. Upgrade Plan — `Sparkles` icon, opens placeholder dialog.
3. Get Help — `LifeBuoy` icon, opens placeholder dialog.
4. Referral / Affiliate Rewards — `Gift` icon, opens placeholder dialog.
5. Admin Panel — existing, gated by `isOwnerAdmin`, opens `AdminOtpModal` (unchanged).
6. Log Out — existing destructive item, `onSignOut` (unchanged).

Separators: thin separator above Admin Panel (only when admin) and above Log Out.

### 3. Placeholder modal

One local `useState` `placeholder: null | 'upgrade' | 'help' | 'referral'`. Single shared `<Dialog>` whose title/body switches on the value:
- Upgrade Plan → "Full upgrade flow arrives in Stage 3."
- Get Help → "Help centre arrives in Stage 2."
- Referral / Affiliate Rewards → "Referral rewards arrive in Stage 4."

Each with a single Close button.

### 4. Preserved behaviour (explicitly untouched)

- `DropdownMenu` open/close, `side="top"`, `sideOffset`, classes.
- All responsive sidebar, hamburger, overlay drawer, mobile/tablet logic.
- All other sidebar menu items, badges, animations.
- `AdminOtpModal`, `useIsOwnerAdmin`, `useProfile` usage.
- `profile.account_id` still fetched (used by My Account).

### Files modified

- `src/components/Dashboard/AppSidebar.tsx` — footer button text + dropdown items + one shared placeholder Dialog (~45 lines changed/added).

### Out of scope (later stages)

Real Upgrade flow, Help system, Referral system, Credits, Testimonials, QR Designer.
