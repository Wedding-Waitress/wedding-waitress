
## Plan: Add Static Site Generation (SSG) for Public Routes

### Goal
Prerender HTML for all public marketing pages so Google/Bing see full content on first request (no JS execution required), improving SEO and Core Web Vitals.

### Approach: `vite-react-ssg`
Use `vite-react-ssg` — a lightweight prerenderer purpose-built for Vite + React Router projects. It runs at `npm run build`, executes each route in Node, and writes a real `.html` file per URL into `dist/`. No server required — output is fully static and works on Lovable's existing static hosting.

Why not alternatives:
- **Next.js / Remix**: would require migrating the entire app off Vite. Out of scope.
- **`react-snap` / Puppeteer**: heavy, flaky, headless Chrome at build time.
- **`vite-plugin-ssr` / Vike**: requires app-wide restructuring.

`vite-react-ssg` lets us keep `BrowserRouter` (switched to its provided router) and the existing component tree intact.

### Routes to prerender (public only)
```
/                       → Landing
/privacy                → PrivacyPolicy
/terms                  → TermsOfService
/contact                → Contact
/cookies                → CookiePolicy
/features/guest-list
/features/seating
/features/qr-seating
/features/planning
/features/invitations
/features/events
/features/place-cards
/features/table-charts
/features/dietary
/features/full-seating
/features/kiosk
/features/dj-mc
/features/floor-plan
```

Excluded (dynamic / authenticated / per-token):
`/dashboard`, `/admin`, `/reset-password`, `/s/:slug`, `/kiosk/:slug`, `/dj-mc/*`, `/running-sheet/*`, `/seating-chart/*`, `/qr/*`, `/payment-success`, `*` — these stay as client-rendered SPA fallback.

### Implementation steps

1. **Install** `vite-react-ssg` as a dependency.

2. **Create `src/routes.tsx`** — extract the route table from `App.tsx` into a shared `routes` array consumed by both client and SSG builder. Mark public routes with `entry: true` so SSG prerenders them; dynamic routes stay client-only.

3. **Update `src/main.tsx`** — replace `createRoot(...).render(<App/>)` with `vite-react-ssg`'s `ViteReactSSG(routes, ...)` entry. Providers (`QueryClientProvider`, `ThemeProvider`, `CurrencyProvider`, `AppErrorBoundary`) move into a root layout component so they wrap both SSG and hydration.

4. **Update `vite.config.ts`** — add `ssgOptions` (output dir = `dist`, format = `esm`, `crittersOptions: false` to skip inline-CSS optimization that can break Tailwind).

5. **Update `package.json` build script** — change `"build": "vite build"` to `"build": "vite-react-ssg build"`. Keep `dev` on plain `vite` for fast HMR.

6. **Guard browser-only code** — audit Landing + feature pages for `window`/`document`/`localStorage` access at module scope. Wrap any found in `typeof window !== 'undefined'` checks or move into `useEffect`. Known spots to verify: `analytics.ts`, GA4 `gtag` calls, `CookieBanner`, hero video autoplay logic.

7. **i18n at build time** — `react-i18next` runs in Node fine, but we'll initialize it synchronously in `src/i18n/config.ts` (already does). Default language `en` will be baked into prerendered HTML; client-side language switch still works post-hydration.

8. **Verify** — run `npm run build`, inspect `dist/index.html`, `dist/features/guest-list/index.html`, etc. Confirm each contains real `<h1>`, meta tags, and SEO copy (not just `<div id="root"></div>`).

### Files changed
- `package.json` (add dep, update build script)
- `vite.config.ts` (ssgOptions)
- `src/main.tsx` (swap to ViteReactSSG entry)
- `src/App.tsx` (extract routes; becomes thin wrapper or removed)
- **NEW** `src/routes.tsx` (shared route config)
- Possibly small guards in `src/lib/analytics.ts` and any module-scope `window` access found during audit

### Risks & mitigations
- **Homepage is locked** (`mem://constraint/homepage-locked`): we only wrap `Landing.tsx` in the new router — no edits to its content. If any change to `Landing.tsx` itself is needed (e.g. `window` guard), I will stop and request the authorisation phrase first.
- **Hydration mismatch**: anything time-dependent (countdowns, "today" date) must render the same on server and first client paint. Will use `useEffect` to set client-only values after hydration.
- **Build time**: 18 routes × ~1s each ≈ negligible.

### Out of scope
- Per-language prerendering (could add later: `/de/`, `/fr/` URLs).
- Sitemap regeneration (existing `public/sitemap.xml` already lists these URLs).
- Dynamic OG images.
