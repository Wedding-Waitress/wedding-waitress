## Goal
Eliminate every purple element from the **Dietary Requirements** page (on-screen A4 preview + both PDFs) and replace with brand brown `#967A59` (RGB `150, 122, 89`) — matching the Individual Table Chart, Floor Plan, and Invitations PDFs. Swap the purple footer logo for the brown one in **both** the preview and PDF.

Scope: Dietary Requirements only. No other page, component, or exporter is touched.

---

## 1. PDF Exporter — `src/lib/dietaryChartPdfExporter.ts`

The root cause: line 202 declares
```ts
const purple = { r: 109, g: 40, b: 217 }; // #967A59  ← misleading comment, RGB is real purple
```
…and that variable is reused for the title (line 289), the divider line under the subtitle (line 315), and every dietary label in the table (line 488). That's why the title, divider, and dietary column all still print purple.

**Fix:** Change those RGB values to brand brown so every reference flips at once.

| Line | Current | New |
|---|---|---|
| 202 | `const purple = { r: 109, g: 40, b: 217 };` | `const brandBrown = { r: 150, g: 122, b: 89 };` |
| 289, 315, 488 | `purple.r, purple.g, purple.b` | `brandBrown.r, brandBrown.g, brandBrown.b` |
| 222, 286, 320, 485 | `// purple …` comments | rename to `// brand brown …` so future readers aren't misled |

After this single rename:
- ✅ "Mahmoud & Linda's Wedding" title → brown
- ✅ Divider line under subtitle → brown
- ✅ All dietary labels (Vegan, Gluten Free, Halal, etc.) in the table → brown

**Footer logo** (line 100):
- `fetch('/wedding-waitress-pdf-footer-logo.png')` → `fetch('/wedding-waitress-logo-brown.png')`

This is the same brown asset already confirmed working in Individual Table Charts and Floor Plan PDFs.

**Already correct (no change needed):**
- "Kitchen Dietary Requirements" subtitle (black, line 296)
- Ceremony/Reception lines (gray, line 302)
- "Total Dietary Guest Requirements" (black, line 325)
- Category summary row + table headers (light gray fill, black text, lines 340–403)
- Page footer text (light gray, line 550)

---

## 2. On-Screen A4 Preview — `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx`

Currently imports:
```ts
import dietaryLogo from '@/assets/wedding-waitress-dietary-logo.png';  // ← purple version
```
…and uses it at line 784 (preview footer) and line 936 (export-only mirror).

**Fix:** Switch the import to the brown public asset and use it via `<img src="/wedding-waitress-logo-brown.png">` instead. Same approach Individual Table Chart now uses.

- Replace the import with a direct string constant: `const dietaryLogo = '/wedding-waitress-logo-brown.png';` (one-line change, both `<img src={dietaryLogo}>` references keep working unchanged — same size, same alignment, same centering classes).

No on-screen text colors need changing — inspecting the preview file shows all on-screen text already uses neutral/brown brand tokens. The only purple element on screen is the footer logo image itself.

---

## 3. What is NOT changing

- No layout, geometry, fonts, sizes, spacing, sort logic, pagination, or table structure
- No other pages, exporters, components, or shared assets
- DOCX exporter (`dietaryChartDocxExporter.ts`) — already inspected, does not contain purple values; out of scope unless purple appears there
- The old purple asset files stay on disk (no delete) — we just stop referencing them from this page

---

## 4. Verification checklist

1. `/dashboard?tab=dietary-chart` → on-screen A4 preview footer shows the **brown** Wedding Waitress logo (centered, sharp, same size).
2. **Download Single Page PDF** → open the file:
   - Title "Mahmoud & Linda's Wedding" = brown
   - Divider line under "Kitchen Dietary Requirements" = brown
   - Every dietary label in the right column (Vegan, Halal, Vendor, etc.) = brown
   - Footer logo = brown
   - Zero purple anywhere
3. **Download All Pages PDF** → repeat the same checks across pages 2 and 3.
4. Visual parity check vs. the Individual Table Chart and Floor Plan PDFs — colors and logo should look identical.

---

## 5. Files to be edited (2 total)

- `src/lib/dietaryChartPdfExporter.ts` — rename `purple` → `brandBrown`, change RGB to `(150, 122, 89)`, update logo fetch path, update misleading comments
- `src/components/Dashboard/QRCode/KitchenDietaryChart.tsx` — swap the `dietaryLogo` import to the brown public asset
