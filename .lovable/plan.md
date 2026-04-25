## Goal
Restyle the **My Account** page (`/dashboard` → profile dropdown) to feel like a premium extension of the Wedding Waitress homepage: cream background, soft gold gradients on buttons, rounded cards with subtle gold glow, refined typography. **Layout, structure, spacing, and positioning stay 100% unchanged.**

## ⚠️ Lock notice (must acknowledge before I proceed)
The files I need to touch are flagged in two places:
1. File headers: `// 🔒 PRODUCTION-LOCKED — Account ... (2026-04-18)`
2. Project memory `Core` rule: *"LOCKED DASHBOARD UI (2026-04-19): … Account page header + SectionCard shell. DO NOT modify without owner approval."*

Your message *"We are updating the visual design of the dashboard (My Account page)"* is the owner approval to override the lock for **styling only**. I will:
- Update the file header comments to reflect the new lock date (2026-04-25) so the lock stays intact going forward.
- Make zero changes to JSX structure, props, hooks, routes, or spacing classes — only color/background/border/shadow/font-weight/gradient utilities.

If you want me to leave any one of these files alone, tell me which and I'll skip it.

## Files I will edit (styling only)
1. `src/pages/Account.tsx` — page background + heading typography
2. `src/components/Account/SectionCard.tsx` — card surface, border, shadow, icon chip
3. `src/components/Account/AccountInfoCard.tsx` — primary button → gold gradient pill
4. `src/components/Account/SubscriptionCard.tsx` — primary button → gold gradient pill
5. `src/components/Account/BillingCard.tsx` — primary + outline buttons
6. `src/components/Account/SecurityCard.tsx` — primary + outline buttons
7. `src/components/Account/UsageCard.tsx` — progress bar fill → gold gradient
8. `src/components/Account/HistoryCard.tsx` — "View" link tone (already gold, slight refinement only)

No new files, no removed components, no JSX additions/removals.

## The visual changes (precisely scoped)

### 1. Page background — `Account.tsx`
- Wrap the existing `<div class="w-full max-w-3xl …">` in a parent with a soft cream → beige radial/linear gradient (uses existing `--gradient-subtle` token), full-bleed behind the page.
- Heading `<h1>My Account</h1>`: keep size/weight, add a subtle gold gradient text treatment via the existing `.gradient-text` utility (or a scoped `bg-clip-text` with the gold gradient). Subtitle stays plain muted.
- **No changes** to `mb-8`, `space-y-5`, `max-w-3xl`, `px-1 sm:px-2 pb-12`.

### 2. Cards — `SectionCard.tsx`
Current: `bg-white rounded-2xl shadow-[…] border border-[#E8E1D6]/60 p-6 sm:p-8`
New (same dimensions):
- Background: `bg-gradient-to-b from-white to-[#FBF7F0]` (very subtle cream tint) instead of flat white.
- Border: keep `border border-[#E8E1D6]/70` but warmer.
- Shadow: dual-layer soft gold glow — `shadow-[0_2px_8px_-2px_rgba(150,122,89,0.10),0_8px_24px_-12px_rgba(150,122,89,0.18)]` and a slightly stronger version on hover.
- Icon chip (currently `bg-[#967A59]/10`): change to a soft gold gradient `bg-gradient-to-br from-[#C9A87A]/25 to-[#967A59]/15` with a hairline `ring-1 ring-[#967A59]/15`.
- Title `<h2>`: keep size/weight; add `tracking-tight` (already there) and slightly warmer foreground via existing token — no font-family swap (Inter is already homepage font for body).
- All paddings, gaps, flex rules: **unchanged**.

### 3. Buttons — gold gradient pill (homepage-matching)
Current primary: `bg-[#967A59] hover:bg-[#7d6649] text-white rounded-full`
New primary (same size/shape/position):
```
bg-gradient-to-r from-[#B8946A] via-[#967A59] to-[#7d6649]
hover:from-[#A88560] hover:via-[#7d6649] hover:to-[#6a5640]
text-white rounded-full shadow-[0_2px_8px_-2px_rgba(150,122,89,0.45)]
hover:shadow-[0_4px_12px_-2px_rgba(150,122,89,0.55)]
transition-all
```
Outline buttons (Download Invoice, Send Verification Email): add `border-[#C9A87A]/50 text-[#7d6649] hover:bg-[#FBF3E5]` while keeping `rounded-full` and size.

### 4. Usage progress bars — `UsageCard.tsx`
Replace the solid `[&>div]:bg-[#967A59]` with a gold gradient: `[&>div]:bg-gradient-to-r [&>div]:from-[#C9A87A] [&>div]:to-[#967A59]`. Same height, same track.

### 5. Status badges (Subscription, Security)
Leave green/red/amber semantic badges untouched — they're status signals, not decoration. Only the gold "Active" path could optionally get `border-[#C9A87A]/40`; happy to skip if you want zero badge changes.

### 6. History "View" links
Already `text-[#967A59]` — bump to `text-[#7d6649] hover:text-[#967A59]` for slightly stronger hierarchy. No layout change.

## What I will NOT change
- JSX tree, component nesting, conditional rendering
- Any `space-*`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`, `grid-*`, `flex-*` class
- Hooks, routes, navigation behavior, Stripe logic, button labels, button click handlers
- The sidebar, header, dropdown, or any non-Account file
- Locked features (Full Seating Chart, Place Cards, public surface)
- Icon set (still Lucide line icons — they already match the brief)

## Verification after implementation
1. Visit `/dashboard` → avatar → "My Account" — visually compare against your reference screenshot. Cards should sit in identical grid positions with new gold-tinted surfaces.
2. Hover each button — gold gradient deepens, shadow lifts.
3. Resize to mobile (375px) and tablet — no layout shift vs current production.
4. Tab through buttons — focus rings still visible.
5. Confirm all Account flows still work (Edit Details modal, Change Plan navigation, Stripe portal, Change Password modal, verification email).
