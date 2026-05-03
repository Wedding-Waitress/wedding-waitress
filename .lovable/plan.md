## Favicon Update + Cache Busting

Scope: ONLY `index.html`, `public/manifest.json`, and favicon image files in `/public`. Nothing else.

### 1. Install the new favicon

- Copy `user-uploads://Favicon._Brown._PNG-6.png` → `public/favicon.png` (overwrite the existing one).
- Generate properly sized PNGs from that source so browsers/Google get crisp icons:
  - `public/favicon-16.png` (16×16)
  - `public/favicon-32.png` (32×32)
  - `public/favicon-180.png` (180×180, Apple touch icon)
  - `public/favicon-192.png` (192×192, PWA / Android / Google)
  - `public/favicon-512.png` (512×512, PWA maskable)
  - `public/favicon.ico` (multi-size .ico for `/favicon.ico` default request — fixes legacy + some Google crawlers)
- Master `public/favicon.png` kept at 512×512 (master square).

Generation will use ImageMagick (via `nix run nixpkgs#imagemagick`), preserving transparency and centering on a square canvas.

### 2. Update `index.html` (favicon block only)

Replace the current two icon lines with cache-busted, multi-size declarations (`?v=3`):

```html
<link rel="icon" href="/favicon.ico?v=3" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=3" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png?v=3" />
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=3" />
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png?v=3" />
```

No other tags in `index.html` change. SEO, GA, fonts, robots script, manifest link — all untouched.

### 3. Update `public/manifest.json` (icons array only)

Point PWA icons at the new brown square so Android/installed PWA matches:

```json
"icons": [
  { "src": "/favicon-192.png?v=3", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/favicon-512.png?v=3", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]
```

All other manifest fields (name, theme_color, etc.) stay exactly as they are.

### 4. What this fixes

- Browser tab + bookmark icons immediately update to the brown waitress logo.
- `/favicon.ico` request (default for many crawlers, including Google) now returns the correct branded icon.
- `?v=3` query string forces browsers and Google's crawler to fetch fresh icons instead of serving the cached Lovable default.
- PWA install / Android home screen icon updates to brown logo.

### 5. What is NOT touched

- No changes to any page, component, route, hook, locale file, Supabase, or styling.
- No changes to `Landing.tsx`, dashboard, or any locked surfaces.
- Other logo files in `/public` (e.g. `wedding-waitress-logo.png`) remain as-is — they're used elsewhere and the lock policy applies.

### 6. Post-deploy (manual, outside code)

After publish:
- Hard refresh / incognito to verify tab icon.
- In Google Search Console (`.com.au` property), submit homepage via "URL Inspection → Request Indexing" so Google re-crawls and picks up the new favicon. Google typically refreshes the SERP favicon within a few days to a couple of weeks.
- Add `weddingwaitress.com` as a separate GSC property and confirm the 301 redirect to `.com.au` is working — this accelerates de-indexing of the old domain.
