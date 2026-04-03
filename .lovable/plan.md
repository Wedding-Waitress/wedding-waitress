

## Plan: Align DJ-MC Questionnaire PDF Layout with Running Sheet PDF

### Summary
Update the DJ-MC Questionnaire PDF export to match the Running Sheet PDF's header, footer, and timestamp format. Also update the Running Sheet's timestamp to use AM/PM format.

### Changes

---

**File: `src/lib/runningSheetPdfExporter.ts`**

1. **Change `formatGeneratedTimestamp()` (line 84-87)** to use AM/PM instead of 24-hour time.
   - Current: `03/04/2026 11:21`
   - New: `03/04/2026 11:21 AM`

---

**File: `src/lib/djMCQuestionnairePdfExporter.ts`** — Major overhaul to match running sheet approach

1. **Change logo source** (line 69-83): Import from `@/assets/wedding-waitress-new-logo.png` (same as running sheet) instead of fetching `/wedding-waitress-share-logo.png`.

2. **Change `formatGeneratedTimestamp()` (line 58-66)**: Add AM/PM format (same as running sheet update).

3. **Rewrite `exportEntireQuestionnairePDF` header (lines 414-457)** to match running sheet layout exactly:
   - Large purple event name (22px equivalent → font size 18)
   - "DJ-MC Questionnaire" subtitle below in black (16px equivalent → font size 14)
   - Ceremony line: `Ceremony: [date] | [venue] | [times]` (if ceremony exists)
   - Reception line: `Reception: [date] | [venue] | [times]` (if reception exists)
   - Purple divider line
   - Text sizes matching running sheet (12px body equivalent → font size 10)

4. **Rewrite `exportSectionPDF` header (lines 314-341)** to use the same header layout as the full questionnaire export.

5. **Add proper footer on EVERY page** (not just the last page):
   - Centered Wedding Waitress logo (same dimensions as running sheet: 42mm × 12mm)
   - Left: `Page X of Y`
   - Right: `Generated: DD/MM/YYYY H:MM AM/PM`
   - White rectangle behind footer to prevent content bleeding

6. **Add page counting**: After generating all content, go back and stamp footers on every page with correct `Page X of Y` (currently only stamps the last page).

### What stays the same
- All section table rendering (`drawSectionTable`, column configs, cell values)
- PDF filename format (already fixed previously)
- Section notes rendering

### Technical details
- The running sheet uses html2canvas approach; the DJ-MC exporter uses direct jsPDF drawing. We keep the jsPDF approach for the questionnaire but replicate the same visual header/footer structure.
- Footer constants will match running sheet: `FOOTER_ZONE_MM = 30`, logo at `42mm × 12mm`, page number at `y = 292mm`, font size 7.
- The `addNewPage` function will be updated to not add headers on subsequent pages (the running sheet doesn't repeat headers on page 2+, it just has a top margin).
- After all content is drawn, loop through all pages to stamp the footer with the correct total page count.

