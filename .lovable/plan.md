
## Goal
Localize the "Blog" link in the top header navigation across all 12 non-English languages.

## Findings
- `Header.tsx` renders the Blog link with hardcoded text or with a translation key like `nav.blog` that's missing/untranslated in non-English `landing.json` files.
- All other nav items (Products, Pricing, FAQ, Contact, Sign In, Get Started) are already localizing correctly in the screenshots — only "Blog" stays in English.
- Need to verify whether it's hardcoded or just a missing key, then add the translation in each locale's `landing.json` under `nav.blog`.

## Plan
1. Inspect `src/components/Layout/Header.tsx` to confirm how the Blog link renders.
2. Check `src/i18n/locales/en/landing.json` for `nav.blog` key.
3. If hardcoded → swap to `t('nav.blog')`. If key missing in non-English files → add it.
4. Add `nav.blog` translation in all 12 non-English `landing.json` files:
   - de: Blog · es: Blog · fr: Blog · it: Blog · nl: Blog · tr: Blog
   - ja: ブログ · zh: 博客 · ar: المدونة · hi: ब्लॉग · vi: Blog · el: Ιστολόγιο
5. Add this fix to `LOCKED_TRANSLATION_KEYS.md` per the locking convention.

## Files to modify
- `src/components/Layout/Header.tsx` (only if hardcoded)
- `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` — add/update `nav.blog`
- `LOCKED_TRANSLATION_KEYS.md` — append entry

## Out of scope
- English file (already correct)
- Any other nav item, page, or component

## Verification
- Switch to JA → header shows ブログ
- Switch to EL → header shows Ιστολόγιο
- Switch to AR → header shows المدونة
- Switch back to EN → header shows Blog
