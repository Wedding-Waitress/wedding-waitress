
## Goal
Fix the Arabic (and other non-English) translations on the DJ-MC Questionnaire product page where the wrong content is showing — currently it displays QR-code copy and leftover English fragments ("Wedding Waitress", "Running Sheet"). Then lock the fixed translation keys against accidental future regression.

## Findings

### Issue — `products.djMc.*` contains wrong / mixed content in non-English locales
From the Arabic screenshot on `/products/dj-mc-questionnaire`:
- Hero `h1` shows "Wedding Waitress QR Code لجميع الضيوف" — this is the QR-Code page heading, not the DJ-MC heading. Same key collision likely affects `lead`, `h[]`, `finalCtaHeading`, `finalCtaText` in Arabic.
- Lead paragraph still mentions "QR Code Wedding Waitress" in Latin script.
- Highlight cards still contain Latin words "Wedding" and "Running Sheet".

Need to verify across all 12 non-English `landing.json` files whether `products.djMc.*` is correct, partially wrong, or copied from the wrong product. I'll audit and fix every locale where any `products.djMc.*` value contains:
- The strings "QR", "QR Code", "Running Sheet", or any leftover Latin words other than the brand "Wedding Waitress" (which gets transliterated for non-Latin scripts as established previously: AR `ويدينغ ويتريس`, ZH `婚礼女侍`, JA `ウェディングウェイトレス`, HI `वेडिंग वेट्रेस`).

English source of truth (from `src/i18n/locales/en/landing.json` → `products.djMc`):
- `h1`: "DJ & MC Questionnaire for Your Wedding"
- `lead`: "Plan your music, announcements, and key moments with ease. Give your DJ or MC everything they need for a smooth and perfect event."
- `primaryCta`: "Start Planning Your Event"
- `h`: 4 [heading, text] pairs about music planning, instructions to DJ/MC, sharing, PDF export.
- `finalCtaHeading` / `finalCtaText` / `finalCtaLabel`

### Lock request
User wants the fixed keys "locked" so future edits don't accidentally regress them. Approach:
1. Create a tracking doc `LOCKED_TRANSLATION_KEYS.md` listing every translation key set that has been signed off, with the date, the affected locales, and a "DO NOT MODIFY without owner approval" warning — same convention already used for Full Seating Chart and Place Cards.
2. Add a short header comment block at the top of each touched non-English `landing.json` is not possible (JSON disallows comments). Instead, the `LOCKED_TRANSLATION_KEYS.md` doc plus a memory entry (`mem://standards/locked-translations`) act as the lock.
3. Save a project memory rule so every future change automatically respects the lock list.

## Plan

1. **Audit** `products.djMc.*` in all 12 non-English `landing.json` files — identify which are wrong (especially AR which clearly has the QR-page content).
2. **Translate** the correct English DJ-MC content into each affected locale, using the same conventions already applied (transliterate "Wedding Waitress" only in non-Latin scripts; localize all other prose; keep "DJ", "MC", "PDF" as common international terms).
3. **Write back** ONLY the `products.djMc.*` subtree in each affected `landing.json`. No other keys touched.
4. **Create `LOCKED_TRANSLATION_KEYS.md`** at project root listing:
   - Blog posts body content (12 locales)
   - All `products.*` subtrees (12 locales)
   - `products.qrSeating.h1` native-script overrides (zh, ar, hi)
   - `products.djMc.*` (12 locales) ← this fix
   - Header/Landing/ProductPageLayout `alwaysSignUp` CTA wiring
   With clear "DO NOT MODIFY without explicit owner approval" warning.
5. **Save memory** `mem://standards/locked-translations` so all future sessions automatically check the lock list before touching translation files.
6. **Update `mem://index.md`** to reference the new memory file.

## Files to modify
- `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` — only `products.djMc.*` subtree (only locales where audit shows incorrect content; Arabic is confirmed wrong).
- `LOCKED_TRANSLATION_KEYS.md` — new file (root).
- `mem://standards/locked-translations` — new memory file.
- `mem://index.md` — add reference line.

## Out of scope
- English file.
- Any other `products.*` page (other product pages were translated in prior approved passes and are now considered locked).
- Any code/layout/component/route changes.
- Other non-DJ-MC translation keys.

## Verification
- Switch to AR → `/products/dj-mc-questionnaire` → hero shows correct DJ-MC heading + lead in Arabic (no "QR Code", no leftover Latin "Wedding"/"Running Sheet" in highlight cards).
- Spot-check ZH, JA, HI, TR, EL on the same page.
- Switch back to EN → unchanged.
- `LOCKED_TRANSLATION_KEYS.md` exists at project root.
