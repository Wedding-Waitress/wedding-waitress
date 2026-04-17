
Two parallel tasks. Let me explore first.

**Task 1 — CTA auth gating (already partially done via `AuthGatedCtaLink`)**

Need to find every remaining `/dashboard` link and "Start Planning" / "Get Started" CTA NOT already using `AuthGatedCtaLink` or `SignUpModal`. Likely culprits:
- `src/pages/Landing.tsx` — hero CTA, final CTA, pricing CTAs
- `src/pages/features/*.tsx` — 13 feature pages
- `src/pages/products/*.tsx` — individual product pages (some may have inline CTAs not in `ProductPageLayout`)
- `src/components/Layout/FeaturePageLayout.tsx` — if it has its own CTAs
- `src/pages/Blog.tsx` — any CTA on blog index
- `src/components/auth/AuthGatedCtaLink.tsx` — already exists, reuse

Approach:
1. Run a search for `to="/dashboard"`, `navigate('/dashboard')`, `href="/dashboard"` and "Start Planning" / "Get Started" strings.
2. For each match (excluding logged-in user header logout area + Dashboard internal nav):
   - Replace direct `<Link to="/dashboard">` with `<AuthGatedCtaLink to="/dashboard">`.
   - Replace `onClick={() => navigate('/dashboard')}` with auth check or `<SignUpModal>` wrapper.
3. Sign In buttons: ensure they open `SignInModal` (Header already does — verify no orphan "Sign In" buttons elsewhere).

**Task 2 — Add 7 missing feature cards to "Explore the Platform" section**

Locate the section in `src/pages/Landing.tsx`. Currently shows 5 cards. Add 7 more matching existing card style (icon in brown circle, heading, description, "Learn more →" link):

| Card | Icon (lucide) | Route | Description |
|---|---|---|---|
| Individual Table Charts | `LayoutGrid` | `/products/individual-table-charts` | Print elegant per-table seating charts for every guest. |
| Wedding Floor Plan Tool | `Map` | `/products/floor-plan` | Design your ceremony and reception venue layout visually. |
| Dietary Requirements | `ChefHat` | `/products/dietary-requirements` | Track every guest's meal and dietary needs in one place. |
| Full Seating Chart | `FileText` | `/products/full-seating-chart` | Generate a complete printable master seating chart. |
| Kiosk Live View | `Monitor` | `/products/kiosk-live-view` | Let guests find their seat instantly at the venue. |
| DJ & MC Questionnaire | `Music` | `/products/dj-mc-questionnaire` | Brief your DJ and MC with a structured digital form. |
| Wedding Running Sheet Planner | `ListChecks` | `/products/running-sheet` | Build and share a minute-by-minute wedding day timeline. |

Match existing card classes/spacing exactly. Grid stays 3-column on desktop, 2 on tablet, 1 on mobile (whatever the existing grid uses).

**Files to edit**
- `src/pages/Landing.tsx` — add 7 cards
- Each file with raw `/dashboard` or "Start Planning" CTA found in search → wrap with `AuthGatedCtaLink` / `SignUpModal`

**No other changes.** Header sign-in/sign-up flow and `ProductPageLayout` gating already in place from prior work.
