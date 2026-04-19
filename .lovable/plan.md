
## Goal
Lift the dashboard/backend UI (Account page + all dashboard pages + sidebar + headers) to match the homepage's premium wedding aesthetic. Visual only — no functional, structural, routing, or data changes.

## Investigation needed
Before editing I need to confirm the exact current implementation of:
1. `src/pages/Dashboard.tsx` — page wrapper, background class, header/title block, tab rendering, and which container wraps every tab page.
2. `src/components/Dashboard/` — sidebar component (likely `AppSidebar.tsx`), shared header, and the wrapper used by each tab page (so a single style change cascades).
3. `src/pages/Account.tsx` + `src/components/Account/SectionCard.tsx` — already shown; SectionCard is the shared card shell, so card visuals can be upgraded in one place.
4. Homepage tokens to mirror: cream/beige gradient (`Landing.tsx` hero/section backgrounds), button style (`rounded-full`, brown `#967A59`, hover scale/shadow), section heading scale, brand font.
5. `src/index.css` / `tailwind.config.ts` — to add a reusable `bg-dashboard-surface` gradient utility and a soft shadow token without touching every file.

I will NOT touch the locked public surface (Landing, features/products, auth modals, Layout, SEO, locked footer, locked translations).

## Design tokens (single source of truth)
Add to `src/index.css` (scoped to dashboard, won't affect public pages):
- `.dashboard-surface` — `bg-gradient-to-b from-[#FBF7F0] via-[#F7F1E6] to-[#F3EBDC]` min-h-screen.
- `.dashboard-card` — `bg-white rounded-2xl border border-[#E8E1D6]/60 shadow-[0_4px_24px_-8px_rgba(150,122,89,0.14)] p-7 sm:p-9 transition-all duration-200 hover:shadow-[0_8px_32px_-8px_rgba(150,122,89,0.22)]`.
- `.dashboard-btn-primary` — `rounded-full px-5 py-2.5 bg-[#967A59] hover:bg-[#7d6649] text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all`.
- `.dashboard-btn-outline` — `rounded-full px-5 py-2.5 border border-[#967A59]/30 text-[#967A59] hover:bg-[#967A59]/5 hover:scale-[1.02] transition-all`.
- `.dashboard-section-title` — `text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]`.
- `.dashboard-section-subtitle` — `text-sm sm:text-base text-[#6E6E73] mt-2`.

Using utility classes here means future tweaks happen in one file.

## Changes by file

### 1. `src/index.css`
Add the dashboard utility classes above (additive, no existing rules touched).

### 2. `src/pages/Dashboard.tsx`
- Wrap the main content area in `dashboard-surface` (replace flat bg only — keep all tab logic, state, props).
- Increase top/bottom padding around the tab container (e.g. `py-8 sm:py-12`).
- No changes to tab switching, sidebar mounting, stats bar visibility logic, or any handler.

### 3. Sidebar (`src/components/Dashboard/AppSidebar.tsx` — confirm exact path during build)
- Add subtle right-edge shadow / 1px divider (`shadow-[2px_0_12px_-6px_rgba(150,122,89,0.12)]` or `border-r border-[#E8E1D6]/60`).
- Increase vertical gap between menu items (`gap-1.5` → `gap-2`, `py-2` → `py-2.5`).
- Active item: brown-tinted background `bg-[#967A59]/10 text-[#967A59] font-medium` with a 3px left accent bar.
- Hover: `hover:bg-[#967A59]/5`.
- No route, label, icon, badge, or order changes.

### 4. Account page header — `src/pages/Account.tsx`
- Apply `dashboard-section-title` + `dashboard-section-subtitle` classes.
- Increase header bottom margin (`mb-8` → `mb-10 sm:mb-12`).
- Increase card spacing (`space-y-5 sm:space-y-6` → `space-y-6 sm:space-y-8`).
- No content changes.

### 5. SectionCard shell — `src/components/Account/SectionCard.tsx`
- Swap inline classes for `dashboard-card`.
- Slightly larger title (`text-lg sm:text-xl` → `text-xl sm:text-2xl`), keep icon block.
- Reduce label emphasis is handled inside each card (Account/Billing/Usage/History) by softening `Row` label class to `text-[#6E6E73] text-xs uppercase tracking-wide font-medium` and strengthening value to `text-[#1D1D1F] font-semibold`. Applied in `AccountInfoCard`, `BillingCard`, `UsageCard`, `HistoryCard`, `SubscriptionCard`, `SecurityCard` — class-only edits, no logic.

### 6. Buttons across Account cards
Replace the inline `bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full` and outline variants with the new `dashboard-btn-primary` / `dashboard-btn-outline` utility classes. Files touched (class swap only):
- `AccountInfoCard.tsx` (Edit Details)
- `SubscriptionCard.tsx` (Upgrade Plan)
- `BillingCard.tsx` (Download Invoice, Update Payment Method)
- `SecurityCard.tsx` (Change Password)

### 7. Other dashboard pages (cascade)
The same visual lift applies to all dashboard tab pages by:
- Inheriting the `dashboard-surface` background from `Dashboard.tsx` (one change covers every tab).
- Updating the shared dashboard page wrapper (if one exists in `src/components/Dashboard/`) to use the same outer paddings as Account.
- I will NOT bulk-restyle every tab's internal cards in this pass — that risks breaking locked features (Full Seating Chart, Place Cards, etc.). Instead I'll update only the **shared shell** so the page background, header style, and sidebar are consistent everywhere, and each existing card already uses its own white-card pattern that visually harmonises with the new background.

If you want every tab's individual cards (Tables, Guest List, etc.) re-skinned to match Account's `dashboard-card` exactly, that's a larger pass — say the word and I'll do it as a follow-up plan.

## Locked features — untouched
Full Seating Chart, Place Cards, locked public surface (Landing, features/products, auth modals, footer), locked translations.

## Lock the new dashboard design
After applying:
1. Add sentinel comment `// 🔒 LOCKED DASHBOARD UI (2026-04-19) — DO NOT MODIFY without explicit owner approval` to:
   - `src/pages/Dashboard.tsx` (wrapper + header block)
   - `src/components/Dashboard/AppSidebar.tsx`
   - `src/components/Account/SectionCard.tsx`
   - `src/pages/Account.tsx`
   - The new utility class block in `src/index.css`
2. Append a "Dashboard UI (LOCKED 2026-04-19)" section to `LOCKED_TRANSLATION_KEYS.md` covering: dashboard surface gradient, dashboard-card shell, dashboard-btn-primary/outline, sidebar shadow + active state, Account header scale.
3. Update `mem://index.md` Core: append `Dashboard UI shell (surface gradient, dashboard-card, dashboard-btn-*, sidebar styling, Account header) locked 2026-04-19.`
4. Update `mem://standards/locked-translations.md` with a new "Dashboard UI" subsection listing the locked utility classes and files.

## Out of scope
Functionality, data, routing, forms, inputs, any locked feature internals (Full Seating Chart, Place Cards), public homepage / features / products / auth modals / footer.

## Verification
1. `/dashboard?tab=account`: warm cream→beige gradient background; cards floating with softer shadow + larger radius + more padding; section title bigger; buttons rounded-full with hover lift; sidebar has subtle separation, larger active highlight, more menu spacing.
2. Switch through every dashboard tab: same gradient background and sidebar everywhere, no layout breakage, no functional regression.
3. Mobile (375px): cards still readable, padding still comfortable, sidebar drawer behaviour unchanged.
4. Locked features (Full Seating Chart, Place Cards) render and export identically — no visual or behavioural change inside their canvases.
5. Public homepage + footer untouched.
