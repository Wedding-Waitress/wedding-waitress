# Fix QR Code & Live View URLs — point to weddingwaitress.com.au

## Root cause

The URL-building code is already environment-aware. `src/lib/urlUtils.ts` exposes `getPublicBaseUrl()`:

```ts
const prodUrl = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();
if (prodUrl) return prodUrl;
return window.location.origin;
```

All three surfaces (Open Live View, Copy Link, QR code value) flow through this helper via `buildDynamicQRUrl()` / `buildGuestLookupUrl()` in `src/lib/invitationQR.ts` and the QR settings components.

The bug is a single typo in `.env`:

```
VITE_PUBLIC_BASE_URL="https://weddingwaitress.com"   ← missing .au
```

That value is baked into the bundle at build time, so every generated link becomes `https://weddingwaitress.com/qr/...` — which doesn't resolve, hence the "site can't be reached" screen in the screenshot.

The Supabase edge function `qr-redirect` already correctly defaults to `https://weddingwaitress.com.au`, so once the QR points at the right host the full chain works.

## Changes

### 1. `.env` — fix the production base URL
```diff
- VITE_PUBLIC_BASE_URL="https://weddingwaitress.com"
+ VITE_PUBLIC_BASE_URL="https://weddingwaitress.com.au"
```

### 2. Verify (no code change needed) — `src/lib/urlUtils.ts`
Already implements the requested pattern: env var first, `window.location.origin` fallback. Used by:
- `buildGuestLookupUrl(eventSlug)` → `/s/{slug}` (Open Live View, Copy Link when no dynamic code)
- `buildDynamicQRUrl(code)` → `/qr/{code}` (QR code value when a dynamic code exists)
- `buildKioskUrl`, `buildSeatingChartUrl`, `buildRunningSheetUrl`, `buildDJQuestionnaireUrl`

No component edits required — fixing the env var corrects all three buttons in one shot.

### 3. Confirm Lovable Cloud secret matches (manual)
After the edit, the Lovable build pipeline must rebuild so the new `VITE_PUBLIC_BASE_URL` is embedded. If the project also stores this value as a Lovable secret/env override at deploy time, that override must read `https://weddingwaitress.com.au` too.

## Behaviour after fix

- Local/preview (`id-preview--*.lovable.app`): if the env var isn't injected at preview build, falls back to `window.location.origin` automatically — preview links keep working.
- Production: every QR code, Open Live View button, and Copy Link button emits `https://weddingwaitress.com.au/qr/...` or `/s/{slug}`.
- Edge function `qr-redirect` resolves the dynamic code and 302s back to `https://weddingwaitress.com.au/s/{slug}` (already correct).

## Out of scope (untouched)

- UI, button styles, QR styling
- Any other page/component
- SEO `SITE_URL` constants in `SeoHead.tsx` and layout files (already `.com.au`)
