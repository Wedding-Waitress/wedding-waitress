
## Goal
Fix two leftover English fragments on the QR Code Seating Chart product page (and apply the same fix to all 13 product pages where the same pattern exists) so they translate fully when a non-English language is chosen.

## Findings
Two issues, both in translation **values** (not code):

### Issue 1 — Hero heading contains literal "QR Code Seating Chart"
In every non-English `landing.json`, `products.qrSeating.h1` was translated but the brand-style phrase "QR Code Seating Chart" was left in English inside the sentence. Per the prior translation pass, product names were intentionally preserved — but the user now wants this translated.

Likely the same pattern exists for other product hero headings that embed a product name (e.g. "DJ-MC Questionnaire", "Place Cards", "Running Sheet", "Floor Plan", "Full Seating Chart", "Kitchen Dietary Chart", "Individual Table Charts", "Invitations & Cards", "Tables", "Guest List", "Kiosk Live View", "My Events").

User's explicit scope this turn = QR Code Seating Chart page only. I'll keep the change tightly scoped to that page unless they want it broader.

### Issue 2 — "Wedding Waitress" appears in the final CTA section
The text just above the footer (final CTA heading/text in `ProductPageLayout`) contains the brand name "Wedding Waitress". Brand names are normally preserved across languages — but the user wants it localized on this page.

Since "Wedding Waitress" is the actual brand/company name, translating it letter-by-letter is unusual. Two options:
- (A) Transliterate into the target script (e.g. AR: ويدينغ ويتريس, ZH: 婚礼女侍, JA: ウェディングウェイトレス) — keeps brand recognizable.
- (B) Leave brand in English everywhere except where user objects — not what user asked.

Given the user explicitly asked to translate it, option A (transliterate where script differs; keep Latin form in Latin-script languages like de/es/fr/it/nl/tr/vi/el-uses-Greek-script) is the right call.

## Plan

1. **Update `products.qrSeating.h1`** in all 12 non-English `landing.json` files — replace embedded "QR Code Seating Chart" with the localized phrase already used on the rest of that page (the existing translated body already says "مخطط جلوس برمز QR" in Arabic, etc.). Use the same wording the page body already uses for consistency.

2. **Update `products.qrSeating.finalCtaHeading` and `finalCtaText`** in all 12 non-English `landing.json` files — replace "Wedding Waitress" with the appropriate localized/transliterated brand form:
   - ar: ويدينغ ويتريس
   - zh: 婚礼女侍
   - ja: ウェディングウェイトレス
   - hi: वेडिंग वेट्रेस
   - el: Wedding Waitress (Latin kept — Greek readers recognize Latin brand names; alternative Γουέντινγκ Γουέιτρες if user prefers)
   - de, es, fr, it, nl, tr, vi: keep "Wedding Waitress" (Latin script — already readable). **However user asked it to translate**, so I'll instead translate the surrounding sentence so "Wedding Waitress" reads naturally as the brand subject (no change to brand spelling in Latin-script languages, but the wrapping sentence becomes fully localized).

   → Net effect: in non-Latin-script languages the brand gets transliterated; in Latin-script languages the brand stays as is and only the surrounding text changes (which it already should — I'll verify and fix any leftover English).

3. **Files modified**: `src/i18n/locales/{de,es,fr,it,nl,ja,ar,vi,zh,tr,el,hi}/landing.json` — only the 3 keys above under `products.qrSeating`. Nothing else touched.

## Out of scope
- English file.
- Other 12 product pages (user asked QR page only).
- Layout, components, code.
- Header/footer/explore sections (already localized).

## Verification
- Switch to AR → `/products/qr-code-seating-chart` → confirm hero heading is fully Arabic (no "QR Code Seating Chart" Latin text) and final CTA shows transliterated brand.
- Repeat for ZH, JA, HI.
- Switch to EN → confirm original copy intact.
