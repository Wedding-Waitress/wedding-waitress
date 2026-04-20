
## Goal
Add a new blog post: "Wedding Seating Chart Etiquette: Who Sits Where?" — content-only addition matching the existing blog template.

## Heads-up: locked surface
`src/content/blogPosts.ts` and `src/i18n/locales/en/landing.json` are part of the LOCKED PUBLIC SURFACE. Your approval authorizes this addition. No edits to existing posts, components, or styling.

## Changes

### 1. `src/content/blogPosts.ts`
Append one new entry to `BLOG_POSTS_STATIC`:
- `slug`: `"wedding-seating-chart-etiquette-who-sits-where"`
- `date`: `"2026-04-20"`
- `coverEmoji`: `"💺"`
- `coverImage`: reuse existing `"blog-planning-laptop"` (no new asset needed)
- `internalLinks`:
  - QR Code Seating Chart → `/products/qr-code-seating-chart`
  - Guest List Manager → `/products/guest-list`
  - Tables & Seating → `/products/tables`
  - How to create a wedding seating chart (step-by-step) → `/blog/how-to-create-a-wedding-seating-chart-step-by-step`
  - Why couples are switching to QR code seating → `/blog/qr-code-wedding-seating-chart-australia`

### 2. `src/i18n/locales/en/landing.json`
Add new entry under `blog.posts.wedding-seating-chart-etiquette-who-sits-where`:
- `title`: "Wedding Seating Chart Etiquette: Who Sits Where?"
- `metaTitle`: "Wedding Seating Chart Etiquette: Who Sits Where? (Australia Guide)"
- `metaDescription`: "Confused about wedding seating etiquette? Learn who sits where, table arrangements, and how to organise guests stress-free."
- `excerpt`: 1–2 sentence summary derived from intro
- `readingTime`: "6 min read"
- `intro`: 3-paragraph introduction provided
- `sections[]`: 10 H2 sections matching the user's outline:
  1. Why Seating Etiquette Matters
  2. The Head Table (Top Table) Explained
  3. Where Should Family Sit?
  4. Friends & Social Groups
  5. Kids Table or Not?
  6. Couples — Always Together?
  7. Common Seating Mistakes
  8. Modern Solution: Digital Seating Charts
  9. QR Code Seating Charts (Game Changer)
  10. Plan Your Seating the Smart Way

Only English locale updated (matches established pattern).

## CTA
The existing `BlogPost.tsx` template already renders a CTA section at the bottom of every post that routes into the start-planning/signup flow — no template changes needed.

## SEO
`SeoHead` in `BlogPost.tsx` automatically picks up `metaTitle` / `metaDescription`. Article + Breadcrumb JSON-LD already emitted. Post auto-appears on `/blog` index.

## Out of scope
No edits to `BlogPost.tsx`, `Blog.tsx`, design tokens, other locales, or other posts. No new images.

## Verification after apply
1. `/blog` lists the new post card.
2. `/blog/wedding-seating-chart-etiquette-who-sits-where` renders with H1, intro, 10 H2 sections, internal links sidebar, and CTA.
3. Browser tab title + meta description match the new SEO copy.
4. No visual diff on existing pages.
