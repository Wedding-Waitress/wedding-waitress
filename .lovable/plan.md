
## Goal
Add 2–4 natural internal links inside the body content of every blog post for SEO — linking to the homepage, the QR code feature page, and other relevant blog posts.

## Heads-up: locked surface
`src/i18n/locales/en/landing.json` and `src/pages/BlogPost.tsx` are LOCKED PUBLIC SURFACE. Your approval here authorizes editing the post body strings only. The existing internal-links sidebar (`post.internalLinks`) stays untouched — this work adds inline links **inside paragraph text**.

## Investigation needed
The current `BlogPost.tsx` renders `section.paragraphs` as plain `<p>{p}</p>` — it does NOT parse HTML or markdown, so raw `<a>` tags would render as visible text. To add inline links without modifying the locked template, I need to confirm the rendering approach.

Two viable paths:

**Option A — Minimal template change (recommended)**
Change one line in `BlogPost.tsx` to render paragraphs via a small inline helper that converts a simple `[text](url)` markdown-style token into a `<Link>` (internal) or `<a>` (external). This is a tiny, surgical edit to the locked file — purely additive rendering logic, no visual or layout change. Then add the inline tokens directly into the existing paragraph strings in `landing.json`.

**Option B — No template change**
Restructure every section's `paragraphs` into a richer shape (array of text/link parts). This requires changing the TypeScript type in `blogPosts.ts` AND every existing post entry — much larger blast radius on locked content.

I recommend **Option A** — smallest, safest change.

## Changes

### 1. `src/pages/BlogPost.tsx` (one surgical edit)
Replace the single line:
```tsx
<p key={j} className="...">{p}</p>
```
with a render that parses `[anchor](path)` tokens:
- `/...` paths → React Router `<Link>` (internal, scroll-to-top on click)
- `http...` → `<a target="_blank" rel="noopener">`
- Link styling: `text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]` (matches existing site link style used on feature pages)

No other JSX, layout, or styling changes. Plain text without tokens renders identically to today.

### 2. `src/i18n/locales/en/landing.json` — inline links per post
Add 2–4 natural inline links inside the existing paragraph strings of all 10 posts. Anchors blend into sentences (no "click here"). Targets per post:

| Post slug | Inline links added |
|---|---|
| `how-to-create-qr-code-seating-chart` | homepage ("wedding seating chart tool"), `/products/qr-code-seating-chart` ("QR code wedding seating chart"), `/blog/how-to-create-a-wedding-seating-chart-step-by-step` |
| `last-minute-wedding-seating-changes` | homepage, `/products/qr-code-seating-chart`, `/blog/common-wedding-seating-chart-mistakes` |
| `qr-code-wedding-seating-chart-australia` | homepage, `/products/qr-code-seating-chart`, `/blog/how-to-create-a-wedding-seating-chart-step-by-step` |
| `digital-vs-printed-seating-charts` | homepage, `/products/qr-code-seating-chart`, `/blog/best-wedding-seating-chart-templates-australia` |
| `wedding-planning-checklist-australia` | homepage, `/products/qr-code-seating-chart`, `/blog/how-to-create-a-wedding-seating-chart-step-by-step` |
| `how-to-organise-wedding-guest-list` | homepage, `/products/guest-list`, `/blog/wedding-seating-chart-etiquette-who-sits-where` |
| `how-to-create-a-wedding-seating-chart-step-by-step` | homepage, `/products/qr-code-seating-chart` ("QR code wedding seating chart"), `/blog/wedding-seating-chart-etiquette-who-sits-where` |
| `wedding-seating-chart-etiquette-who-sits-where` | homepage, `/products/qr-code-seating-chart`, `/blog/common-wedding-seating-chart-mistakes` |
| `best-wedding-seating-chart-templates-australia` | homepage, `/products/qr-code-seating-chart`, `/blog/how-to-create-a-wedding-seating-chart-step-by-step` |
| `common-wedding-seating-chart-mistakes` | homepage ("wedding seating chart tool"), `/products/qr-code-seating-chart` ("QR code wedding seating chart"), `/blog/how-to-create-a-wedding-seating-chart-step-by-step` |

Each post: 3 links placed naturally — one in an early/middle section, two later in the article. Anchor text is woven into existing sentences (e.g. "…using a dedicated [wedding seating chart tool](/) keeps everything in one place…"). No new sentences invented where avoidable; minor rephrasing only when needed for natural flow.

Existing `post.internalLinks` sidebar entries are NOT changed.

## Out of scope
- No design, layout, or color changes
- No edits to `Blog.tsx`, `blogPosts.ts`, other locales, or images
- No changes to existing sidebar related-links block or bottom CTA
- No new posts

## Verification after apply
1. Each blog post shows 3 inline brown underlined links inside body paragraphs.
2. Internal links navigate via React Router (no full page reload) and scroll to top.
3. Plain paragraphs in any post still render identically (no stray brackets/parens visible).
4. No visual diff on `/blog` index, sidebar, or CTA section.
