
## Update VITE_PUBLIC_BASE_URL to Production Domain

### Change Required
Update line 6 in `.env` file:
- **From:** `VITE_PUBLIC_BASE_URL="https://wedding-waitress.lovable.app"`
- **To:** `VITE_PUBLIC_BASE_URL="https://weddingwaitress.com"`

### Impact
This change will ensure that all QR codes and guest shared links (generated via `buildGuestLookupUrl()`, `buildKioskUrl()`, `buildDJQuestionnaireUrl()` in `src/lib/urlUtils.ts`) now point to the production domain `weddingwaitress.com` instead of the preview subdomain. Existing QR codes and links already generated with the old URL will become invalid, so guests should be notified to rescan or request new links.

### Files to Modify
- `.env` - Update line 6 only, no other changes
