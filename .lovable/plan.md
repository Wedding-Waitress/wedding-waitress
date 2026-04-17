
Goal: fix the CTA gating on the 13 product pages linked from “Explore the Platform” without changing styling, layout, text, or any unrelated part of the app.

What I found
- All 13 product pages are thin wrappers around one shared component: `src/components/Layout/ProductPageLayout.tsx`.
- In that shared layout, both the top hero CTA and the bottom CTA already switch to `AuthGatedCtaLink` when the CTA target is `/dashboard`.
- The 13 product pages all pass `href: '/dashboard'` / `finalCtaHref="/dashboard"`, so in theory one shared implementation controls all 26 buttons.
- The existing auth gate component is `src/components/auth/AuthGatedCtaLink.tsx`, which shows the existing `SignUpModal` for logged-out users and only links to `/dashboard` when a session exists.

Implementation plan
1. Re-audit the 13 linked product pages as a set
- Confirm the exact 13 `/products/*` routes from the “Explore the Platform” section match the requested pages.
- Confirm both CTAs on every page are coming only from `ProductPageLayout` and not overridden locally.

2. Harden the shared CTA logic in one place
- Update `src/components/Layout/ProductPageLayout.tsx` so both “Start Planning Your Event” CTAs are always treated as auth-gated dashboard CTAs for these product pages.
- Remove any fragile dependency on simple string checks if needed, so there is zero chance of a plain `Link` rendering for these dashboard CTAs.
- Preserve all current button classes, spacing, colors, and text exactly.

3. Keep using the existing popup only
- Continue using the existing `SignUpModal` flow through `AuthGatedCtaLink`.
- Do not create a new modal or new auth flow.

4. Verify linked entry points
- Check the “Explore the Platform” cards in `src/pages/Landing.tsx` to ensure each card opens the correct product page.
- Confirm no card points to a route outside the intended 13-page product set.

5. Test the full flow after implementation
- Logged out: each of the 13 product pages, top CTA opens “Create your free account” popup.
- Logged out: bottom CTA does the same.
- Logged in: both CTAs continue to `/dashboard`.
- Confirm no direct dashboard bypass remains from these 26 buttons.
- Confirm no visual/layout regression on desktop and mobile.

Expected file scope
- Primary: `src/components/Layout/ProductPageLayout.tsx`
- Verification only: `src/components/auth/AuthGatedCtaLink.tsx`, `src/pages/Landing.tsx`, and the 13 `src/pages/products/*.tsx` wrappers
- No unrelated files should change.

Technical note
Because all 13 pages share one layout, this should be a single-point fix plus verification rather than 13 separate redesigns. If the issue is reproducible, the safest solution is to enforce auth gating centrally in `ProductPageLayout` so both CTA locations can never fall back to a direct dashboard link for logged-out users.
