## Audit results

I checked everything — here's the current state vs. what you're asking for.

### ✅ What's already correct
- `src/components/SEO/SeoHead.tsx` (used by every page) sets `SITE_URL = 'https://weddingwaitress.com.au'` and emits canonical + `og:url` from that constant.
- `index.html` canonical, `og:url`, and JSON-LD all point to `https://weddingwaitress.com.au`.
- All 50+ entries in `public/sitemap.xml` use `https://weddingwaitress.com.au`.
- `scripts/generate-sitemap.mjs` hardcodes the same `.com.au` base.
- Non-canonical hosts (Netlify, Lovable previews, `.com`) are blocked from indexing via a `noindex,nofollow` meta tag injected in both `index.html` and `SeoHead.tsx`.
- No `weddingwaitress.com` (non-`.com.au`) URL exists anywhere in code.
- OG fallback image is `/wedding-waitress-logo.png` (the brown brand logo, not Lovable).

### ⚠️ What does NOT match your request

**1. You asked for canonical = `https://www.weddingwaitress.com.au` (WITH `www`).**
The codebase currently uses the **bare** `https://weddingwaitress.com.au` (no `www`) as canonical everywhere. Both are valid — but only ONE should be canonical, and the other should 301 to it. We need to pick one and align everything.

**2. 301 redirects from `.com` → `.com.au`, and bare ↔ www, are NOT something code can do on Lovable hosting.**
Lovable does not process `_redirects`, `netlify.toml`, or `vercel.json`. 301s are configured at:
- **Project Settings → Domains** (mark the chosen canonical as **Primary** — Lovable auto-301s the others to it), AND
- Your **domain registrar's DNS** (for `weddingwaitress.com` → must either be connected to this Lovable project so the Primary redirect kicks in, OR a registrar-level forward set up there).

I can verify and update the code side. The DNS/Primary side you'll need to do in Lovable's UI + your registrar — I'll give exact steps.

**3. OG image is the existing brand logo, not the new brown-waitress favicon you uploaded last turn.**
The OG image (`/wedding-waitress-logo.png`) is a different file from the favicon source. You may want OG to keep the wider logo (better for social previews) OR switch it to the new waitress icon. This is a choice — see Q1 below.

---

## Questions before I proceed

I need 2 confirmations to write the right plan:

**Q1 — Which canonical do you want?**
- (A) `https://www.weddingwaitress.com.au` (WITH www) — what you wrote in this message. Cleaner with subdomains, slightly more enterprise-y.
- (B) `https://weddingwaitress.com.au` (no www) — what your code, sitemap, and Google Search Console verification are currently set to. Modern default, shorter URL.

⚠️ If you pick (A), every page that's already indexed by Google will need to re-index under `www.` — short-term ranking dip is possible but will recover. If you pick (B), zero SEO disruption.

**Q2 — OG image (social preview when someone shares a link)**
- (A) Keep the existing brand logo `/wedding-waitress-logo.png` (currently used).
- (B) Switch to the new brown waitress favicon `/favicon-512.png`.
- (C) Use a dedicated wider share image — `/wedding-waitress-share-logo.png` already exists in `public/`.

---

## Plan (assuming answers, will adjust)

### Code changes I will make

1. **Update `SITE_URL` in `src/components/SEO/SeoHead.tsx`** to your chosen canonical (with or without `www`). This automatically updates canonical, `og:url`, and Twitter URLs on every page.
2. **Update `index.html`**: canonical link, `og:url`, JSON-LD `url`, the noindex hostname guard (allow only the chosen primary host), and OG image if you pick a new one.
3. **Update `public/sitemap.xml`** — rewrite all 50+ `<loc>` entries to the chosen canonical host.
4. **Update `scripts/generate-sitemap.mjs`** — change the hardcoded base URL so future sitemap regenerations are consistent.
5. **Update OG image references** in `SeoHead.tsx` `DEFAULT_IMAGE` and `index.html` `og:image` per your Q2 answer.
6. **Verify `public/_redirects` and `public/_headers`** — `_redirects` currently has Netlify-style rules that Lovable hosting ignores anyway. I'll leave them (harmless) unless you want them removed.

### What you'll need to do (I can't — these are platform/DNS, not code)

7. In **Project Settings → Domains** (Lovable):
   - Make sure the chosen host (e.g. `www.weddingwaitress.com.au` OR `weddingwaitress.com.au`) is marked as **Primary**. Lovable auto-301s the other one to it.
   - If `weddingwaitress.com` is listed: keep it connected so Lovable serves the 301 to the `.com.au` Primary.
   - If `weddingwaitress.com` is NOT listed: at your **domain registrar** for `.com`, set up domain forwarding (301) → `https://www.weddingwaitress.com.au` (or whichever you chose).
8. Re-submit `sitemap.xml` in **Google Search Console** under the chosen canonical property so Google re-indexes faster.

### Out of scope
- Page design, copy, components, dashboard, or any locked surface.
- DNS records (you control your registrar; I'll only advise).

Tell me your Q1 + Q2 picks and I'll execute.
