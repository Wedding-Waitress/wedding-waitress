

## Running Sheet PDF — Five Layout Adjustments

**File:** `src/lib/runningSheetPdfExporter.ts`

### Changes

1. **Body font size 11px → 12px** — Match the header detail lines. Change `font-size:11px` to `font-size:12px` in all three `<td>` cells (lines 144-146) and the notes block (line 134).

2. **Logo height 8mm → 12mm, width scaled proportionally** — Change `FOOTER_LOGO_HEIGHT_MM` from 8 to 12, and `FOOTER_LOGO_WIDTH_MM` from 28 to 42 (maintaining the 3.5:1 aspect ratio).

3. **Remove gap between logo and page number line** — Currently the logo sits at `FOOTER_LOGO_Y_MM = PDF_HEIGHT_MM - FOOTER_ZONE_MM + 4` (271mm) and text at `FOOTER_TEXT_Y_MM = PDF_HEIGHT_MM - 5` (292mm), leaving ~13mm gap. Adjust so logo bottom edge is immediately above the text line. With logo height 12mm and text at 292mm, place logo Y at ~278mm (`FOOTER_TEXT_Y_MM - FOOTER_LOGO_HEIGHT_MM - 2`). This means `FOOTER_LOGO_Y_MM ≈ 278`.

4. **Column widths: TIME 10%, EVENT 80%, WHO 10%** — Update all `width:18%` → `width:10%`, all `width:52%` → `width:80%`, all `width:30%` → `width:10%` in both `<th>` header cells and `<td>` body cells.

5. **No other changes.**

### Technical Detail

All changes are in `generateRunningSheetHTML()` (lines 112-181) and the layout constants (lines 34-39). Six string replacements total for column widths (3 header + 3 body), two constant value changes for logo size, one constant recalculation for logo Y position, and four font-size replacements.

