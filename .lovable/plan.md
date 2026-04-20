
## Goal
Add a new blog post: "How to Create a Wedding Seating Chart (Step-by-Step Guide)" — matching the existing blog page design and structure. Text/content-only addition; no design or layout changes.

## Heads-up: locked surface
Blog plumbing (`src/content/blogPosts.ts`, `src/pages/BlogPost.tsx`, `src/i18n/locales/*/landing.json`) is part of the LOCKED PUBLIC SURFACE. Your approval authorizes this addition. I will only **add** a new entry — no edits to existing posts, components, or styling.

## Changes

### 1. `src/content/blogPosts.ts`
Append one new entry to `BLOG_POSTS_STATIC`:
- `slug`: `"how-to-create-a-wedding-seating-chart-step-by-step"`
- `date`: `"2026-04-20"`
- `coverEmoji`: `"📝"`
- `coverImage`: reuse existing `"blog-planning-laptop"` (no new asset needed)
- `internalLinks`:
  - QR Code Seating Chart → `/products/qr-code-seating-chart`
  - Guest List Manager → `/products/guest-list`
  - Tables & Seating → `/products/tables`
  - How to create a QR code seating chart in 5 minutes → `/blog/how-to-create-qr-code-seating-chart`
  - How to handle last-minute seating changes → `/blog/last-minute-wedding-seating-changes`

### 2. `src/i18n/locales/en/landing.json`
Add a new entry under `blog.posts.how-to-create-a-wedding-seating-chart-step-by-step` with:
- `title`: "How to Create a Wedding Seating Chart (Step-by-Step Guide)"
- `metaTitle`: "How to Create a Wedding Seating Chart (Step-by-Step Guide Australia)"
- `metaDescription`: "Learn how to create a wedding seating chart step-by-step. Easy guide for Australian couples using digital and QR code seating charts."
- `excerpt`: short 1–2 sentence summary derived from the intro
- `readingTime`: "6 min read"
- `intro`: the 3-paragraph introduction provided
- `sections[]`: 5 H2 sections matching the user's outline:
  1. "What is a Wedding Seating Chart?"
  2. "Step-by-Step Guide to Creating Your Seating Chart" (paragraphs cover Steps 1–6)
  3. "Common Wedding Seating Mistakes"
  4. "Pro Tips for a Perfect Seating Chart"
  5. "Create Your Wedding Seating Chart in Minutes"

Only English locale is updated, matching the established pattern. Other locales untouched.

## CTA
The existing `BlogPost.tsx` template already renders a CTA section at the bottom of every post (using `blog.ctaTitle` / `blog.ctaSubtitle` / `blog.ctaButton`). It opens the SignUpModal — functionally equivalent to "Start Planning Your Event" routing into the app. To match the user's request for a "Start Planning Your Event" button linked to the homepage while preserving the locked template, I will **not** modify `BlogPost.tsx`; the existing CTA already serves this purpose on every blog post and links into the signup/start-planning flow. (If you want the literal label "Start Planning Your Event" on this single post, that would require a per-post CTA override — say the word and I'll add it as a follow-up.)

## SEO
- `<title>` and `<meta description>` are set per-post via the existing `SeoHead` in `BlogPost.tsx` using `metaTitle` / `metaDescription` from i18n — automatically picked up.
- Article + Breadcrumb JSON-LD already emitted by the template.
- Post auto-appears on `/blog` index and in "Keep reading" related sections of other posts.

## Out of scope
- No edits to `BlogPost.tsx`, `Blog.tsx`, design tokens, or other locales.
- No new images/assets.
- No changes to existing posts.

## Verification after apply
1. `/blog` lists the new post card.
2. `/blog/how-to-create-a-wedding-seating-chart-step-by-step` renders with H1, intro, 5 H2 sections, internal links sidebar, and CTA.
3. Browser tab title + meta description match the new SEO copy.
4. No visual diff on existing blog pages.
