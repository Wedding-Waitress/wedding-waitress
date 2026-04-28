## Goal

Replace every reference to `weddingwaitress.com` with `weddingwaitress.com.au` across the project, scoped to:
- Web URLs (canonicals, OG, structured data, breadcrumbs, footer/back links)
- Sitemap + robots.txt + sitemap generator
- Hostname guard (noindex on non-canonical hosts)
- Contact email `support@weddingwaitress.com` → `support@weddingwaitress.com.au`

Explicitly NOT changing (per your answer):
- `noreply@weddingwaitress.com` (Resend sender — keeps emails delivering)
- `notify.weddingwaitress.com` sender domain in `send-transactional-email`
- `FROM_DOMAIN = "weddingwaitress.com"` constant in the same function

## Files to update

### 1. SEO / hostname / sitemap
- `index.html` — canonical, `og:url`, JSON-LD `url`, hostname guard (`weddingwaitress.com` → `weddingwaitress.com.au`, `www.weddingwaitress.com` → `www.weddingwaitress.com.au`)
- `public/robots.txt` — Sitemap URL
- `public/sitemap.xml` — all 30+ `<loc>` entries
- `scripts/generate-sitemap.mjs` — `SITE_URL` constant
- `src/components/SEO/SeoHead.tsx` — `SITE_URL` constant + both hostname guard checks (locked file; required by request)

### 2. Layout / page-level structured data and links
- `src/components/Layout/FeaturePageLayout.tsx` — breadcrumb + JSON-LD URLs (3 occurrences)
- `src/components/Layout/ProductPageLayout.tsx` — page url + breadcrumbs + JSON-LD (4 occurrences)
- `src/pages/Blog.tsx` — JSON-LD url
- `src/pages/BlogPost.tsx` — page url, logo url, breadcrumbs (4 occurrences)
- `src/pages/Contact.tsx` — JSON-LD url
- `src/pages/Index.tsx` — FAQ answer text + footer list item (2 occurrences, support email)
- `src/pages/DJMCPublicView.tsx` — 2 anchor `href`s
- `src/pages/RunningSheetPublicView.tsx` — anchor `href`
- `src/pages/SeatingChartPublicView.tsx` — 2 anchor `href`s
- `src/pages/GuestLookup.tsx` — anchor `href`
- `src/pages/KioskView.tsx` — anchor `href`
- `src/pages/CookiePolicy.tsx` — mailto + display text
- `src/pages/PrivacyPolicy.tsx` — 4 occurrences (mailtos + display text)
- `src/pages/TermsOfService.tsx` — 5 occurrences (mailtos + display text)

### 3. Components / forms (support email only)
- `src/components/ContactForm.tsx` — `recipientEmail`, error toast text, header comment
- `src/components/auth/EmbeddedSignUpForm.tsx` — `recipientEmail`

### 4. Supabase edge functions (URLs + support@ recipient only)
- `supabase/functions/_shared/transactional-email-templates/admin-new-payment.tsx` — `to:` recipient
- `supabase/functions/_shared/transactional-email-templates/admin-new-signup.tsx` — `to:` recipient
- `supabase/functions/_shared/transactional-email-templates/contact-form-message.tsx` — `to:` recipient
- `supabase/functions/_shared/transactional-email-templates/welcome.tsx` — dashboard button URL
- `supabase/functions/get-account-billing/index.ts` — origin fallback URL
- `supabase/functions/qr-redirect/index.ts` — `PUBLIC_BASE_URL` fallback
- `supabase/functions/send-auth-email/index.ts` — `redirectTo` fallback
- `supabase/functions/send-invitation-email/index.ts` — `baseUrl` + footer text (keep `from: noreply@weddingwaitress.com` unchanged)
- `supabase/functions/send-rsvp-email/index.ts` — `baseUrl` + footer text (keep `from:` unchanged)
- `supabase/functions/send-rsvp-sms/index.ts` — `baseUrl`
- `supabase/functions/verify-payment/index.ts` — `recipientEmail`

### 5. Docs
- `README.md` — support email
- `LOCKED_TRANSLATION_KEYS.md` — update mentions of `support@weddingwaitress.com` to `.com.au` (the locked CONTRACT itself is being intentionally amended only for the email/URL strings; structure/wiring unchanged)

## Explicit non-changes
- `from: 'Wedding Waitress <noreply@weddingwaitress.com>'` lines in `send-invitation-email` + `send-rsvp-email`
- `SENDER_DOMAIN = "notify.weddingwaitress.com"` and `FROM_DOMAIN = "weddingwaitress.com"` in `send-transactional-email/index.ts`
- No design, layout, copy, logic, or i18n changes — only string substitution

## Method

1. Targeted `code--line_replace` edits per file (precise, no behavior change).
2. After all replacements, run `rg "weddingwaitress\.com[^.]"` to verify nothing was missed (excluding the intentionally preserved sender-domain references).
3. Note for you afterward: you'll need to set up `weddingwaitress.com.au` DNS / hosting redirects so the new canonical URLs actually resolve. The app code change alone won't move the live site — that's a hosting/DNS step on your side.