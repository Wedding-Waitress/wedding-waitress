
## Goal
Make every "Start Planning" / "Get Started" / "Choose Pro" CTA across the entire site behave identically: open the existing **"Create your free account"** modal for logged-out users, navigate to **/dashboard** for logged-in users. No design or text changes.

## Audit findings

The site has two CTA wrapper patterns today, and they behave differently:

| Wrapper | Logged-out | Logged-in | Where used |
|---|---|---|---|
| `AuthGatedCtaLink` | Opens SignUpModal | Navigates to /dashboard ✅ | All 13 product pages (top + bottom CTAs) |
| `SignUpModal` (wrap) | Opens SignUpModal ✅ | Opens SignUpModal ❌ | Landing hero, all 4 pricing buttons, final CTA, Header "Get Started" |
| Plain `<Link to="/dashboard">` | Goes straight to dashboard ❌ | Goes to dashboard | NotFound page |

So the inconsistency is: `SignUpModal`-wrapped CTAs always show the popup even for logged-in users (annoying for them but not insecure), and one stray `<Link to="/dashboard">` in NotFound bypasses signup.

## Fix (single source of truth)

**Strategy:** Update `AuthGatedCtaLink` so it can wrap any trigger element (not just render its own button), then replace every inconsistent CTA wrapper with it. This keeps existing styling 100% intact because the children are unchanged.

### 1. Extend `src/components/auth/AuthGatedCtaLink.tsx`
- Keep current behaviour (button rendering with className/children).
- Already correct: re-checks session at click time, opens existing `SignUpModal` if logged out, navigates to `/dashboard` if logged in.
- No design changes — same `className` pass-through.

### 2. Replace `SignUpModal` wrappers on `src/pages/Landing.tsx`
Convert these to `AuthGatedCtaLink to="/dashboard"` while preserving the exact inner Button JSX and classes:
- Hero: "Start Planning Your Event" (line 161)
- Pricing card 1: "Get Started" (line 518)
- Pricing card 2: "Get Started" (line 549)
- Pricing card 3: "Get Started" (line 576)
- Pricing card 4: "Get Started" (line 605)
- Final CTA section: `finalCta.cta` button (line 839)

### 3. Update `src/components/Layout/Header.tsx`
- "Get Started" header button (line 165): swap `SignUpModal` wrapper for `AuthGatedCtaLink to="/dashboard"`. Keep button styling and translation key.

### 4. Fix stray bypass in `src/pages/NotFound.tsx`
- Replace `<Link to="/dashboard">Go to Dashboard</Link>` with `AuthGatedCtaLink to="/dashboard"`. Keep button visuals.

### 5. Already correct — no changes needed
- All 13 `/products/*` pages (top + bottom CTAs already gated via `ProductPageLayout` → `AuthGatedCtaLink`).
- Footer "Start Planning" link inside `ProductPageLayout` (already gated).
- All `/features/*` pages use `FeaturePageLayout` which embeds `EmbeddedSignUpForm` directly (no CTA bypass).
- `Index.tsx` is dead code — not routed in `App.tsx` (the `/` route renders `Landing`). No change.

## Out of scope (do not touch)
- Any styling, spacing, button variants, icons, colors, text/translations.
- The SignUpModal itself — reused as-is.
- Authenticated dashboard internals.
- The `Admin.tsx` `navigate('/dashboard')` calls (those run after admin checks, not user-clickable CTAs).

## Test checklist (after implementing)
- Logged out: Landing hero → modal opens, pricing × 4 → modal, final CTA → modal, Header "Get Started" → modal, NotFound "Go to Dashboard" → modal, all 13 product pages top+bottom → modal.
- Logged in: every one of the above goes straight to `/dashboard`, no modal flash.
- Visual regression: zero — only wrapper components change, inner Button JSX preserved.
- Mobile: same behaviour, since wrappers don't affect layout.
