
## Goal
Add a new blog post: "Best Wedding Seating Chart Templates (Australia Guide)" — content-only addition matching the existing blog template.

## Heads-up: locked surface
`src/content/blogPosts.ts` and `src/i18n/locales/en/landing.json` are part of the LOCKED PUBLIC SURFACE. Your approval authorizes this addition. No edits to existing posts, components, or styling.

## Changes

### 1. `src/content/blogPosts.ts`
Append one new entry to `BLOG_POSTS_STATIC`:
- `slug`: `"best-wedding-seating-chart-templates-australia"`
- `date`: `"2026-04-20"`
- `coverEmoji`: `"🎨"`
- `coverImage`: reuse existing `"blog-planning-laptop"`
- `internalLinks`:
  - QR Code Seating Chart → `/products/qr-code-seating-chart`
  - Full Seating Chart → `/products/full-seating-chart`
  - Guest List Manager → `/products/guest-list`
  - How to create a wedding seating chart (step-by-step) → `/blog/how-to-create-a-wedding-seating-chart-step-by-step`
  - Wedding seating chart etiquette → `/blog/wedding-seating-chart-etiquette-who-sits-where`

### 2. `src/i18n/locales/en/landing.json`
Add new entry under `blog.posts.best-wedding-seating-chart-templates-australia`:
- `title`: "Best Wedding Seating Chart Templates (Australia Guide)"
- `metaTitle`: "Best Wedding Seating Chart Templates (Australia Guide 2026)"
- `metaDescription`: "Looking for wedding seating chart templates? Discover the best options, ideas, and digital solutions for Australian weddings."
- `excerpt`: 1–2 sentence summary derived from intro
- `readingTime`: "6 min read"
- `intro`: 3-paragraph introduction provided
- `sections[]`: 9 H2 sections matching the user's outline:
  1. What is a Wedding Seating Chart Template?
  2. Popular Wedding Seating Chart Template Styles (covers the 5 styles)
  3. Why Digital Templates Are Taking Over
  4. QR Code Wedding Seating Templates
  5. How to Choose the Right Template
  6. Common Template Mistakes
  7. The Smart Way to Create Your Seating Chart
  8. Start Planning Your Seating Chart

Only English locale updated (matches established pattern).

## CTA & SEO
Existing `BlogPost.tsx` template already renders the bottom CTA routing to start-planning, and `SeoHead` auto-picks up `metaTitle`/`metaDescription` plus Article + Breadcrumb JSON-LD. No template changes.

## Out of scope
No edits to `BlogPost.tsx`, `Blog.tsx`, design tokens, other locales, or other posts. No new images.

## Verification after apply
1. `/blog` lists the new post card.
2. `/blog/best-wedding-seating-chart-templates-australia` renders with H1, intro, 8 H2 sections, internal links sidebar, and CTA.
3. Browser tab title + meta description match the new SEO copy.
4. No visual diff on existing pages.
