
## Plan (PENDING AUTHORISATION): Homepage SEO Optimisation

**Blocked:** `src/pages/Landing.tsx` is locked. Requires `AUTHORISED CHANGE – HOMEPAGE` phrase in the prompt before I can edit it.

### Files (once authorised)
- **Edit** `src/pages/Landing.tsx`
  - Add `<SeoHead>` at top with title `"Wedding Planning App | Guest List, Seating Chart & Invitations"` and the supplied meta description (indexable — no `noIndex`).
  - Update H1 to `"All-In-One Wedding Planning Made Simple"` and lead paragraph to the supplied supporting text.
  - Insert a new "Explore the Platform" section with 5 internal-link cards (Guest List, Tables, QR Seating, Invitations, Name Place Cards) each linking to its `/products/*` page using `<Link>` from `react-router-dom`. Cards styled to match existing Landing aesthetic (white card, brown accent, rounded-2xl).
  - Ensure both CTAs exist: `Start Planning Your Event → /dashboard` and `View All Features → /products/my-events`.
- **Verify** `src/App.tsx` already has `HelmetProvider` wrapping `<BrowserRouter>` (needed for `SeoHead`). If missing, wrap it — `react-helmet-async` is already used by `SeoHead.tsx`.

### Notes
- I'll preserve all existing Landing sections (hero video, pricing, testimonials, etc.) and only update the H1/lead, add SEO head, and append the internal-links grid.
- No structural rewrite, no removal of existing copy beyond the H1/lead replacement you specified.
- Will need to read `src/pages/Landing.tsx` and `src/App.tsx` first to confirm exact insertion points and HelmetProvider status before editing.

**Next step from you:** Reply with `AUTHORISED CHANGE – HOMEPAGE` to proceed.
