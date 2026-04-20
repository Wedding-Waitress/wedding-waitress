
## Goal
Fix `public/sitemap.xml` so Google Search Console indexes correctly: switch all URLs to the canonical `https://weddingwaitress.com` domain and add the 4 new blog posts.

## Why this matters for your indexing request
- Submitting a sitemap with `netlify.app` URLs while the live site is `weddingwaitress.com` confuses Google and slows indexing.
- New blogs not in the sitemap are discoverable only via internal links — adding them tells Google to crawl them now.

## Changes

### `public/sitemap.xml` (only file touched)
1. Replace every `https://weddingwaitress.netlify.app` with `https://weddingwaitress.com` (29 URLs).
2. Append 4 new `<url>` entries (priority `0.7`, `changefreq` `monthly`, matching existing blog entries):
   - `/blog/how-to-create-a-wedding-seating-chart-step-by-step`
   - `/blog/wedding-seating-chart-etiquette-who-sits-where`
   - `/blog/best-wedding-seating-chart-templates-australia`
   - `/blog/common-wedding-seating-chart-mistakes`

No other changes. `robots.txt` already points to `https://weddingwaitress.com/sitemap.xml` — no edit needed.

## After deploy — what you do in Search Console
1. Open Search Console for the `weddingwaitress.com` property (not the netlify one).
2. **Sitemaps** → remove any old sitemap entry → add `sitemap.xml` → Submit.
3. **URL Inspection** → request indexing for these in order:
   - `https://weddingwaitress.com/`
   - `https://weddingwaitress.com/blog`
   - The 4 new blog URLs above
   - `https://weddingwaitress.com/features/seating`
   - `https://weddingwaitress.com/features/qr-seating`

## Out of scope
No code, design, content, or route changes. Sitemap data only.

## Verification
- Visit `https://weddingwaitress.com/sitemap.xml` after deploy — confirm all 33 URLs use `weddingwaitress.com` and the 4 new posts appear.
- Search Console "Sitemaps" tab shows status **Success** with 33 discovered URLs.
