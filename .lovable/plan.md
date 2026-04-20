
## Goal
Make `https://weddingwaitress.netlify.app/blog` load correctly instead of returning 404 on direct navigation / refresh.

## Findings
- The route is already correctly wired in `src/App.tsx`: `<Route path="/blog" element={<Blog />} />` and `<Route path="/blog/:slug" element={<BlogPost />} />`. So in-app navigation works; the 404 only happens on direct URL hit / refresh.
- The site is being served from Netlify (`weddingwaitress.netlify.app`), not Lovable hosting. Netlify does NOT auto-fallback SPA routes — it requires a `public/_redirects` file.
- There is currently no `public/_redirects` file in the project (only `manifest.json`, `placeholder.svg`, `robots.txt`, `sitemap.xml`, and a `videos/` folder).
- Note: Lovable's own docs say `_redirects` is a no-op on Lovable hosting, but it IS required and respected by Netlify. Since this site is deployed to Netlify, adding it is the correct fix and harmless on Lovable.

## Change (single file, additive)
Create **`public/_redirects`** with:
```
/*    /index.html   200
```
That's it. SPA fallback — every unmatched path serves `index.html` so React Router can handle `/blog`, `/blog/:slug`, `/products/*`, `/features/*`, etc.

## Out of scope
- No router/code changes (route is already correct).
- No design/layout/content changes.
- No changes to `sitemap.xml`, `robots.txt`, or SEO files.

## Verification after publish + Netlify redeploy
1. `https://weddingwaitress.netlify.app/blog` loads the Blog index (no 404).
2. Refreshing on `/blog/best-wedding-seating-chart-templates-australia` keeps the post (no 404).
3. Deep links to `/products/*`, `/features/*`, `/contact`, `/privacy` all load on refresh.
4. Static assets (`/sitemap.xml`, `/robots.txt`, images) still resolve normally — the `200` rule only applies when no real file matches.
