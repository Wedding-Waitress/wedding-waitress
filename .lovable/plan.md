
Plan: 3 changes to Blog page + add 6th post.

**1. Heading one-line fix** (`src/pages/Blog.tsx`)
- Add `whitespace-nowrap` to the H1 and reduce font sizes slightly so "Wedding Tips & Ideas" stays on one line at all breakpoints. Use `text-3xl sm:text-4xl md:text-5xl lg:text-6xl whitespace-nowrap`.

**2. Replace emojis on bottom 2 cards with real images**
- Generate 2 new images via Nano banana and save to `src/assets/`:
  - `blog-older-guest.jpg` — older guest using phone at elegant wedding
  - `blog-last-minute-changes.jpg` — wedding planner with laptop adjusting plans
- Update `src/content/blogPosts.ts` to add `coverImage` field for the two existing posts:
  - `digital-seating-charts-older-guests` → `blog-older-guest`
  - `last-minute-wedding-seating-changes` → `blog-last-minute-changes`
- Update `BLOG_COVER_IMAGES` map in both `src/pages/Blog.tsx` and `src/pages/Landing.tsx` to import + register the 2 new images.

**3. Add 6th blog post: "Why Every Wedding Needs a Running Sheet"**
- Generate 1 image: `blog-running-sheet.jpg` — clipboard/tablet with wedding timeline schedule.
- Add new entry to `BLOG_POSTS` in `src/content/blogPosts.ts`:
  - slug: `why-every-wedding-needs-a-running-sheet`
  - title, excerpt, readingTime "5 min read", coverImage `blog-running-sheet`
  - Full structured content body matching the section outline (Intro → Problem → Stress → Solution → Share → Flexibility → Final tip → CTA).
- Register image in `BLOG_COVER_IMAGES` maps on both Blog.tsx and Landing.tsx.
- The existing `BlogPost.tsx` page renders any slug from `BLOG_POSTS`, so no routing changes needed. CTA already uses `SignUpModal` (auth-gated) from prior work — preserved.

**Files touched:**
- `src/pages/Blog.tsx` (heading + image map)
- `src/pages/Landing.tsx` (image map only — keeps homepage in sync)
- `src/content/blogPosts.ts` (add coverImage to 2 posts, add 6th post entry with full content)
- `src/assets/blog-older-guest.jpg` (new)
- `src/assets/blog-last-minute-changes.jpg` (new)
- `src/assets/blog-running-sheet.jpg` (new)

No layout, styling, routing, or auth changes elsewhere. CTA on the new post inherits the existing `SignUpModal` gate in `BlogPost.tsx`.
