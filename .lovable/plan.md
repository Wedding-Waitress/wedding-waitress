## Lock override

You're explicitly authorising edits to the LOCKED PUBLIC SURFACE: `src/pages/Landing.tsx` and `index.html`. All visual design preserved — only semantic, attribute, and color-token-level changes.

## 1. Heading hierarchy (Landing.tsx footer, lines 636/644/650/659)

Change four `<h4>` → `<h3>`. No styling change (classes unchanged), so visual output is identical.

## 2. Replace generic "Learn More" with descriptive text

Single source: the alternating-features `<Button>` at line 428 uses `t('alternating.learnMore')` for all 13 features. Replace with a per-feature label so each link is unique and descriptive.

Approach (no new translation keys, keeps i18n surface intact):

```tsx
{t(`alternating.${feature.key}.title`) /* e.g. "Smart Guest List" */}
```

Render as visible text: `Learn more about {feature title}`. To keep the existing visual exactly the same length-wise across screen sizes, do:

```tsx
<Button …>
  <span aria-hidden="true">{t('alternating.learnMore')}</span>
  <span className="sr-only">
    {t('alternating.learnMore')} {t(`alternating.${feature.key}.title`)}
  </span>
  <ArrowRight … />
</Button>
```

This satisfies link-text uniqueness (screen readers + crawlers see "Learn more about Smart Guest List", "Learn more about Tables & Seating", etc.) while the visual button text remains "Learn More" with the arrow — pixel-identical design.

## 3. Hero LCP (index.html + Landing.tsx)

Current desktop hero `<img>` (line 118-130) has `loading="lazy"` — that's the LCP regression. Fix:

- Remove `loading="lazy"`, add `loading="eager"` and `fetchPriority="high"` on the desktop hero `<img>`.
- `index.html` already preloads `/src/assets/hero-wedding.jpg` — keep as-is. Width/height (1920×1080) already explicit.

Mobile slideshow already does `loading={i === 0 ? "eager" : "lazy"}` and `fetchPriority="high"` for slide 0 — leave untouched.

## 4. font-display: swap

Google Fonts URL in `index.html` line 46 already ends with `&display=swap` — already correct. The Inter `<link rel="preload" as="font">` at line 37 is the woff2 preload; browsers honour the stylesheet's `font-display: swap`. No change required, but to be explicit and bulletproof against the Lighthouse audit, add a small `<style>` in `<head>`:

```html
<style>
  /* Ensure FOUT not FOIT for any locally referenced @font-face */
  @font-face { font-display: swap; }
</style>
```

(no-op if no local @font-face; harmless safeguard.)

## 5. Low-contrast accessibility (Landing.tsx body copy)

Audit shows the recurring offender on white sections is `text-gray-500` / `text-gray-400` paragraphs (e.g. line 423 alternating feature description). On `#FFFFFF` background `text-gray-500` is ~4.6:1 (borderline) and `text-gray-400` fails. Footer uses `text-gray-300` on dark `bg-gray-900` which passes (~9:1) — leave footer untouched.

Replace on white-background sections only:

- `text-gray-500` → `text-gray-600` (≥7:1 on white, AAA)
- `text-gray-400` → `text-gray-600` (only if rendered on white/light)

Scope: only the body-paragraph occurrences inside `<section>` blocks with light/white backgrounds in `Landing.tsx`. Headings (`text-gray-900`) and dark-section text untouched. No token additions to `index.css` needed — the brown/cream system stays intact.

## 6. Verify, mark fixed, prompt republish

After edits:
1. Visually compare Landing in preview — confirm no layout/colour shift beyond the slightly darker body grey.
2. Mark these SEO findings fixed via `update_findings`:
   - `agent_content:content` (h3 + descriptive links)
   - `lighthouse:lighthouse_performance` (hero eager + fetchpriority)
   - `lighthouse:lighthouse_accessibility` (gray-500 → gray-600)
3. Tell you to **Publish** so the next Lighthouse-based scan re-evaluates against the new build, then **Rescan** in the SEO tab.

## Files touched

- `src/pages/Landing.tsx` — footer h4→h3 (×4), Learn More aria/sr-only wrap, hero img loading/fetchpriority, body text-gray-500/400 → text-gray-600 on light sections
- `index.html` — defensive `<style>@font-face{font-display:swap}</style>` in head

## Out of scope (unchanged)

- Footer grid + link styling (locked 2026-04-19) — only the heading element name changes
- ContactForm, blog content, i18n landing.json, design tokens, brand colours
- Sitemap/robots/llms.txt (already addressed last turn)
