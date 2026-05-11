## Goal

Replace all favicon assets with the brown Wedding Waitress waitress logo you uploaded, so the correct icon appears on browser tabs, Google search results, mobile bookmarks, and Apple home screen — across both `weddingwaitress.com.au` (current) and the old `weddingwaitress.com` deployment.

## Important context (read first)

The site **already references** Wedding Waitress favicons in `index.html` (`favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-180.png`, `favicon-192.png`, `favicon-512.png`) and `manifest.json`. There are **no Lovable/Netlify icons left in the code.** What's actually shown on Google / browser tabs comes from two things:

1. The PNG/ICO files sitting in `public/` — these may still be an older version of the logo.
2. **Google's favicon cache**, which refreshes only when Google re-crawls (often weeks). Nothing in code can force this — it just needs the new file live + time.

So this task is: regenerate the icon files from your new upload + cache-bust + republish. The old `.com` domain will pick up the new icon **only if it's still pointing at this Lovable project** (a DNS question, not a code question — see step 5).

## Plan

### 1. Save the uploaded brown logo as the source
- Copy `user-uploads://Favicon._Brown._PNG-7.png` to `public/wedding-waitress-favicon-source.png` (kept as the master).

### 2. Regenerate all favicon sizes from the source
Use ImageMagick (via `nix run nixpkgs#imagemagick`) to produce, from the uploaded PNG, on a transparent background, centered with a small safe margin:
- `public/favicon-16.png` (16×16)
- `public/favicon-32.png` (32×32)
- `public/favicon-180.png` (180×180, Apple touch icon)
- `public/favicon-192.png` (192×192, Android/PWA)
- `public/favicon-512.png` (512×512, PWA maskable)
- `public/favicon.ico` (multi-resolution: 16, 32, 48)
- `public/favicon.png` (512 fallback)

All overwrite existing files. No new filenames introduced — so no other code needs to change.

### 3. Bump the cache-buster in `index.html`
Change every `?v=3` → `?v=4` on the favicon `<link>` tags so browsers and crawlers fetch the new files immediately instead of serving the cached old one.

### 4. Bump cache-buster in `public/manifest.json`
Same `?v=3` → `?v=4` on the two manifest icon entries (192 + 512).

### 5. The old `weddingwaitress.com` domain
This is **not a code change** — it's a DNS / domain setup question. After we publish, what happens on `.com` depends on where it currently points:

- **If `.com` is still connected to this Lovable project** in Project Settings → Domains: the new favicon will go live there automatically. Google will then refresh its cached favicon over the following days/weeks (we cannot speed this up).
- **If `.com` is no longer connected**: nothing we change in code can affect it. You would need to either (a) reconnect `.com` in Project Settings → Domains, or (b) set up a 301 redirect from `.com` → `.com.au` at your domain registrar, which is the cleanest long-term fix and consolidates SEO.

I'll flag this in the closing message after publishing so you can check Project Settings → Domains and confirm what `.com` is doing.

### 6. Publish
After the file changes, you click **Publish → Update** so the new favicon goes live on `weddingwaitress.com.au` (and `.com` if it's still connected).

## Out of scope (will NOT touch)

- Any page design, layout, components, copy, colors, or functionality.
- The `wedding-waitress-logo*.png` files used inside the app (PDF exports, print headers, share images) — those stay as-is.
- Locked public surface, dashboard UI, or any other locked areas.
- DNS records / domain registrar settings (I'll only advise; you control your registrar).

## Risk

Very low. Only static asset replacement + a `v=3 → v=4` string change in two files. No JS, no React, no DB.
