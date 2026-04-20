
## Goal
Verify `public/sitemap.xml` already uses `https://weddingwaitress.netlify.app` for every URL, and add any blog posts that are currently missing from it.

## Findings
The sitemap shown in current context already uses `https://weddingwaitress.netlify.app` for all 32 URLs — no `weddingwaitress.com` entries exist. So the "domain swap" the user requested is already in place.

However, since the last sitemap update we've added several new blog posts that are NOT yet in the sitemap:
- `/blog/how-to-create-a-wedding-seating-chart-step-by-step`
- `/blog/wedding-seating-chart-etiquette-who-sits-where`
- `/blog/best-wedding-seating-chart-templates-australia`
- `/blog/common-wedding-seating-chart-mistakes`

(plus any others added in earlier turns I'll confirm by reading `src/content/blogPosts.ts` against the current sitemap before writing.)

## Changes
**`public/sitemap.xml`** — single file edit:
1. Confirm every `<loc>` uses `https://weddingwaitress.netlify.app` (already true; no replacements needed).
2. Append `<url>` entries for every blog slug present in `src/content/blogPosts.ts` that is missing from the sitemap, using the existing blog-post pattern:
   ```
   <changefreq>monthly</changefreq>
   <priority>0.7</priority>
   ```

No other files touched. No layout, routing, or content changes.

## Out of scope
- No domain changes to any other file (robots.txt, SEO components, canonical URLs).
- No edits to existing sitemap entries' priority/changefreq.

## Verification
1. `public/sitemap.xml` is valid XML.
2. Every `<loc>` starts with `https://weddingwaitress.netlify.app`.
3. Every blog slug in `BLOG_POSTS_STATIC` has a matching sitemap entry.
