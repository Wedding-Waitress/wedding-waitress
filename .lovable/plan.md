## Goal
Eliminate every remaining purple element on the **Full Seating Chart** page and its exports (Single Page PDF, All Pages PDF, public-view PDF, DOCX, browser print). Replace with brand brown `#967A59` / RGB `(150, 122, 89)` and use the brown logo `/wedding-waitress-logo-brown.png` everywhere. Scope is Full Seating Chart only.

I inspected every file. The remaining purple is in **6 specific places** — all the other purple references in the codebase are unrelated to this page or already brown.

---

## 1. Top-right gradient subtitle (UI) — `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` line 244

Currently:
```tsx
<span className="text-lg font-normal bg-gradient-to-r from-[#967A59] to-[#9333EA] bg-clip-text text-transparent">
  Full Seating Chart for {selectedEvent.name}
</span>
```
The `to-[#9333EA]` end-stop is purple, which is why the right half of the text reads purple.

**Fix:** Remove the gradient and use solid brand brown:
```tsx
<span className="text-lg font-normal text-[#967A59]">
  Full Seating Chart for {selectedEvent.name}
</span>
```

---

## 2. "Unassigned" purple in A4 preview & print — `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx`

This file has a `🔒 PRODUCTION LOCKED` header. The changes below touch only **colors and one logo path** — no measurements, fonts, layout, spacing, or pagination logic changes. **Requesting explicit approval to edit this locked file for the color/logo fixes only.**

- **Line 249** — screen preview "Unassigned" table label:
  ```ts
  color: isUnassigned ? '#9333ea' : '#000000'
  ```
  → change to `'#967A59'` (so unassigned shows in brand brown instead of purple). Acceptable alternative if you'd prefer neutral: `'#1D1D1F'` (dark grey). I'll use brand brown `#967A59` for visual hierarchy consistency with the rest of the brand.

- **Line 450** — `.print-table-unassigned` CSS class (browser print path):
  ```css
  .print-table-unassigned { color: #9333ea; }
  ```
  → change to `color: #967A59;`

- **Line 695** — print footer logo:
  ```tsx
  <img src="/wedding-waitress-print-footer.png?v=1" alt="Wedding Waitress" />
  ```
  The file `/wedding-waitress-print-footer.png` is the purple logo (verified visually). → change to `/wedding-waitress-logo-brown.png?v=2`.

(Comment on line 229 — "Purple circle checkbox" — is just a stale code comment; the actual stroke/fill is already `#967A59`. I'll update the comment text for clarity but no rendering change.)

---

## 3. Main PDF exporter logo asset — `src/lib/fullSeatingChartPdfExporter.ts` line 2

Currently:
```ts
import weddingWaitressLogo from '@/assets/wedding-waitress-new-logo.png';
```
I rendered this PNG — it is the **purple** Wedding Waitress logo. This is the file embedded as the footer in both "Download Single Page PDF" and "Download All Pages PDF" via `loadLogoAsBase64()`.

**Fix:** Replace the import with a fetch from the brown public asset (mirrors the pattern already in use on the Individual Table Charts and Floor Plan PDFs):
```ts
// remove the import line entirely
// inside loadLogoAsBase64():
const response = await fetch('/wedding-waitress-logo-brown.png');
```

Also update the unassigned-row color inside the PDF:
- **Line 350**: `pdf.setTextColor(147, 51, 234);` → `pdf.setTextColor(150, 122, 89);` (brand brown for "Unassigned" text)
- **Line 360**: `pdf.setDrawColor(!guest.table_no ? 147 : 0, !guest.table_no ? 51 : 0, !guest.table_no ? 234 : 0);` → `pdf.setDrawColor(!guest.table_no ? 150 : 0, !guest.table_no ? 122 : 0, !guest.table_no ? 89 : 0);`

The header title color (line 213), divider line (235), and checkbox circles (290) already use the local `purple` variable which is already correctly set to RGB `(150, 122, 89)` brown — no change needed there. The misleading variable name `purple` will be renamed to `brandBrown` for clarity (purely cosmetic — same RGB).

---

## 4. Alternative exporter still pointing at purple logo — `src/components/Dashboard/FullSeatingChart/FullSeatingChartExporter.tsx` line 339

This file is wired through `index.ts` and may be used by alternative export paths. Currently:
```ts
const logoUrl = '/wedding-waitress-pdf-footer-logo.png';
```
That file in `/public` is the purple logo.

**Fix:** `const logoUrl = '/wedding-waitress-logo-brown.png';`

(Line 166 already uses brown RGB `(150, 122, 89)` — only the misleading `// Darker purple #967A59` comment will be updated.)

---

## 5. DOCX exporter — `src/lib/fullSeatingChartDocxExporter.ts`

Two purple hex values + purple-pointing logo path:

- **Line 102** — `const response = await fetch('/jpeg-2.jpg');` is fine if that file is brown, but to be safe and consistent, change to `fetch('/wedding-waitress-logo-brown.png')` (PNG is supported by docx images).
- **Line 153** — `color: '6D28D9'` (purple hex for event title) → `color: '967A59'`
- **Line 271** — `color: '6D28D9'` (purple hex for guest checkbox glyph) → `color: '967A59'`
- Update the misleading comment on line 143 from "purple #967A59" to "brand brown #967A59".

---

## 6. What is NOT changing

- No layout, geometry, fonts, spacing, sort logic, pagination, A4 dimensions, or row heights
- No edits to other pages, exporters, or shared assets (Dietary, Floor Plan, Individual Table Charts, DJ-MC, Running Sheet, Place Cards, etc. are out of scope for this prompt)
- The old purple asset files stay on disk (no delete) — we just stop referencing them from this page

The user's prompt mentioned applying the global PDF rule to Dietary / Floor Plan / Individual Table Charts as well — those three were already converted to brown in the previous approved prompts. I re-checked them and confirmed no purple remains in their PDF code paths. If anything still shows purple in those exports after a hard refresh, please flag it and I'll address per-file.

---

## 7. Verification checklist

After the edits and a hard refresh:

1. `/dashboard?tab=full-seating-chart` → top-right "Full Seating Chart for …" subtitle is fully **brown** (no purple half).
2. A4 on-screen preview: any guest with no table shows "Unassigned" in **brown** (no purple).
3. Footer logo on the on-screen A4 preview = **brown** Wedding Waitress logo (centered, sharp).
4. **Download Single Page PDF** → open the file:
   - Title "Mahmoud & Linda's Wedding" = brown ✓
   - Divider line = brown ✓
   - Checkbox circles = brown ✓
   - Any "Unassigned" guest rows = brown (not purple) ✓
   - Footer logo = brown ✓
5. **Download All Pages PDF** → same checks across every page.
6. Browser **Print** dialog → preview shows brown logo at footer and brown "Unassigned" labels.
7. (If used) DOCX export → event-name title and checkbox glyphs are brown; embedded logo is brown.
8. Visual parity check vs. the Individual Table Chart, Floor Plan, and Dietary PDFs — colours and logo identical.

---

## 8. Files to be edited (5 total)

1. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx` — drop the purple gradient end-stop on the subtitle
2. `src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx` *(production-locked — needs your approval)* — swap two `#9333ea` → `#967A59` and the print-footer logo path
3. `src/lib/fullSeatingChartPdfExporter.ts` — fetch brown logo, swap unassigned `(147,51,234)` → `(150,122,89)`, rename `purple` → `brandBrown`
4. `src/components/Dashboard/FullSeatingChart/FullSeatingChartExporter.tsx` — swap the purple footer logo path to the brown one
5. `src/lib/fullSeatingChartDocxExporter.ts` — fetch brown logo, swap two `6D28D9` hex values → `967A59`