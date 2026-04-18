
## Goal
Translate the full body content (intro + all section headings + paragraphs) of all 6 blog posts into the 12 non-English languages so `BlogPost.tsx` displays everything in the chosen language — not just the title.

## Root cause
When the blog translations were originally added, only `title`, `metaTitle`, `metaDescription`, `excerpt`, and `readingTime` were translated. The `intro` and every `sections[].heading` / `sections[].paragraphs[]` value was copied from English verbatim into all 12 non-English files. So the article header translates, but the article body stays English everywhere.

Verified across `zh`, `tr`, `el`, `ar` — all four show English body content despite translated titles. Same will apply to `de, es, fr, it, nl, ja, vi, hi`.

## Scope (6 posts × full body)

| Slug | Sections | Approx paragraphs |
|---|---|---|
| qr-code-wedding-seating-chart-australia | 7 | ~14 |
| wedding-signage-cost-australia | 4 | ~10 |
| how-to-create-qr-code-seating-chart | 5 | ~12 |
| digital-wedding-seating-chart-accessibility | 4 | ~10 |
| last-minute-wedding-seating-changes | 4 | ~10 |
| why-every-wedding-needs-a-running-sheet | 6 | ~14 |

Total per language: ~30 section headings + ~70 paragraphs + 6 intros ≈ ~106 strings × 12 languages = ~1,272 translated strings.

## Plan

1. **Read English source** from `src/i18n/locales/en/landing.json` for the full `blog.posts.*` tree (intro + sections).
2. **Translate** the body content (intro, every section.heading, every section.paragraphs[]) into all 12 non-English languages: `de, es, fr, it, nl, ja, ar, vi, zh, tr, el, hi`. Arabic gets RTL-friendly punctuation.
3. **Write back** into each `src/i18n/locales/<lang>/landing.json` — replacing only the `intro` and `sections` arrays under each `blog.posts.<slug>`. Keep all other keys and structure untouched.
4. **Preserve** `internalLinks` labels (these come from the static `blogPosts.ts` file and are out of scope per user — focus on body text only as requested).

## Files to modify
- `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` — replace the `intro` and `sections` content under each of the 6 `blog.posts.*` entries.

## Out of scope
- English file (already correct).
- Static `internalLinks` labels in `blogPosts.ts` (separate concern, not body text).
- Any layout/design.
- Any other section of the site.

## Verification
- Switch to ZH, AR, TR, EL → click "Read More" on the QR-seating post on the homepage → confirm intro, all section headings, and all paragraphs render in the chosen language.
- Repeat for the other 5 blog posts.
- Confirm no English fallback remains in body content.
