
## Goal
Translate the "Wedding Tips & Ideas" section on the homepage AND the full blog index + individual blog post pages into all 13 supported languages. No design/layout changes.

## Findings
- `src/content/blogPosts.ts` holds 6 blog posts with hardcoded English `title`, `excerpt`, `readingTime`, and rich `content` blocks (headings + paragraphs).
- `src/pages/Blog.tsx` hardcodes "Wedding Tips & Ideas", subtitle, "Read More →", and footer copyright.
- `src/pages/BlogPost.tsx` (not viewed yet but referenced) renders post content from `BLOG_POSTS` — also English-only.
- The homepage section showing the 3 blog cards likely lives in `Landing.tsx` and pulls from `BLOG_POSTS` too.
- None of the blog files use `useTranslation`.

## Plan

### 1. Translation key structure (`landing.json`)
Add a new `blog` namespace to all 13 locale files:
```
blog: {
  title, subtitle, readMore, readingTime: { min8, min5, min7, ... },
  backToBlog, keepReading, relatedTools,
  posts: {
    "qr-seating-charts-2026": { title, excerpt, readingTime, content: [{type, text}, ...] },
    "running-sheet-guide": { ... },
    "qr-code-seating-5-minutes": { ... },
    "older-guests-qr-codes": { ... },
    "last-minute-changes": { ... },
    "wedding-signage-ideas": { ... }
  }
}
```

### 2. Refactor `src/content/blogPosts.ts`
- Keep structural metadata (slug, coverImage, coverEmoji, related links structure) as static.
- Export a hook `useBlogPosts()` that calls `useTranslation('landing')` and merges static structure with translated text.
- Posts list and content blocks pulled from JSON via slug.

### 3. Update `src/pages/Blog.tsx`
- Add `useTranslation('landing')`.
- Replace "Wedding Tips & Ideas", subtitle, "Read More →", copyright with `t()` calls.
- Use `useBlogPosts()` for post titles/excerpts/reading times.

### 4. Update `src/pages/BlogPost.tsx`
- Add `useTranslation('landing')`.
- Pull title, content blocks, "Back to blog", "Keep reading", "Related tools" labels, CTA button, and footer from translations.

### 5. Update homepage blog section in `src/pages/Landing.tsx`
- If it renders blog cards, switch to `useBlogPosts()` so all 3 cards translate.

### 6. Translate to all 13 languages
- Source: English content from current `blogPosts.ts`.
- Translate titles, excerpts, all body content blocks (headings, paragraphs) into: `de, es, fr, it, nl, ja, ar, vi, zh, tr, el, hi`.
- Each post averages ~15-25 content blocks → significant translation volume but mechanical.
- Arabic gets RTL-friendly punctuation.

## Files to modify
- `src/content/blogPosts.ts` (refactor to hook)
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/pages/Landing.tsx` (if blog cards section present)
- `src/i18n/locales/{en,de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` (add full `blog` namespace)

## Out of scope
- Cover images (visual only)
- Blog post slugs/URLs (stay English for SEO consistency)
- Any other section of the site
